export async function pollUntil<T>(
  read: () => Promise<T | null>,
  timeoutMs: number,
  message = "Timed out waiting for condition",
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const last = await read();
    if (last !== null) {
      return last;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(message);
}
