export function normalizeUpdate<T extends Record<string, any>>(data: T): T {
  return Object.fromEntries(
    Object.entries(data).filter(
      ([, value]) => value !== null && value !== undefined && value !== ""
    )
  ) as T;
}
