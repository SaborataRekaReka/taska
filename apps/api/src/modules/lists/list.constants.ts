export const VIRTUAL_TECH_LIST_NAMES = ['Мой день', 'Все'] as const;
export const PROTECTED_REAL_LIST_NAMES = ['Без списка'] as const;
export const RESERVED_SYSTEM_LIST_NAMES = [
  ...VIRTUAL_TECH_LIST_NAMES,
  ...PROTECTED_REAL_LIST_NAMES,
] as const;

export const DEFAULT_PERSISTED_LISTS = [
  { name: 'Личное', isDefault: true, order: 0 },
  { name: 'Работа', isDefault: true, order: 1 },
  { name: 'Без списка', isDefault: true, order: 2 },
] as const;

function normalizeListName(name: string): string {
  return name.trim().toLowerCase();
}

const reservedListNameSet = new Set(RESERVED_SYSTEM_LIST_NAMES.map(normalizeListName));
const protectedRealListNameSet = new Set(PROTECTED_REAL_LIST_NAMES.map(normalizeListName));

export function isReservedSystemListName(name: string): boolean {
  return reservedListNameSet.has(normalizeListName(name));
}

export function isProtectedRealListName(name: string): boolean {
  return protectedRealListNameSet.has(normalizeListName(name));
}
