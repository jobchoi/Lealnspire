import { stages, allStages, unit2Stages, unit3Stages, unit4Stages, unit5Stages, unit6Stages, unit7Stages, unit8Stages } from '../model/stages'
import { isUnlocked, type Progress } from '../model/ProgressRepository'

// 모든 스테이지를 마쳤으면 이어하기 대신 목록에서 다시 고른다.
export function continueStageIndex(progress: Progress): number | undefined {
  if (!stages.some(stage => progress.stages[stage.id] !== undefined)) return undefined
  const index = stages.findIndex((stage, index) => isUnlocked(progress, index) && !progress.stages[stage.id]?.completed)
  if (index !== -1) return index
  const next = [...unit2Stages, ...unit3Stages, ...unit4Stages, ...unit5Stages, ...unit6Stages, ...unit7Stages, ...unit8Stages].find(stage => !progress.stages[stage.id]?.completed)
  return next && stages.every(stage => progress.stages[stage.id]?.completed) ? allStages.indexOf(next) : undefined
}

export function showNextStage(progress: Progress, stageId: string, lastStage: boolean): boolean {
  return !lastStage && progress.stages[stageId]?.completed === true
}

export function stageCards(progress: Progress) {
  return allStages.map((stage, index) => ({ stage, index, unlocked: isUnlocked(progress, index), stars: progress.stages[stage.id]?.bestStars ?? 0 }))
}
