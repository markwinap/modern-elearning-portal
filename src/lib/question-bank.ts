export function drawRandomSubset<T>(
  items: readonly T[],
  count: number,
  random: () => number = Math.random,
): T[] {
  if (count <= 0) return [];
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    const current = shuffled[index];
    const replacement = shuffled[target];
    if (current === undefined || replacement === undefined) continue;
    shuffled[index] = replacement;
    shuffled[target] = current;
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
