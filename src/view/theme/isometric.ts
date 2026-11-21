export function isometric(x: number, y: number, height: number) {
  return { x: (x - y + height) * 24, y: (x + y) * 12 + 20 }
}
