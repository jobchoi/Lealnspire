import { describe, expect, it } from 'vitest'
import { challenges, earnedChallenges, evaluateChallenge, stageChallenges } from './challenges'
import { ProgressRepository, progressV3Key, progressV4Key, historyKey, legacyHistoryKey } from './ProgressRepository'
import { Interpreter, runAll } from './interpreter'
import { allStages, stages, unit2Stages, unit11Stages } from './stages'
import { GameController } from '../controller/GameController'
import { courseCompleted } from '../controller/flow'
import { adminSummary } from './adminSummary'
import { learningSummary, parseHistory } from './historySummary'
import type { Program, ProgramDocument, Stage } from './types'
const now = '2026-11-28T00:00:00.000Z'
const doc = (main: Program): ProgramDocument => ({ main, functions: [] })
const runs = (stage: Stage, code: ProgramDocument) => stage.variants ? runAll(stage, code).results : [Interpreter.run(stage, code)]
const finish = (game: GameController) => { for (let i = 0; i < 1000 && !game.finished; i++) game.step(); expect(game.finished).toBe(true) }
const storage = () => { const data = new Map<string,string>(); return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string,v: string) => { data.set(k,v) }, removeItem: (k: string) => { data.delete(k) } } }
const options = { now: () => now }
const left: Program = stages[1].solution.flatMap(b => b.type === 'turnRight' ? [0,1,2].map(i => ({ id: `left-${i}`, type: 'turnLeft' as const })) : [b])
describe('optional challenge evidence', () => {
 it('accumulates only executed exclusive rotations across successful runs', () => {
   const c = stageChallenges('2')[0], right = doc(stages[1].solution)
   const partial = evaluateChallenge(c, right, runs(stages[1], right), undefined, now)!
   expect(partial).toEqual({ ruleVersion: 1, achievedAt: null, partial: ['turnRight'] })
   const unused = doc([...right.main, { id: 'unused', type: 'turnLeft' }])
   expect(evaluateChallenge(c, unused, runs(stages[1], unused), partial, now)).toEqual(partial)
   const mixed = doc([{ id: 'mix-l', type: 'turnLeft' }, { id: 'mix-r', type: 'turnRight' }, ...right.main])
   expect(evaluateChallenge(c, mixed, runs(stages[1], mixed), undefined, now)).toBeUndefined()
   const result = evaluateChallenge(c, doc(left), runs(stages[1], doc(left)), partial, now)!
   expect(result.achievedAt).toBe(now)
   expect(evaluateChallenge(c, right, runs(stages[1], right), result, 'later')).toBe(result)
   expect(evaluateChallenge(c, doc([]), runs(stages[1], doc([])), partial, now)).toBe(partial)
 })
 it('requires all variants and counts unused function bodies and branches at the public boundary', () => {
   const stage = unit2Stages[0], c = stageChallenges(stage.id)[0], code = doc(stage.solution)
   expect(evaluateChallenge(c, code, runs(stage,code), undefined, now)?.achievedAt).toBe(now)
   const long = structuredClone(code)
   long.functions.push({ id:'unused', icon:'star', body:[{ id:'extra',type:'turnLeft' }] })
   expect(evaluateChallenge(c, long, runs(stage,code), undefined, now)).toBeUndefined()
   const failed = runs(stage,code); failed[1] = { ...failed[1], result:'unfinished' }
   expect(evaluateChallenge(c, code, failed, undefined, now)).toBeUndefined()
   const longer: Program = structuredClone(stage.solution)
   if (longer[0].type !== 'repeat' || longer[0].body[0].type !== 'if') throw Error('fixture')
   longer[0].body[0].body = [0,1,2].map(i => ({ id:`long-left-${i}`,type:'turnLeft' }))
   expect(runs(stage,doc(longer)).every(r => r.result === 'success')).toBe(true)
   expect(evaluateChallenge(c, doc(longer), runs(stage,doc(longer)),undefined,now)).toBeUndefined()
 })
 it('records traversal directions only when comparisons actually ran', () => {
   const stage = unit11Stages[0], c = stageChallenges(stage.id)[0], front = doc(stage.solution)
   const back = structuredClone(front)
   const each = back.main.find(b => b.type === 'forEach')
   if (!each || each.type !== 'forEach') throw Error('fixture')
   each.direction = 'back'
   expect(runs(stage,front).every(r => r.result === 'success')).toBe(true)
   expect(runs(stage,back).every(r => r.result === 'success')).toBe(true)
   const partial = evaluateChallenge(c,front,runs(stage,front),undefined,now)!
   expect(partial.partial).toEqual(['front'])
   expect(evaluateChallenge(c,back,runs(stage,back),partial,now)?.achievedAt).toBe(now)
   const unused = doc([...front.main, { id:'unused-each',type:'forEach',direction:'back',body:[] }])
   expect(evaluateChallenge(c,unused,runs(stage,unused),partial,now)).toEqual(partial)
   expect(evaluateChallenge(c,doc([]),runs(stage,doc([])),partial,now)).toBe(partial)
 })
 it('responds to registry additions, removals and rule revisions without stage switches', () => {
   const sample = { stageId:'1',id:'temporary',kind:'shorter' as const,ruleVersion:1,params:{maxBlocks:2} }
   challenges.push(sample)
   try {
     const repo = new ProgressRepository(undefined, options), game = new GameController(stages[0],repo)
     game.edit(stages[0].solution); finish(game)
     expect(game.newlyAchieved).toEqual(['temporary'])
     expect(earnedChallenges('1',repo.getProgress().stages['1'].challenges)).toEqual([sample])
     expect(learningSummary(repo.getHistory(),repo.getProgress(),allStages).recentChallenges[0].challenge.id).toBe('temporary')
     challenges.pop()
     expect(earnedChallenges('1',repo.getProgress().stages['1'].challenges)).toEqual([])
     challenges.push({...sample,ruleVersion:2})
     expect(earnedChallenges('1',repo.getProgress().stages['1'].challenges)).toEqual([])
     game.dispose()
   } finally { challenges.splice(challenges.findIndex(c => c.id === 'temporary'),1) }
 })
})
describe('confirmation and migration', () => {
 it('awards on the first success at the final frame, once per rule, independently of hints and failures', () => {
   const repo = new ProgressRepository(undefined,options), stage = unit2Stages[0], game = new GameController(stage,repo)
   game.edit([{id:'wrong',type:'turnLeft'}]); finish(game); game.reset()
   game.toggleHint(); game.nextHint(); game.setSpeed('fast')
   game.edit(stage.solution); game.step()
   expect(repo.getProgress().stages[stage.id]?.completed).toBe(false)
   expect(repo.getProgress().stages[stage.id]?.challenges).toEqual({})
   finish(game)
   expect(game.newlyAchieved).toEqual(['shorter'])
   const completed = repo.getHistory().events.find(e => e.type === 'completionConfirmed')!
   expect(completed.data).toEqual({first:true})
   expect(repo.getHistory().version).toBe(3)
   game.setSpeed('normal'); game.toggleReview(); game.reset(); game.edit(stage.solution); finish(game)
   expect(game.newlyAchieved).toEqual([])
   expect(repo.getHistory().events.filter(e => e.type === 'challengeAchieved')).toHaveLength(1)
   expect(repo.getProgress().stages[stage.id].bestStars).toBe(0)
   game.dispose()
 })
 it('does not confirm calculated success after leaving, or use predictions as challenge evidence', () => {
   for (const kind of ['puzzle','prediction'] as const) {
     const repo = new ProgressRepository(undefined,options), game = new GameController(unit2Stages[0],repo,undefined,repo,kind)
     game.edit(unit2Stages[0].solution); game.step()
     if (kind === 'puzzle') { game.dispose(); finish(game) } else { finish(game); game.dispose() }
     expect(repo.getHistory().events.filter(e => e.type === 'challengeAchieved')).toEqual([])
     expect(repo.getProgress().stages['u2-1'].challenges).toEqual({})
   }
 })
 it('preserves v3 and old history, freezes stars and roundtrips partial states through edits and reloads', () => {
   const s = storage(), raw = JSON.stringify({version:3,learnerId:'old-id',historyStartedAt:now,pastDetailsUnavailable:false,stages:{'2':{completed:true,bestStars:2,lastProgram:{main:[],functions:[]}}}})
   const oldHistory = JSON.stringify({version:1,nextSequence:1,events:[],rollups:[],incomplete:false,compactedAt:null})
   s.setItem(progressV3Key,raw); s.setItem(legacyHistoryKey,oldHistory)
   let repo = new ProgressRepository(s,options)
   expect(repo.getProgressDocument().version).toBe(4)
   repo.completeStage('2',3,doc(stages[1].solution)); repo.confirmChallenges('2',doc(stages[1].solution),runs(stages[1],doc(stages[1].solution)))
   repo.saveProgram('2',[]); repo = new ProgressRepository(s,options)
   expect(repo.getProgress().stages['2'].bestStars).toBe(2)
   expect(repo.getProgress().stages['2'].challenges?.['both-turns'].partial).toEqual(['turnRight'])
   expect(repo.confirmChallenges('2',doc(left),runs(stages[1],doc(left)))).toEqual(['both-turns'])
   const copy = repo.getProgressDocument(); copy.stages['2'].challenges = {}
   expect(repo.getProgressDocument().stages['2'].challenges?.['both-turns'].achievedAt).toBe(now)
   expect(s.getItem(progressV3Key)).toBe(raw); expect(s.getItem(legacyHistoryKey)).toBe(oldHistory)
   expect(JSON.parse(s.getItem(historyKey)!).version).toBe(3)
   expect(repo.clear()).toBe(true)
   for (const key of [progressV3Key,progressV4Key,legacyHistoryKey,historyKey]) expect(s.getItem(key)).toBeNull()
 })
 it('isolates corrupt challenge entries, preserves awards after registry removal and never gates completion', () => {
   const s = storage(), repo = new ProgressRepository(s,options)
   for (const stage of allStages) repo.completeStage(stage.id,3,[])
   expect(courseCompleted(repo.getProgress())).toBe(true)
   const value = repo.getProgressDocument()
   value.stages['2'].challenges = { good:{ruleVersion:1,achievedAt:now}, bad:{ruleVersion:-1,achievedAt:now}, broken:{ruleVersion:1,achievedAt:'bad'} }
   s.setItem(progressV4Key,JSON.stringify(value))
   const restored = new ProgressRepository(s,options)
   expect(Object.keys(restored.getProgress().stages['2'].challenges!)).toEqual(['good'])
   expect(courseCompleted(restored.getProgress())).toBe(true)
   expect(adminSummary(restored.getHistory(),restored.getProgress(),allStages,restored.getProgressDocument()).entries.some(e => e.attention)).toBe(false)
 })
 it('continues to accept old star events without rewriting them', () => {
   const s = storage(), repo = new ProgressRepository(s,options)
   const input = {visitId:'v',attemptId:'a',activityKind:'puzzle' as const,activityId:'1',unit:1,recordedAt:now,elapsedMs:0,appVersion:'1',contentVersion:'1',evaluationVersion:'1',type:'completionConfirmed' as const,data:{first:true,stars:2}}
   expect(repo.appendHistory(input)).toBe(true)
   const old = {...repo.getHistory(),version:1}
   expect(parseHistory(JSON.stringify(old)).events[0].data).toEqual(input.data)
 })
})

it('ignores optional retries in teacher attention while retaining their attempt purpose', () => {
 const repo = new ProgressRepository(undefined,options), game = new GameController(stages[1],repo)
 game.edit(stages[1].solution); finish(game)
 for (let i = 0; i < 3; i++) { game.reset(); game.edit([{id:'wrong',type:'turnLeft'}]); finish(game) }
 const data = adminSummary(repo.getHistory(),repo.getProgress(),allStages,repo.getProgressDocument())
 expect(data.entries.find(e => e.stage.id === '2')?.attention).toBe(false)
 expect(repo.getHistory().events.filter(e => e.type === 'attemptStarted' && e.data.purpose === 'challenge')).toHaveLength(3)
 game.dispose()
})

it('counts nested and alternate branches even when they never execute, and resets partial evidence on rule changes', () => {
 const stage = unit2Stages[0], code = doc(structuredClone(stage.solution)), c = stageChallenges(stage.id)[0]
 const loop = code.main[0]
 if (loop.type !== 'repeat' || loop.body[0].type !== 'if') throw Error('fixture')
 loop.body[0].else = [{id:'else',type:'repeat',count:2,body:[{id:'nested',type:'forward'}]}]
 expect(evaluateChallenge(c,code,runs(stage,doc(stage.solution)),undefined,now)).toBeUndefined()
 const turn = stageChallenges('2')[0], right = doc(stages[1].solution)
 const old = {ruleVersion:0,achievedAt:null,partial:['turnLeft']}
 expect(evaluateChallenge(turn,right,runs(stages[1],right),old,now)).toEqual({ruleVersion:1,achievedAt:null,partial:['turnRight']})
})
