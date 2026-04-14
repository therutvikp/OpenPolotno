export async function waitTillAvailable<T>(
  check: () => T | null | undefined,
): Promise<T | null> {
  for (let i = 0; i < 30; i++) {
    const result = await check();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return null;
}
