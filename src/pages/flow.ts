import { stages } from '../stages'
import { isUnlocked, type Progress } from '../storage/progress'

// 모든 스테이지를 마쳤으면 이어하기 대신 목록에서 다시 고른다.
export function continueStageIndex(progress: Progress): number | undefined {
  if (!stages.some(stage => progress.stages[stage.id] !== undefined)) return undefined
  const index = stages.findIndex((stage, index) => isUnlocked(progress, index) && !progress.stages[stage.id]?.completed)
  return index === -1 ? undefined : index
}

export function showNextStage(progress: Progress, stageId: string, lastStage: boolean): boolean {
  return !lastStage && progress.stages[stageId]?.completed === true
}
