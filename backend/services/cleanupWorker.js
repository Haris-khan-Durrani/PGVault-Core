const fs = require('fs');
const { google } = require('googleapis');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const prisma = require('../db');
const cryptoService = require('./cryptoService');

async function enforceRetentionPolicy(userId) {
  try {
    const settings = await prisma.settings.findUnique({ where: { userId } });
    if (!settings || !settings.retentionDays || settings.retentionDays <= 0) {
      return; // 0 means keep forever, or no settings
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - settings.retentionDays);

    // Find backups older than cutoff date that are completed/failed
    const expiredBackups = await prisma.backup.findMany({
      where: {
        userId: userId,
        createdAt: { lt: cutoffDate },
      }
    });

    if (expiredBackups.length === 0) {
      return; // Nothing to clean up
    }

    console.log(`[Retention Policy] Found ${expiredBackups.length} expired backups for user ${userId} to delete.`);

    for (const backup of expiredBackups) {
      // 1. Delete Local File
      if (backup.localBackupPath && fs.existsSync(backup.localBackupPath)) {
        try {
          fs.unlinkSync(backup.localBackupPath);
          console.log(`[Cleanup] Deleted local file: ${backup.localBackupPath}`);
        } catch (err) {
          console.error(`[Cleanup] Failed to delete local file ${backup.localBackupPath}:`, err.message);
        }
      }

      // 2. Delete Google Drive File
      if (backup.driveFileId && settings.driveClientId && settings.driveClientSecretEnc && settings.driveRefreshTokenEnc) {
        try {
          const clientSecret = cryptoService.decryptString(settings.driveClientSecretEnc);
          const refreshToken = cryptoService.decryptString(settings.driveRefreshTokenEnc);

          const auth = new google.auth.OAuth2(settings.driveClientId, clientSecret);
          auth.setCredentials({ refresh_token: refreshToken });

          const drive = google.drive({ version: 'v3', auth });
          await drive.files.delete({ fileId: backup.driveFileId });
          console.log(`[Cleanup] Deleted Drive file: ${backup.driveFileId}`);
        } catch (err) {
          console.error(`[Cleanup] Failed to delete Drive file ${backup.driveFileId}:`, err.message);
        }
      }

      // 3. Delete S3 Object
      if (backup.s3Key && settings.s3AccessKey && settings.s3SecretKeyEnc && settings.s3Bucket) {
        try {
          const s3Client = new S3Client({
            region: settings.s3Region || 'us-east-1',
            credentials: {
              accessKeyId: settings.s3AccessKey,
              secretAccessKey: cryptoService.decryptString(settings.s3SecretKeyEnc)
            },
            endpoint: settings.s3Endpoint || undefined,
            forcePathStyle: !!settings.s3Endpoint
          });

          const command = new DeleteObjectCommand({
            Bucket: settings.s3Bucket,
            Key: backup.s3Key
          });

          await s3Client.send(command);
          console.log(`[Cleanup] Deleted S3 object: ${backup.s3Key}`);
        } catch (err) {
          console.error(`[Cleanup] Failed to delete S3 object ${backup.s3Key}:`, err.message);
        }
      }

      // 4. Delete Database Record (Cascade deletes BackupSecret)
      try {
        await prisma.backup.delete({ where: { id: backup.id } });
        console.log(`[Cleanup] Deleted database record for backup ${backup.id}`);
      } catch (err) {
        console.error(`[Cleanup] Failed to delete db record ${backup.id}:`, err.message);
      }
    }
  } catch (error) {
    console.error(`[Retention Policy] Error running cleanup for user ${userId}:`, error);
  }
}

module.exports = {
  enforceRetentionPolicy
};
