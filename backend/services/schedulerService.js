const cron = require('node-cron');
const { performBackup } = require('./backupWorker');
const { enforceRetentionPolicy } = require('./cleanupWorker');

const prisma = require('../db');

// Keep track of active jobs so we can stop/restart them
const activeJobs = new Map();

async function startScheduler() {
  console.log('Starting scheduler service...');
  await reloadAllSchedules();
}

async function reloadAllSchedules() {
  // Stop existing
  for (const job of activeJobs.values()) {
    job.stop();
  }
  activeJobs.clear();

  try {
    const settingsList = await prisma.settings.findMany({
      where: {
        cronSchedule: { not: null },
        pgHost: { not: null },
        pgPasswordEnc: { not: null },
        driveServiceAccountEnc: { not: null }
      }
    });

    for (const settings of settingsList) {
      if (cron.validate(settings.cronSchedule)) {
        const job = cron.schedule(settings.cronSchedule, async () => {
          console.log(`Running scheduled backup for user ${settings.userId}`);
          try {
            // Create pending backup record
            const backup = await prisma.backup.create({
              data: {
                userId: settings.userId,
                status: 'pending'
              }
            });
            // Execute backup
            await performBackup(settings.userId, backup.id);
            // Run cleanup after backup finishes
            await enforceRetentionPolicy(settings.userId);
          } catch (err) {
            console.error(`Scheduled backup failed for user ${settings.userId}:`, err);
          }
        });
        
        activeJobs.set(settings.userId, job);
        console.log(`Loaded schedule for user ${settings.userId}: ${settings.cronSchedule}`);
      }
    }
  } catch (error) {
    console.error('Failed to load schedules:', error);
  }
}

// Function to call whenever a user updates their settings
async function reloadScheduleForUser(userId) {
  if (activeJobs.has(userId)) {
    activeJobs.get(userId).stop();
    activeJobs.delete(userId);
  }

  const settings = await prisma.settings.findUnique({ where: { userId } });
  
  if (
    settings && 
    settings.cronSchedule && 
    settings.pgHost && 
    settings.pgPasswordEnc && 
    settings.driveRefreshTokenEnc && 
    cron.validate(settings.cronSchedule)
  ) {
    const job = cron.schedule(settings.cronSchedule, async () => {
      console.log(`Running scheduled backup for user ${userId}`);
      try {
        const backup = await prisma.backup.create({
          data: { userId, status: 'pending' }
        });
        await performBackup(userId, backup.id);
        await enforceRetentionPolicy(userId);
      } catch (err) {
        console.error(`Scheduled backup failed for user ${userId}:`, err);
      }
    });
    
    activeJobs.set(userId, job);
    console.log(`Reloaded schedule for user ${userId}: ${settings.cronSchedule}`);
  }
}

module.exports = {
  startScheduler,
  reloadScheduleForUser
};
