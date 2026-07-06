const express = require('express');
const os = require('os');
const prisma = require('../db');

const router = express.Router();

function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

router.get('/health', requireAuth, async (req, res) => {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = ((usedMem / totalMem) * 100).toFixed(1);

    const cpus = os.cpus();
    const loadAvg = os.loadavg(); // Returns an array containing the 1, 5, and 15 minute load averages
    
    // Calculate an approximate CPU usage percentage (very basic for immediate load)
    const cpuUsagePercent = ((loadAvg[0] / cpus.length) * 100).toFixed(1);

    // Check DB status
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
