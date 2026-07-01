const express = require('express');
const prisma = require('../db');
const router = express.Router();

function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// Get user profile
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { 
        username: true, 
        email: true, 
        phone: true, 
        twoFactorMethod: true,
        settings: {
          select: { smtpTested: true, smsTested: true }
        }
      }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({
      username: user.username,
      email: user.email,
      phone: user.phone,
      twoFactorMethod: user.twoFactorMethod,
      smtpTested: user.settings?.smtpTested || false,
      smsTested: user.settings?.smsTested || false
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.put('/', requireAuth, async (req, res) => {
  const { username, email, phone, twoFactorMethod } = req.body;
  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { 
        username,
        email, 
        phone, 
        twoFactorMethod 
      },
      select: { username: true, email: true, phone: true, twoFactorMethod: true }
    });
    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
      return res.status(400).json({ error: 'Username is already taken' });
    }
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return res.status(400).json({ error: 'Email is already taken' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update password
router.put('/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    const password_hash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { password_hash }
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
