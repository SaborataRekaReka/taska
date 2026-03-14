export function resolveRequestId(rawHeader: unknown): string {
  if (typeof rawHeader === 'string' && rawHeader.trim().length > 0) {
    return rawHeader;
  }

  if (Array.isArray(rawHeader)) {
    const candidate = rawHeader.find((value) => typeof value === 'string' && value.trim().length > 0);
    if (candidate) {
      return candidate;
    }
  }

  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
