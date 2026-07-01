const prisma = require('./db');

async function check() {
  const backups = await prisma.backup.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log(backups);
}

check().catch(console.error).finally(() => process.exit(0));
