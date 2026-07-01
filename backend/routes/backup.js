const express = require('express');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const { performBackup } = require('../services/backupWorker');
const { performRestore } = require('../services/restoreWorker');
const { enforceRetentionPolicy } = require('../services/cleanupWorker');
const cryptoService = require('../services/cryptoService');

const prisma = require('../db');
const router = express.Router();

function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// Get backup history
router.get('/', requireAuth, async (req, res) => {
  try {
    const backups = await prisma.backup.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    const settings = await prisma.settings.findUnique({ where: { userId: req.user.id } });
    
    const enrichedBackups = backups.map(b => {
      let s3Url = null;
      if (b.s3Key && settings) {
        if (settings.s3Endpoint) {
          s3Url = `${settings.s3Endpoint}/${settings.s3Bucket}/${b.s3Key}`;
        } else {
          s3Url = `https://${settings.s3Bucket}.s3.${settings.s3Region}.amazonaws.com/${b.s3Key}`;
        }
      }
      
      return {
        ...b,
        driveFileUrl: b.driveFileId ? `https://drive.google.com/file/d/${b.driveFileId}/view` : null,
        s3FileUrl: s3Url
      };
    });

    res.json({ backups: enrichedBackups });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get analytics stats
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const allBackups = await prisma.backup.findMany({
      where: { userId: req.user.id }
    });

    let totalStorageBytes = 0;
    let successCount30d = 0;
    let failedCount30d = 0;
    
    // Initialize last 30 days array
    const dailyActivityMap = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dailyActivityMap[dateStr] = { date: dateStr, success: 0, failed: 0 };
    }

    allBackups.forEach(backup => {
      // Storage calculation (only for 'done' backups)
      if (backup.status === 'done') {
        const destCount = 
          (backup.localBackupPath ? 1 : 0) + 
          (backup.driveFileId ? 1 : 0) + 
          (backup.s3Key ? 1 : 0);
        totalStorageBytes += (backup.fileSizeBytes * destCount);
      }

      // 30 days window checks
      if (backup.createdAt >= thirtyDaysAgo) {
        if (backup.status === 'done') successCount30d++;
        if (backup.status === 'failed') failedCount30d++;
        
        const dateStr = backup.createdAt.toISOString().split('T')[0];
        if (dailyActivityMap[dateStr]) {
          if (backup.status === 'done') dailyActivityMap[dateStr].success++;
          if (backup.status === 'failed') dailyActivityMap[dateStr].failed++;
        }
      }
    });

    const dailyActivity = Object.values(dailyActivityMap);

    res.json({
      totalStorageBytes,
      successCount30d,
      failedCount30d,
      dailyActivity
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trigger a new backup
router.post('/', requireAuth, async (req, res) => {
  try {
    // Basic settings validation
    const settings = await prisma.settings.findUnique({ where: { userId: req.user.id } });
    if (!settings || !settings.pgHost) {
      return res.status(400).json({ error: 'Please configure PostgreSQL settings first.' });
    }

    // Insert pending record
    const backup = await prisma.backup.create({
      data: {
        userId: req.user.id,
        status: 'pending'
      }
    });

    // Run in background
    // We don't await this so the request returns immediately
    performBackup(req.user.id, backup.id)
      .then(() => enforceRetentionPolicy(req.user.id))
      .catch(err => console.error('Backup or cleanup failed:', err));

    res.json({ message: 'Backup started', backupId: backup.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Retrieve decrypted password
router.get('/:id/password', requireAuth, async (req, res) => {
  const backupId = parseInt(req.params.id);

  try {
    const backupSecret = await prisma.backupSecret.findUnique({
      where: { backupId: backupId }
    });

    if (!backupSecret) {
      return res.status(404).json({ error: 'Password not found' });
    }

    // Crucial security check: User can only decrypt their own secrets
    if (backupSecret.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const password = cryptoService.decrypt(
      backupSecret.zipPasswordEnc,
      backupSecret.iv,
      backupSecret.authTag
    );

    res.json({ password });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download local backup file
router.get('/:id/download', requireAuth, async (req, res) => {
  const backupId = parseInt(req.params.id);

  try {
    const backup = await prisma.backup.findUnique({
      where: { id: backupId }
    });

    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    if (backup.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!backup.localBackupPath) {
      return res.status(400).json({ error: 'No local file available for this backup' });
    }

    if (!fs.existsSync(backup.localBackupPath)) {
      return res.status(404).json({ error: 'File no longer exists on disk' });
    }

    res.download(backup.localBackupPath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Restore backup
router.post('/:id/restore', requireAuth, async (req, res) => {
  const backupId = parseInt(req.params.id);
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password is required to restore backups.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    await performRestore(req.user.id, backupId);

    res.json({ message: 'Database restored successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete backup
router.delete('/:id', requireAuth, async (req, res) => {
  const backupId = parseInt(req.params.id);
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password is required to delete backups.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    const backup = await prisma.backup.findUnique({ where: { id: backupId } });
    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }
    if (backup.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Delete local file if it exists
    if (backup.localBackupPath && fs.existsSync(backup.localBackupPath)) {
      fs.unlinkSync(backup.localBackupPath);
    }

    // Delete from database (cascade deletes secrets)
    await prisma.backup.delete({ where: { id: backupId } });

    res.json({ message: 'Backup deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
