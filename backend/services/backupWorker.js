const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const archiver = require('archiver');
archiver.registerFormat('zip-encrypted', require('archiver-zip-encrypted'));
const { google } = require('googleapis');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const cryptoService = require('./cryptoService');

const prisma = require('../db');

async function performBackup(userId, backupId) {
  let tempSqlPath = '';
  let tempZipPath = '';
  let zipPassword = cryptoService.generateSecurePassword();
  
  try {
    // 1. Fetch user settings
    const settings = await prisma.settings.findUnique({ where: { userId } });
    if (!settings || !settings.pgHost) {
      throw new Error('PostgreSQL settings missing.');
    }

    const pgPassword = settings.pgPasswordEnc ? cryptoService.decryptString(settings.pgPasswordEnc) : '';

    // 2. Setup temp paths
    tempSqlPath = path.join('/tmp', `backup_${backupId}.sql`);
    tempZipPath = path.join('/tmp', `backup_${backupId}.zip`);

    // 3. Run pg_dump
    await new Promise((resolve, reject) => {
      const dumpArgs = [
        '-h', settings.pgHost,
        '-F', 'c', // custom format
        '-f', tempSqlPath
      ];
      
      if (settings.pgPort) {
        dumpArgs.push('-p', settings.pgPort);
      } else {
        dumpArgs.push('-p', '5432');
      }
      
      if (settings.pgUser) {
        dumpArgs.push('-U', settings.pgUser);
      }
      
      dumpArgs.push(settings.pgDatabase);

      const pgDump = spawn('pg_dump', dumpArgs, {
        env: { ...process.env, PGPASSWORD: pgPassword },
        stdio: ['ignore', 'ignore', 'pipe'] // Prevent hanging on stdin prompt
      });

      let errorOutput = '';
      if (pgDump.stderr) {
        pgDump.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });
      }

      pgDump.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`pg_dump failed with code ${code}. Error: ${errorOutput}`));
      });
      pgDump.on('error', reject);
    });

    // 4. Create encrypted ZIP
    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(tempZipPath);
      
      output.on('error', (err) => {
        reject(new Error(`Failed to write ZIP file: ${err.message}`));
      });

      const archive = archiver.create('zip-encrypted', {
        zlib: { level: 8 },
        encryptionMethod: 'aes256',
        password: zipPassword
      });

      output.on('close', resolve);
      archive.on('error', reject);

      archive.pipe(output);
      archive.file(tempSqlPath, { name: `${settings.pgDatabase}_backup.sql` });
      archive.finalize();
    });

    let fileId = null;
    let filename = `PGVault_Backup_${settings.pgDatabase}_${new Date().toISOString().replace(/:/g, '-')}.zip`;
    let localBackupPath = null;
    let s3Key = null;
    let fileSizeBytes = 0;

    try {
      const stats = fs.statSync(tempZipPath);
      fileSizeBytes = stats.size;
    } catch (e) {
      console.error('Failed to read zip file size:', e);
    }
    
    const dateStr = new Date().toISOString().split('T')[0]; // e.g. "2026-06-30"
    const dateFolderName = settings.appName ? `${settings.appName} - ${dateStr}` : dateStr;

    // 5. Upload to destinations based on toggles
    
    // --- Google Drive ---
    if (settings.destGoogleDrive && settings.driveRefreshTokenEnc && settings.driveClientId && settings.driveClientSecretEnc) {
      try {
        const clientSecret = cryptoService.decryptString(settings.driveClientSecretEnc);
        const refreshToken = cryptoService.decryptString(settings.driveRefreshTokenEnc);

        const auth = new google.auth.OAuth2(settings.driveClientId, clientSecret);
        auth.setCredentials({ refresh_token: refreshToken });

        const drive = google.drive({ version: 'v3', auth });
        
        const parentId = settings.driveFolderId ? settings.driveFolderId : 'root';
        const q = `mimeType='application/vnd.google-apps.folder' and name='${dateFolderName}' and trashed=false and '${parentId}' in parents`;
        
        const resList = await drive.files.list({
          q: q,
          spaces: 'drive',
          fields: 'files(id, name)',
        });

        let targetFolderId;
        
        if (resList.data.files && resList.data.files.length > 0) {
          targetFolderId = resList.data.files[0].id;
        } else {
          const folderMetadata = {
            name: dateFolderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: settings.driveFolderId ? [settings.driveFolderId] : []
          };
          const createdFolder = await drive.files.create({
            resource: folderMetadata,
            fields: 'id'
          });
          targetFolderId = createdFolder.data.id;
        }

        const fileMetadata = {
          name: filename,
          parents: [targetFolderId]
        };
        
        const media = {
          mimeType: 'application/zip',
          body: fs.createReadStream(tempZipPath)
        };

        const driveRes = await drive.files.create({
          resource: fileMetadata,
          media: media,
          fields: 'id, name',
          supportsAllDrives: true
        });

        fileId = driveRes.data.id;
        console.log(`Uploaded to Google Drive successfully: ${driveRes.data.name}`);
      } catch (err) {
        console.error('Google Drive Upload Failed:', err);
        // Continue to other destinations even if Drive fails
      }
    }

    // --- Amazon S3 ---
    if (settings.destS3 && settings.s3AccessKey && settings.s3SecretKeyEnc && settings.s3Bucket) {
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

        const uploadKey = `${dateFolderName}/${filename}`;
        
        const fileStream = fs.createReadStream(tempZipPath);
        
        const command = new PutObjectCommand({
          Bucket: settings.s3Bucket,
          Key: uploadKey,
          Body: fileStream,
          ContentType: 'application/zip'
        });

        await s3Client.send(command);
        s3Key = uploadKey;
        console.log(`Uploaded to Amazon S3 successfully: ${uploadKey}`);
      } catch (err) {
        console.error('Amazon S3 Upload Failed:', err);
      }
    }

    // --- Local Storage ---
    // If local is explicitly set, OR if neither Google Drive nor S3 were enabled (fallback safety)
    if (settings.destLocal !== false || (!settings.destGoogleDrive && !settings.destS3)) {
      try {
        const backupsDir = path.join(__dirname, '..', 'backups');
        if (!fs.existsSync(backupsDir)) {
          fs.mkdirSync(backupsDir, { recursive: true });
        }
        localBackupPath = path.join(backupsDir, filename);
        fs.copyFileSync(tempZipPath, localBackupPath);
        console.log(`Saved locally successfully: ${localBackupPath}`);
      } catch (err) {
        console.error('Local Backup Failed:', err);
      }
    }

    // 6. Encrypt zip password and store in BackupSecret
    const encResult = cryptoService.encrypt(zipPassword);
    await prisma.backupSecret.create({
      data: {
        backupId: backupId,
        userId: userId,
        zipPasswordEnc: encResult.encryptedData,
        iv: encResult.iv,
        authTag: encResult.authTag
      }
    });

    // 7. Update backup status
    await prisma.backup.update({
      where: { id: backupId },
      data: { 
        status: 'done', 
        driveFileId: fileId, 
        driveFilename: filename,
        localBackupPath: localBackupPath,
        s3Key: s3Key,
        fileSizeBytes: fileSizeBytes
      }
    });

  } catch (error) {
    console.error(`Backup ${backupId} failed:`, error);
    await prisma.backup.update({
      where: { id: backupId },
      data: { status: 'failed' }
    });
  } finally {
    // 8. Strict cleanup of temp files
    try {
      if (fs.existsSync(tempSqlPath)) fs.unlinkSync(tempSqlPath);
      if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath);
    } catch (cleanupError) {
      console.error(`Cleanup failed for backup ${backupId}:`, cleanupError);
    }
  }
}

module.exports = {
  performBackup
};
