-- Seed default lists for every existing user.
-- Idempotent inserts by (userId, name).

INSERT INTO "List" ("id", "userId", "name", "isDefault", "createdAt", "updatedAt")
SELECT
  'list_work_' || substring(md5(random()::text || clock_timestamp()::text) from 1 for 16),
  u."id",
  'Работа',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User" u
WHERE NOT EXISTS (
  SELECT 1 FROM "List" l WHERE l."userId" = u."id" AND l."name" = 'Работа'
);

INSERT INTO "List" ("id", "userId", "name", "isDefault", "createdAt", "updatedAt")
SELECT
  'list_personal_' || substring(md5(random()::text || clock_timestamp()::text) from 1 for 16),
  u."id",
  'Личное',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User" u
WHERE NOT EXISTS (
  SELECT 1 FROM "List" l WHERE l."userId" = u."id" AND l."name" = 'Личное'
);

INSERT INTO "List" ("id", "userId", "name", "isDefault", "createdAt", "updatedAt")
SELECT
  'list_no_list_' || substring(md5(random()::text || clock_timestamp()::text) from 1 for 16),
  u."id",
  'Без списка',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User" u
WHERE NOT EXISTS (
  SELECT 1 FROM "List" l WHERE l."userId" = u."id" AND l."name" = 'Без списка'
);
