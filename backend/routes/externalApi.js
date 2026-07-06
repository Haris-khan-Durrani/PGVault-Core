const express = require('express');
const router = express.Router();
const prisma = require('../db');
const cryptoService = require('../services/cryptoService');
const { performBackup } = require('../services/backupWorker');
const { enforceRetentionPolicy } = require('../services/cleanupWorker');

// Custom API Authentication Middleware
async function authenticateApiKey(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const apiToken = await prisma.apiToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!apiToken) {
      return res.status(401).json({ error: 'Invalid API Key' });
    }

    // Update lastUsedAt asynchronously
    prisma.apiToken.update({
      where: { id: apiToken.id },
      data: { lastUsedAt: new Date() }
    }).catch(err => console.error('Failed to update lastUsedAt:', err));

    req.user = apiToken.user;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// Protect all external API routes
router.use(authenticateApiKey);

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: API Key
 */

/**
 * @swagger
 * /api/v1/backups:
 *   get:
 *     summary: List all backups
 *     tags: [Backups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of recent backups
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get('/backups', async (req, res) => {
  try {
    const backups = await prisma.backup.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50
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

    res.json(enrichedBackups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/v1/backups/trigger:
 *   post:
 *     summary: Trigger a manual backup
 *     tags: [Backups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       202:
 *         description: Backup triggered successfully
 */
router.post('/backups/trigger', async (req, res) => {
  try {
    const backup = await prisma.backup.create({
      data: {
        userId: req.user.id,
        status: 'pending'
      }
    });

    // Start asynchronously
    performBackup(req.user.id, backup.id)
      .then(() => enforceRetentionPolicy(req.user.id))
      .catch(err => console.error('API Backup or cleanup failed:', err));

    res.status(202).json({ message: 'Backup triggered successfully', backupId: backup.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/v1/backups/{id}/password:
 *   get:
 *     summary: Retrieve decrypted ZIP password for a backup
 *     tags: [Backups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Zip password retrieved successfully
 */
router.get('/backups/:id/password', async (req, res) => {
  try {
    const backupId = parseInt(req.params.id);
    const backup = await prisma.backup.findUnique({
      where: { id: backupId },
      include: { backupSecret: true }
    });

    if (!backup || backup.userId !== req.user.id) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    if (!backup.backupSecret) {
      return res.status(404).json({ error: 'Password not found for this backup' });
    }

    const { zipPasswordEnc, iv, authTag } = backup.backupSecret;
    const decryptedPassword = cryptoService.decrypt(zipPasswordEnc, iv, authTag);

    res.json({ password: decryptedPassword });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/v1/backups/{id}/restore:
 *   post:
 *     summary: Restore database from a backup
 *     tags: [Backups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       202:
 *         description: Restore process started
 */
router.post('/backups/:id/restore', async (req, res) => {
  try {
    const backupId = parseInt(req.params.id);
    
    // Using existing restoreWorker logic (async trigger)
    const { restoreBackup } = require('../services/restoreWorker');
    
    // We don't require account password here since API key acts as auth, 
    // but we log it.
    console.log(`API Key authorized restore for backup ${backupId} by user ${req.user.id}`);
    
    restoreBackup(req.user.id, backupId).catch(e => console.error('API Restore failed:', e));

    res.status(202).json({ message: 'Restore process triggered' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/v1/backups/{id}:
 *   delete:
 *     summary: Delete a backup
 *     tags: [Backups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Backup deleted
 */
router.delete('/backups/:id', async (req, res) => {
  try {
    const backupId = parseInt(req.params.id);
    const backup = await prisma.backup.findUnique({ where: { id: backupId } });

    if (!backup || backup.userId !== req.user.id) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    const fs = require('fs');
    if (backup.localBackupPath && fs.existsSync(backup.localBackupPath)) {
      fs.unlinkSync(backup.localBackupPath);
    }

    await prisma.backup.delete({ where: { id: backupId } });
    res.json({ success: true, message: 'Backup deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/v1/settings:
 *   get:
 *     summary: Retrieve backup settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current settings (sensitive info redacted)
 */
router.get('/settings', async (req, res) => {
  try {
    const settings = await prisma.settings.findUnique({ where: { userId: req.user.id } });
    if (!settings) return res.json({});
    
    // Redact sensitive info
    const safeSettings = { ...settings };
    delete safeSettings.pgPasswordEnc;
    delete safeSettings.driveClientSecretEnc;
    delete safeSettings.driveRefreshTokenEnc;
    delete safeSettings.s3SecretKeyEnc;
    delete safeSettings.smtpPassEnc;

    res.json(safeSettings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/v1/system/health:
 *   get:
 *     summary: Retrieve detailed server and database health statistics
 *     tags: [System]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System health statistics
 */
router.get('/system/health', async (req, res) => {
  try {
    const os = require('os');
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = ((usedMem / totalMem) * 100).toFixed(1);

    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    const cpuUsagePercent = ((loadAvg[0] / cpus.length) * 100).toFixed(1);

    let dbStatus = 'healthy';
    let dbLatency = 0;
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - start;
    } catch (e) {
      dbStatus = 'unhealthy';
    }

    res.json({
      status: 'online',
      system: {
        uptimeSeconds: Math.floor(os.uptime()),
        platform: os.platform(),
        release: os.release(),
        cpuCores: cpus.length,
        cpuModel: cpus[0].model,
        cpuUsagePercent: parseFloat(cpuUsagePercent),
        memory: {
          totalBytes: totalMem,
          freeBytes: freeMem,
          usedBytes: usedMem,
          usagePercent: parseFloat(memUsagePercent)
        }
      },
      database: {
        status: dbStatus,
        latencyMs: dbLatency
      },
      app: {
        uptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
