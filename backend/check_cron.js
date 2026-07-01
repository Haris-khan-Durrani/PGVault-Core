const prisma = require('./db');

async function check() {
  const settings = await prisma.settings.findUnique({
    where: { userId: 2 }
  });
  console.log(settings.cronSchedule);
}

check().catch(console.error).finally(() => process.exit(0));
