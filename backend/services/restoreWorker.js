const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const sevenBin = require('7zip-bin');
const { extractFull } = require('node-7z');
const { google } = require('googleapis');
const cryptoService = require('./cryptoService');

const prisma = require('../db');

async function performRestore(userId, backupId) {
  let tempZipPath = '';
  let tempExtractDir = '';
  
  try {
    // 1. Fetch backup and secrets
    const backup = await prisma.backup.findUnique({ where: { id: backupId } });
    if (!backup || backup.userId !== userId) throw new Error('Backup not found');
    if (backup.status !== 'done') throw new Error('Cannot restore an incomplete backup');

    const backupSecret = await prisma.backupSecret.findUnique({ where: { backupId: backupId } });
    if (!backupSecret) throw new Error('Backup secret not found');

    const zipPassword = cryptoService.decrypt(
      backupSecret.zipPasswordEnc,
      backupSecret.iv,
      backupSecret.authTag
    );

    // 2. Fetch user settings
    const settings = await prisma.settings.findUnique({ where: { userId } });
    if (!settings || !settings.pgHost) throw new Error('PostgreSQL settings missing.');
    const pgPassword = settings.pgPasswordEnc ? cryptoService.decryptString(settings.pgPasswordEnc) : '';

    // 3. Locate and stage the ZIP file
    tempZipPath = path.join('/tmp', `restore_${backupId}.zip`);
    tempExtractDir = path.join('/tmp', `restore_${backupId}_ext`);

    if (backup.localBackupPath && fs.existsSync(backup.localBackupPath)) {
      fs.copyFileSync(backup.localBackupPath, tempZipPath);
    } else if (backup.driveFileId) {
      if (!settings.driveClientId || !settings.driveClientSecretEnc || !settings.driveRefreshTokenEnc) {
        throw new Error('Google Drive credentials missing to download backup');
      }
      
      const clientSecret = cryptoService.decryptString(settings.driveClientSecretEnc);
      const refreshToken = cryptoService.decryptString(settings.driveRefreshTokenEnc);
      const auth = new google.auth.OAuth2(settings.driveClientId, clientSecret);
      auth.setCredentials({ refresh_token: refreshToken });
      const drive = google.drive({ version: 'v3', auth });

      await new Promise(async (resolve, reject) => {
        try {
          const dest = fs.createWriteStream(tempZipPath);
          dest.on('error', reject);
          dest.on('finish', resolve);
          
          const res = await drive.files.get(
            { fileId: backup.driveFileId, alt: 'media' },
            { responseType: 'stream' }
          );
          res.data.pipe(dest);
        } catch (err) {
          reject(err);
        }
      });
    } else {
      throw new Error('Could not locate backup file (no local copy and no Drive ID)');
    }

    // 4. Extract the ZIP
    if (!fs.existsSync(tempExtractDir)) fs.mkdirSync(tempExtractDir, { recursive: true });
    
    await new Promise((resolve, reject) => {
      const myStream = extractFull(tempZipPath, tempExtractDir, {
        $bin: sevenBin.path7za,
        password: zipPassword
      });
      myStream.on('end', resolve);
      myStream.on('error', reject);
    });

    // 5. Find the extracted .sql file
    const files = fs.readdirSync(tempExtractDir);
    const sqlFile = files.find(f => f.endsWith('.sql'));
    if (!sqlFile) throw new Error('No SQL dump file found in the archive');

    const sqlFilePath = path.join(tempExtractDir, sqlFile);

    // 6. Run pg_restore
    await new Promise((resolve, reject) => {
      const restoreArgs = [
        '-h', settings.pgHost,
        '-p', settings.pgPort || '5432'
      ];
      if (settings.pgUser) restoreArgs.push('-U', settings.pgUser);
      
      // Crucial: --clean drops objects before restoring, --if-exists prevents errors if they don't exist
      restoreArgs.push('--clean', '--if-exists', '-d', settings.pgDatabase, sqlFilePath);

      const pgRestore = spawn('pg_restore', restoreArgs, {
        env: { ...process.env, PGPASSWORD: pgPassword },
        stdio: ['ignore', 'ignore', 'pipe']
      });

      let errorOutput = '';
      if (pgRestore.stderr) {
        pgRestore.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });
      }

      pgRestore.on('close', (code) => {
        if (code === 0) resolve();
        // Return error output for easier debugging
        else reject(new Error(`pg_restore failed with code ${code}. Error: ${errorOutput}`));
      });
      pgRestore.on('error', reject);
    });

  } finally {
    // 7. Cleanup
    try {
      if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath);
      if (fs.existsSync(tempExtractDir)) {
        const files = fs.readdirSync(tempExtractDir);
        for (const file of files) {
          fs.unlinkSync(path.join(tempExtractDir, file));
        }
        fs.rmdirSync(tempExtractDir);
      }
    } catch (e) {
      console.error(`Cleanup failed for restore ${backupId}:`, e);
    }
  }
}

module.exports = { performRestore };
