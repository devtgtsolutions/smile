import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.tenant.upsert({
    where: { name: 'Room-01' },
    update: {},
    create: { name: 'Room-01', status: 'NORMAL' },
  });
  await prisma.user.upsert({
    where: { email: 'admin@crms.local' },
    update: {},
    create: {
      email: 'admin@crms.local',
      passwordHash: 'REPLACE_WITH_BCRYPT_HASH',
      role: 'SUPER_ADMIN',
    },
  });
}

main().finally(() => prisma.$disconnect());