export const playbackSpeeds = { slow: 800, normal: 400, fast: 150 } as const
export function nextFrameIndex(index: number, frameCount: number): number {
  return Math.min(index + 1, Math.max(0, frameCount - 1))
}
export function isLastFrame(index: number, frameCount: number): boolean {
  return frameCount > 0 && index >= frameCount - 1
}
