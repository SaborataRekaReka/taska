import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const defaultLists = [
  { name: 'Личное', order: 0 },
  { name: 'Работа', order: 1 },
  { name: 'Без списка', order: 2 },
];

async function ensureDefaultListsForUser(userId) {
  for (const list of defaultLists) {
    await prisma.list.upsert({
      where: {
        userId_name: {
          userId,
          name: list.name,
        },
      },
      update: {
        isDefault: true,
        order: list.order,
        deletedAt: null,
      },
      create: {
        userId,
        name: list.name,
        isDefault: true,
        order: list.order,
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
    `[seed] default lists ensured (${defaultLists.map((list) => list.name).join(', ')}) for ${
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
