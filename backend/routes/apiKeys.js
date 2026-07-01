const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const prisma = require('../db');

// Middleware to ensure user is logged in
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// Get all API keys for the current user
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const tokens = await prisma.apiToken.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    
    // Return only the last 4 chars for security
    const sanitizedTokens = tokens.map(t => ({
      id: t.id,
      name: t.name,
      createdAt: t.createdAt,
      lastUsedAt: t.lastUsedAt,
      last4: t.token.slice(-4)
    }));
    
    res.json(sanitizedTokens);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate a new API key
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Key name is required' });
    }

    // Generate a secure token: prefix + 32 random bytes hex
    const rawToken = 'pgv_' + crypto.randomBytes(32).toString('hex');

    const newToken = await prisma.apiToken.create({
      data: {
        userId: req.user.id,
        name: name,
        token: rawToken
      }
    });

    // Return the full token THIS ONE TIME ONLY
    res.json({
      id: newToken.id,
      name: newToken.name,
      token: rawToken, // User must save this!
      createdAt: newToken.createdAt
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Revoke (delete) an API key
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // Ensure the token belongs to the user
    const token = await prisma.apiToken.findUnique({ where: { id } });
    if (!token || token.userId !== req.user.id) {
      return res.status(404).json({ error: 'Token not found' });
    }

    await prisma.apiToken.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
