const GRADIENTS = [
  "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
  "linear-gradient(135deg, #0EA5E9 0%, #22D3EE 100%)",
  "linear-gradient(135deg, #059669 0%, #34D399 100%)",
  "linear-gradient(135deg, #D97706 0%, #FBBF24 100%)",
  "linear-gradient(135deg, #BE185D 0%, #F472B6 100%)",
  "linear-gradient(135deg, #4338CA 0%, #818CF8 100%)",
] as const;

export function gradientFromTitle(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash << 5) - hash + title.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[index] ?? GRADIENTS[0];
}
