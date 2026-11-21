/** Centre of a train-map diamond, including the island artwork margins. */
export function isometric(x: number, y: number, height: number) {
  return { x: (x - y + height) * 40 + 24, y: (x + y) * 20 + 65 }
}
