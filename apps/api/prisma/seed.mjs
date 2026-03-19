import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const defaultListNames = ['Работа', 'Личное', 'Без списка'];

async function ensureDefaultListsForUser(userId) {
  for (const name of defaultListNames) {
    await prisma.list.upsert({
      where: {
        userId_name: {
          userId,
          name,
        },
      },
      update: {
        isDefault: true,
        deletedAt: null,
      },
      create: {
        userId,
        name,
        isDefault: true,
      },
    });
  }
}

async function main() {
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@taska.local' },
    update: {
      displayName: 'Demo User',
      provider: 'LOCAL',
    },
    create: {
      email: 'demo@taska.local',
      displayName: 'Demo User',
      provider: 'LOCAL',
    },
  });

  await ensureDefaultListsForUser(demoUser.id);

  const otherUsers = await prisma.user.findMany({
    where: { id: { not: demoUser.id } },
    select: { id: true },
  });

  for (const user of otherUsers) {
    await ensureDefaultListsForUser(user.id);
  }

  console.log(
    `[seed] default lists ensured (${defaultListNames.join(', ')}) for ${
      otherUsers.length + 1
    } user(s)`,
  );
}

main()
  .catch((error) => {
    console.error('[seed] failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
