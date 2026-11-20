import { useEffect, useState } from 'react'
import { run } from '../engine/interpreter'
import type { Program, RunResult, Stage } from '../engine/types'
import { isLastFrame, nextFrameIndex, playbackSpeeds } from './playback'

type PlaybackState = { execution: RunResult | null; index: number; playing: boolean; dismissed: boolean }
const initial: PlaybackState = { execution: null, index: 0, playing: false, dismissed: false }
export function usePlayback(stage: Stage, program: Program) {
  const [state, setState] = useState<PlaybackState>(initial)
  const [speed, setSpeed] = useState<keyof typeof playbackSpeeds>('normal')
  const frameCount = state.execution?.frames.length ?? 0
  const finished = isLastFrame(state.index, frameCount)
  useEffect(() => {
    if (!state.playing || finished) return
    const timer = setTimeout(() => setState(previous => {
      const count = previous.execution?.frames.length ?? 0
      const index = nextFrameIndex(previous.index, count)
      return { ...previous, index, playing: !isLastFrame(index, count) }
    }), playbackSpeeds[speed])
    return () => clearTimeout(timer)
  }, [state.playing, state.index, finished, speed])
  function play() {
    if (!program.length) return
    const execution = run(stage, program)
    setState({ execution, index: 0, playing: execution.frames.length > 1, dismissed: false })
  }
  function step() {
    if (!program.length || state.playing || finished) return
    const execution = state.execution ?? run(stage, program)
    setState({ execution, index: nextFrameIndex(state.index, execution.frames.length), playing: false, dismissed: false })
  }
  return {
    frame: state.execution?.frames[state.index], result: state.execution?.result,
    locked: state.execution !== null, playing: state.playing, finished,
    showResult: finished && !state.dismissed, speed, setSpeed, play, step,
    reset: () => setState(initial),
    dismiss: () => setState(previous => ({ ...previous, dismissed: true })),
  }
}
