const { performBackup } = require('./services/backupWorker');
const prisma = require('./db');

async function test() {
  console.log('Creating test backup record...');
  const backup = await prisma.backup.create({
    data: {
      userId: 2, // Assuming user ID 2 from earlier
      status: 'pending'
    }
  });
  console.log(`Starting performBackup for backup ID: ${backup.id}`);
  await performBackup(2, backup.id);
  console.log('Finished performBackup');
}

test().catch(console.error).finally(() => process.exit(0));
