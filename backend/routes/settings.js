const express = require('express');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const cryptoService = require('../services/cryptoService');
const { reloadScheduleForUser } = require('../services/schedulerService');
const { google } = require('googleapis');
const { Client } = require('pg');

const prisma = require('../db');
const router = express.Router();

function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const settings = await prisma.settings.findUnique({
      where: { userId: req.user.id }
    });
    
    if (!settings) {
      return res.json({});
    }

    // Don't send the decrypted password, just send a flag if it exists
    res.json({
      pgHost: settings.pgHost,
      pgPort: settings.pgPort,
      pgUser: settings.pgUser,
      pgDatabase: settings.pgDatabase,
      appName: settings.appName || '',
      driveFolderId: settings.driveFolderId || '',
      hasPgPassword: !!settings.pgPasswordEnc,
      hasDriveServiceAccount: !!settings.driveServiceAccountEnc, // Deprecated
      hasDriveClientSecret: !!settings.driveClientSecretEnc,
      hasDriveRefreshToken: !!settings.driveRefreshTokenEnc,
      driveClientId: settings.driveClientId || '',
      cronSchedule: settings.cronSchedule || '',
      smtpHost: settings.smtpHost || '',
      smtpPort: settings.smtpPort || '',
      smtpUser: settings.smtpUser || '',
      hasSmtpPass: !!settings.smtpPassEnc,
      smtpTested: !!settings.smtpTested,
      smsApiKey: settings.smsApiKey || '',
      smsSenderId: settings.smsSenderId || '',
      smsApiUrl: settings.smsApiUrl || '',
      smsApiMethod: settings.smsApiMethod || 'GET',
      smsApiHeaders: settings.smsApiHeaders || '',
      smsApiBody: settings.smsApiBody || '',
      smsTested: !!settings.smsTested,
      retentionDays: settings.retentionDays || 0,
      destLocal: settings.destLocal !== false, // default true
      destGoogleDrive: !!settings.destGoogleDrive,
      destS3: !!settings.destS3,
      s3AccessKey: settings.s3AccessKey || '',
      hasS3SecretKey: !!settings.s3SecretKeyEnc,
      s3Region: settings.s3Region || '',
      s3Bucket: settings.s3Bucket || '',
      s3Endpoint: settings.s3Endpoint || ''
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { 
    pgHost, pgPort, pgUser, pgDatabase, pgPassword, 
    appName, driveClientId, driveClientSecret, driveFolderId, cronSchedule,
    smtpHost, smtpPort, smtpUser, smtpPass,
    smsApiKey, smsSenderId, smsApiUrl, smsApiMethod, smsApiHeaders, smsApiBody,
    retentionDays,
    destLocal, destGoogleDrive, destS3,
    s3AccessKey, s3SecretKey, s3Region, s3Bucket, s3Endpoint
  } = req.body;
  const userId = req.user.id;

  try {
    const updateData = {
      pgHost,
      pgPort,
      pgUser,
      pgDatabase,
      appName,
      cronSchedule,
      smtpHost,
      smtpPort,
      smtpUser,
      smsApiKey,
      smsSenderId,
      smsApiUrl,
      smsApiMethod,
      smsApiHeaders,
      smsApiBody,
      retentionDays: retentionDays !== undefined ? parseInt(retentionDays, 10) : 0,
      destLocal: destLocal === true,
      destGoogleDrive: destGoogleDrive === true,
      destS3: destS3 === true,
      s3AccessKey,
      s3Region,
      s3Bucket,
      s3Endpoint
    };
    
    if (driveFolderId !== undefined) {
      updateData.driveFolderId = driveFolderId;
    }
    if (driveClientId !== undefined) {
      updateData.driveClientId = driveClientId;
    }

    if (pgPassword) {
      updateData.pgPasswordEnc = cryptoService.encryptString(pgPassword);
    }
    
    if (driveClientSecret) {
      updateData.driveClientSecretEnc = cryptoService.encryptString(driveClientSecret);
    }
    if (smtpPass) {
      updateData.smtpPassEnc = cryptoService.encryptString(smtpPass);
      updateData.smtpTested = false; // Reset on password change
    }
    if (s3SecretKey) {
      updateData.s3SecretKeyEnc = cryptoService.encryptString(s3SecretKey);
    }

    // Reset tested flags if core fields are modified
    const currentSettings = await prisma.settings.findUnique({ where: { userId: req.user.id } });
    if (currentSettings) {
      if (currentSettings.smtpHost !== smtpHost || currentSettings.smtpUser !== smtpUser) {
        updateData.smtpTested = false;
      }
      if (currentSettings.smsApiKey !== smsApiKey || currentSettings.smsSenderId !== smsSenderId || currentSettings.smsApiUrl !== smsApiUrl || currentSettings.smsApiMethod !== smsApiMethod || currentSettings.smsApiHeaders !== smsApiHeaders || currentSettings.smsApiBody !== smsApiBody) {
        updateData.smsTested = false;
      }
    }

    const settings = await prisma.settings.upsert({
      where: { userId: req.user.id },
      update: updateData,
      create: {
        userId: req.user.id,
        ...updateData
      }
    });

    // Reload the schedule for this user in the background worker
    await reloadScheduleForUser(req.user.id);

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/test-drive', requireAuth, async (req, res) => {
  const userId = req.user.id;

  try {
    const settings = await prisma.settings.findUnique({ where: { userId } });
    if (!settings || !settings.driveClientId || !settings.driveClientSecretEnc || !settings.driveRefreshTokenEnc) {
      return res.status(400).json({ error: 'Google Drive OAuth is not fully configured or authorized.' });
    }

    const clientSecret = cryptoService.decryptString(settings.driveClientSecretEnc);
    const refreshToken = cryptoService.decryptString(settings.driveRefreshTokenEnc);

    const auth = new google.auth.OAuth2(settings.driveClientId, clientSecret);
    auth.setCredentials({ refresh_token: refreshToken });

    const drive = google.drive({ version: 'v3', auth });
    
    let folderId = req.body.driveFolderId;
    if (!folderId) {
       const settings = await prisma.settings.findUnique({ where: { userId } });
       if (settings && settings.driveFolderId) {
         folderId = settings.driveFolderId;
       }
    }

    if (folderId) {
      // Test if folder exists and is accessible
      await drive.files.get({ fileId: folderId, fields: 'id', supportsAllDrives: true });
    } else {
      // Just try to list 1 file to see if authentication works
      await drive.files.list({ pageSize: 1, fields: 'files(id)' });
    }
    
    res.json({ message: 'Connection Verified' });
  } catch (err) {
    res.status(400).json({ error: 'Failed to authenticate with Google Drive or access the folder: ' + err.message });
  }
});

router.post('/test-postgres', requireAuth, async (req, res) => {
  let { pgHost, pgPort, pgUser, pgDatabase, pgPassword } = req.body;
  const userId = req.user.id;

  try {
    const settings = await prisma.settings.findUnique({ where: { userId } });
    
    // Fallback to DB settings if not provided in the request
    pgHost = pgHost || (settings ? settings.pgHost : null);
    pgPort = pgPort || (settings ? settings.pgPort : null);
    pgUser = pgUser || (settings ? settings.pgUser : null);
    pgDatabase = pgDatabase || (settings ? settings.pgDatabase : null);

    if (!pgPassword && settings && settings.pgPasswordEnc) {
      pgPassword = cryptoService.decryptString(settings.pgPasswordEnc);
    }

    if (!pgHost || !pgDatabase) {
      const missing = [];
      if (!pgHost) missing.push('Host');
      if (!pgDatabase) missing.push('Database Name');
      return res.status(400).json({ error: 'Missing PostgreSQL connection details: ' + missing.join(', ') });
    }

    const clientConfig = {
      host: pgHost,
      port: pgPort || 5432,
      database: pgDatabase,
      connectionTimeoutMillis: 5000 // 5 seconds timeout
    };
    
    if (pgUser) clientConfig.user = pgUser;
    if (pgPassword) clientConfig.password = pgPassword;

    const client = new Client(clientConfig);

    await client.connect();

    // Query to get all user table names, row counts, and sizes
    const result = await client.query(`
      SELECT 
        relname AS tablename, 
        n_live_tup AS row_count, 
        pg_size_pretty(pg_total_relation_size(relid)) AS size
      FROM pg_stat_user_tables 
      ORDER BY tablename;
    `);

    await client.end();

    const tables = result.rows.map(row => ({
      name: row.tablename,
      rows: row.row_count,
      size: row.size
    }));
    res.json({ message: 'Connection Verified', tables });
  } catch (err) {
    res.status(400).json({ error: 'Failed to connect to PostgreSQL: ' + err.message });
  }
});

router.post('/test-s3', requireAuth, async (req, res) => {
  try {
    const settings = await prisma.settings.findUnique({ where: { userId: req.user.id } });
    if (!settings || !settings.s3AccessKey || !settings.s3SecretKeyEnc || !settings.s3Bucket) {
      return res.status(400).json({ error: 'Amazon S3 settings are incomplete' });
    }

    const s3Client = new S3Client({
      region: settings.s3Region || 'us-east-1',
      credentials: {
        accessKeyId: settings.s3AccessKey,
        secretAccessKey: cryptoService.decryptString(settings.s3SecretKeyEnc)
      },
      endpoint: settings.s3Endpoint || undefined,
      forcePathStyle: !!settings.s3Endpoint // Path style is often needed for MinIO/R2
    });

    // Test connection by listing max 1 object
    const command = new ListObjectsV2Command({
      Bucket: settings.s3Bucket,
      MaxKeys: 1
    });

    await s3Client.send(command);
    res.json({ message: 'S3 Connection Successful!' });
  } catch (error) {
    console.error('S3 Test Error:', error);
    res.status(500).json({ error: `S3 Error: ${error.message}` });
  }
});

router.post('/test-smtp', requireAuth, async (req, res) => {
  const nodemailer = require('nodemailer');
  const { toEmail, message } = req.body;
  
  try {
    const settings = await prisma.settings.findUnique({ where: { userId: req.user.id } });
    if (!settings || !settings.smtpHost || !settings.smtpUser || !settings.smtpPassEnc) {
      return res.status(400).json({ error: 'SMTP settings are incomplete' });
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
    await transporter.verify();

    if (toEmail && message) {
      await transporter.sendMail({
        from: settings.smtpUser,
        to: toEmail,
        subject: 'PGVault SMTP Test',
        text: message
      });
    }

    await prisma.settings.update({
      where: { userId: req.user.id },
      data: { smtpTested: true }
    });
    res.json({ message: 'SMTP Test Successful!' });
  } catch (error) {
    res.status(500).json({ error: `SMTP Error: ${error.message}` });
  }
});

router.post('/test-sms', requireAuth, async (req, res) => {
  const { toPhone, message } = req.body;
  try {
    const settings = await prisma.settings.findUnique({ where: { userId: req.user.id } });
    if (!settings) {
      return res.status(400).json({ error: 'Settings not found' });
    }

    if (!toPhone || !message) {
      return res.status(400).json({ error: 'Recipient phone and message are required' });
    }

    // Use generic API URL if provided, otherwise fallback to elitbuzz (legacy)
    if (settings.smsApiUrl) {
      const formattedPhone = encodeURIComponent(toPhone);
      const formattedMessage = encodeURIComponent(message);
      
      let url = settings.smsApiUrl.replace(/\{\{phone\}\}/g, formattedPhone).replace(/\{\{msg\}\}/g, formattedMessage);
      const method = (settings.smsApiMethod || 'GET').toUpperCase();

      const fetchOptions = {
        method
      };

      if (settings.smsApiHeaders) {
        try {
          fetchOptions.headers = JSON.parse(settings.smsApiHeaders);
        } catch(e) {
          console.warn('Failed to parse SMS API Headers:', e);
        }
      }

      if (settings.smsApiBody && method !== 'GET') {
        const safeMsg = message.replace(/"/g, '\\"').replace(/\n/g, '\\n');
        fetchOptions.body = settings.smsApiBody.replace(/\{\{phone\}\}/g, toPhone).replace(/\{\{msg\}\}/g, safeMsg);
        if (!fetchOptions.headers) fetchOptions.headers = {};
        if (!fetchOptions.headers['Content-Type']) fetchOptions.headers['Content-Type'] = 'application/json';
      }

      const smsRes = await fetch(url, fetchOptions);
      if (!smsRes.ok) throw new Error(`SMS API failed with status ${smsRes.status}`);
      const responseText = await smsRes.text();
      // We don't strictly validate response payload here because every provider is different.
      // If it returned a 2xx status code, we consider it a success.
    } else if (settings.smsApiKey && settings.smsSenderId) {
      // Legacy Elitbuzz logic
      const apiKey = settings.smsApiKey;
      const senderId = settings.smsSenderId;
      const msg = encodeURIComponent(message);
      const url = `https://elitbuzz-me.com/sms/smsapi?api_key=${apiKey}&type=text&contacts=${toPhone}&senderid=${senderId}&msg=${msg}`;
      
      const smsRes = await fetch(url);
      const responseText = await smsRes.text();
      if (!smsRes.ok) throw new Error(`SMS API failed with status ${smsRes.status}`);
      
      if (responseText.trim() === '1003') {
        throw new Error('SMS API returned error 1003 (Invalid API Key, Sender ID, or Insufficient Balance)');
      } else if (responseText.trim().length < 10 && !responseText.includes('Success') && isNaN(Number(responseText)) === false && Number(responseText) >= 1000) {
        throw new Error(`SMS API returned error code: ${responseText}`);
      }
    } else {
      return res.status(400).json({ error: 'SMS API configuration is incomplete. Please provide an API Endpoint URL.' });
    }

    await prisma.settings.update({
      where: { userId: req.user.id },
      data: { smsTested: true }
    });

    res.json({ message: 'SMS Test Message Sent Successfully!' });
  } catch (error) {
    res.status(500).json({ error: `SMS Error: ${error.message}` });
  }
});

module.exports = router;
