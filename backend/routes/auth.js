const express = require('express');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const cryptoService = require('../services/cryptoService');
const prisma = require('../db');
const router = express.Router();

function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// Ensure the redirect URI matches exactly what's registered in Google Cloud Console
const getRedirectUri = (req) => {
  // Use frontend origin if it's sent, else fallback
  const origin = req.headers.origin || 'http://localhost:4005';
  return `${origin}/dashboard/settings/google-callback`; 
};

router.post('/register', async (req, res) => {
  const { username, email, phone, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email and password are required.' });
  }

  try {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }]
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Username or email already exists.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        email,
        phone: phone || null,
        password_hash,
        settings: {
          create: {} // Create an empty settings row for the user
        }
      }
    });

    req.login(user, (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Registration successful', user: { id: user.id, username: user.username } });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', (req, res, next) => {
  passport.authenticate('local', async (err, user, info) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: info.message || 'Invalid username or password' });

    // Fetch fresh user data to get 2FA method
    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, include: { settings: true } });

    if (dbUser.twoFactorMethod && dbUser.twoFactorMethod !== 'none') {
      // Check for 48 hour grace period
      if (dbUser.otpVerifiedAt) {
        const hoursSinceVerified = (Date.now() - new Date(dbUser.otpVerifiedAt).getTime()) / (1000 * 60 * 60);
        if (hoursSinceVerified < 48) {
          return req.logIn(dbUser, (err) => {
            if (err) return res.status(500).json({ error: err.message });
            return res.json({ message: 'Logged in successfully (2FA bypassed)', user: { id: req.user.id, username: req.user.username } });
          });
        }
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      await prisma.user.update({
        where: { id: dbUser.id },
        data: { currentOtp: otp, otpExpiresAt: expiresAt }
      });

      const settings = dbUser.settings || {};

      try {
        if (dbUser.twoFactorMethod === 'email') {
          if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPassEnc) {
            throw new Error('SMTP settings are not configured');
          }
          const transporter = nodemailer.createTransport({
            host: settings.smtpHost,
            port: parseInt(settings.smtpPort) || 587,
            secure: parseInt(settings.smtpPort) === 465,
            auth: {
              user: settings.smtpUser,
              pass: cryptoService.decryptString(settings.smtpPassEnc)
            }
          });
          await transporter.sendMail({
            from: settings.smtpUser,
            to: dbUser.email,
            subject: 'Your PGVault Login Code',
            text: `Your login code is: ${otp}`
          });
        } else if (dbUser.twoFactorMethod === 'sms') {
          if (!dbUser.phone) throw new Error('User phone number not configured');
          if (settings.smsApiUrl) {
            const formattedPhone = encodeURIComponent(dbUser.phone);
            const formattedMessage = encodeURIComponent(`Your PGVault login code is: ${otp}`);
            let url = settings.smsApiUrl.replace(/\{\{phone\}\}/g, formattedPhone).replace(/\{\{msg\}\}/g, formattedMessage);
            const method = (settings.smsApiMethod || 'GET').toUpperCase();
            const fetchOptions = { method };

            if (settings.smsApiHeaders) {
              try { fetchOptions.headers = JSON.parse(settings.smsApiHeaders); } catch(e) { console.warn('Failed to parse SMS API Headers:', e); }
            }
            if (settings.smsApiBody && method !== 'GET') {
              const safeMsg = `Your PGVault login code is: ${otp}`.replace(/"/g, '\\"').replace(/\n/g, '\\n');
              fetchOptions.body = settings.smsApiBody.replace(/\{\{phone\}\}/g, dbUser.phone).replace(/\{\{msg\}\}/g, safeMsg);
              if (!fetchOptions.headers) fetchOptions.headers = {};
              if (!fetchOptions.headers['Content-Type']) fetchOptions.headers['Content-Type'] = 'application/json';
            }

            const smsRes = await fetch(url, fetchOptions);
            if (!smsRes.ok) throw new Error(`SMS API failed with status ${smsRes.status}`);
            const responseText = await smsRes.text();
          } else if (settings.smsApiKey && settings.smsSenderId) {
            const apiKey = settings.smsApiKey;
            const senderId = settings.smsSenderId;
            const msg = encodeURIComponent(`Your PGVault login code is: ${otp}`);
            const url = `https://elitbuzz-me.com/sms/smsapi?api_key=${apiKey}&type=text&contacts=${dbUser.phone}&senderid=${senderId}&msg=${msg}`;
            
            const smsRes = await fetch(url);
            const responseText = await smsRes.text();
            if (!smsRes.ok) throw new Error(`SMS API failed with status ${smsRes.status}`);
            
            if (responseText.trim() === '1003') {
              throw new Error('SMS API returned error 1003 (Invalid API Key, Sender ID, or Insufficient Balance)');
            } else if (responseText.trim().length < 10 && !responseText.includes('Success') && isNaN(Number(responseText)) === false && Number(responseText) >= 1000) {
               throw new Error(`SMS API returned error code: ${responseText}`);
            }
          } else {
            throw new Error('SMS API configuration is incomplete.');
          }
        }
      } catch (err) {
        console.error('Failed to send 2FA OTP:', err);
        return res.status(500).json({ error: `Failed to send OTP via ${dbUser.twoFactorMethod}: ${err.message}` });
      }

      return res.json({ 
        require2fa: true, 
        method: dbUser.twoFactorMethod, 
        userId: dbUser.id,
        message: `OTP sent via ${dbUser.twoFactorMethod}`
      });
    }

    req.logIn(dbUser, (err) => {
      if (err) return res.status(500).json({ error: err.message });
      return res.json({ message: 'Logged in successfully', user: { id: req.user.id, username: req.user.username } });
    });
  })(req, res, next);
});

router.post('/verify-otp', async (req, res) => {
  const { userId, otp } = req.body;
  if (!userId || !otp) return res.status(400).json({ error: 'User ID and OTP are required' });

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.currentOtp !== otp) {
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    if (!user.otpExpiresAt || new Date() > user.otpExpiresAt) {
      return res.status(401).json({ error: 'OTP has expired' });
    }

    // Clear OTP and record verified time
    await prisma.user.update({
      where: { id: userId },
      data: { currentOtp: null, otpExpiresAt: null, otpVerifiedAt: new Date() }
    });

    req.logIn(user, (err) => {
      if (err) return res.status(500).json({ error: err.message });
      return res.json({ message: 'Logged in successfully', user: { id: user.id, username: user.username } });
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/magic-login', async (req, res) => {
  const { identifier } = req.body;
  if (!identifier) return res.status(400).json({ error: 'Email or phone is required' });

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { phone: identifier }]
      },
      include: { settings: true }
    });

    if (!user) {
      return res.json({ exists: false });
    }

    // Check for 48 hour grace period
    if (user.otpVerifiedAt) {
      const hoursSinceVerified = (Date.now() - new Date(user.otpVerifiedAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceVerified < 48) {
        return req.logIn(user, (err) => {
          if (err) return res.status(500).json({ error: err.message });
          return res.json({ exists: true, loggedIn: true, message: 'Logged in successfully (OTP bypassed)', user: { id: user.id, username: user.username } });
        });
      }
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: { currentOtp: otp, otpExpiresAt: expiresAt }
    });

    const settings = user.settings || {};
    let methodUsed = 'none';

    // Determine how to send the OTP (prefer SMS if it's a number, else Email)
    const isPhone = /^\d+$/.test(identifier.replace(/\+/g, ''));
    
    if (isPhone && user.phone) {
      // Send SMS
      methodUsed = 'sms';
      if (settings.smsApiUrl) {
        const formattedPhone = encodeURIComponent(user.phone);
        const formattedMessage = encodeURIComponent(`Your PGVault magic login code is: ${otp}`);
        let url = settings.smsApiUrl.replace(/\{\{phone\}\}/g, formattedPhone).replace(/\{\{msg\}\}/g, formattedMessage);
        const method = (settings.smsApiMethod || 'GET').toUpperCase();
        const fetchOptions = { method };

        if (settings.smsApiHeaders) {
          try { fetchOptions.headers = JSON.parse(settings.smsApiHeaders); } catch(e) { console.warn('Failed to parse SMS API Headers:', e); }
        }
        if (settings.smsApiBody && method !== 'GET') {
          const safeMsg = `Your PGVault magic login code is: ${otp}`.replace(/"/g, '\\"').replace(/\n/g, '\\n');
          fetchOptions.body = settings.smsApiBody.replace(/\{\{phone\}\}/g, user.phone).replace(/\{\{msg\}\}/g, safeMsg);
          if (!fetchOptions.headers) fetchOptions.headers = {};
          if (!fetchOptions.headers['Content-Type']) fetchOptions.headers['Content-Type'] = 'application/json';
        }

        const smsRes = await fetch(url, fetchOptions);
        if (!smsRes.ok) throw new Error(`SMS API failed with status ${smsRes.status}`);
        const responseText = await smsRes.text();
      } else if (settings.smsApiKey && settings.smsSenderId) {
        const apiKey = settings.smsApiKey;
        const senderId = settings.smsSenderId;
        const msg = encodeURIComponent(`Your PGVault magic login code is: ${otp}`);
        const url = `https://elitbuzz-me.com/sms/smsapi?api_key=${apiKey}&type=text&contacts=${user.phone}&senderid=${senderId}&msg=${msg}`;
        
        const smsRes = await fetch(url);
        const responseText = await smsRes.text();
        if (!smsRes.ok) throw new Error(`SMS API failed with status ${smsRes.status}`);
        
        if (responseText.trim() === '1003') {
          throw new Error('SMS API returned error 1003 (Invalid API Key, Sender ID, or Insufficient Balance)');
        } else if (responseText.trim().length < 10 && !responseText.includes('Success') && isNaN(Number(responseText)) === false && Number(responseText) >= 1000) {
           throw new Error(`SMS API returned error code: ${responseText}`);
        }
      } else {
        throw new Error('SMS API configuration is incomplete.');
      }
    } else if (user.email) {
      // Send Email
      methodUsed = 'email';
      if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPassEnc) {
        throw new Error('SMTP settings are not configured to send Magic Login emails.');
      }
      const transporter = nodemailer.createTransport({
        host: settings.smtpHost,
        port: parseInt(settings.smtpPort) || 587,
        secure: parseInt(settings.smtpPort) === 465,
        auth: {
          user: settings.smtpUser,
          pass: cryptoService.decryptString(settings.smtpPassEnc)
        }
      });
      await transporter.sendMail({
        from: settings.smtpUser,
        to: user.email,
        subject: 'Your PGVault Magic Login Code',
        text: `Your login code is: ${otp}`
      });
    }

    return res.json({ 
      exists: true, 
      require2fa: true,
      method: methodUsed, 
      userId: user.id,
      message: `OTP sent via ${methodUsed}`
    });

  } catch (err) {
    console.error('Magic login error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: { id: req.user.id, username: req.user.username, email: req.user.email } });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Logged out successfully' });
  });
});

router.get('/google', requireAuth, async (req, res) => {
  try {
    const settings = await prisma.settings.findUnique({ where: { userId: req.user.id } });
    if (!settings || !settings.driveClientId || !settings.driveClientSecretEnc) {
      return res.status(400).json({ error: 'Google Drive Client ID and Secret are not configured.' });
    }

    const clientSecret = cryptoService.decryptString(settings.driveClientSecretEnc);
    const oauth2Client = new google.auth.OAuth2(
      settings.driveClientId,
      clientSecret,
      getRedirectUri(req)
    );

    const scopes = ['https://www.googleapis.com/auth/drive.file'];
    
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent' // Force to get refresh token
    });

    res.json({ url });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate auth URL: ' + error.message });
  }
});

router.post('/google/callback', requireAuth, async (req, res) => {
  const { code, redirectUri } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  try {
    const settings = await prisma.settings.findUnique({ where: { userId: req.user.id } });
    if (!settings || !settings.driveClientId || !settings.driveClientSecretEnc) {
      return res.status(400).json({ error: 'Client configuration missing.' });
    }

    const clientSecret = cryptoService.decryptString(settings.driveClientSecretEnc);
    
    const oauth2Client = new google.auth.OAuth2(
      settings.driveClientId,
      clientSecret,
      redirectUri || getRedirectUri(req) // use the exact redirectUri that was used to initiate the request
    );

    const { tokens } = await oauth2Client.getToken(code);
    
    if (tokens.refresh_token) {
      await prisma.settings.update({
        where: { userId: req.user.id },
        data: {
          driveRefreshTokenEnc: cryptoService.encryptString(tokens.refresh_token)
        }
      });
      res.json({ message: 'Authentication successful. Refresh token saved.' });
    } else {
      if (settings.driveRefreshTokenEnc) {
        res.json({ message: 'Authentication successful. Existing refresh token kept.' });
      } else {
         res.status(400).json({ error: 'Google did not provide a refresh token. Please go to your Google Account security settings, revoke access for this app, and try again.' });
      }
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to exchange code for tokens: ' + error.message });
  }
});

module.exports = router;
