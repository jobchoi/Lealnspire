export const ko = {
  title: 'Lealnspire', stage: '스테이지', editor: '블록 편집기', palette: '블록 추가',
  blocks: { forward: '앞으로', turnLeft: '왼쪽으로 돌기', turnRight: '오른쪽으로 돌기', repeat: 'N번 반복' },
  workspace: '작업 공간', empty: '팔레트에서 블록을 추가하세요.',
  root: '추가 위치: 최상위 끝', target: (order: string) => `추가 위치: ${order}번 반복 몸체 끝`,
  total: (count: number, max?: number) => max === undefined ? `블록 ${count}개` : `블록 ${count} / ${max}개`,
  limit: '블록 제한에 도달했습니다. 블록을 삭제하면 추가할 수 있습니다.',
  select: '추가 대상으로 선택', deselect: '선택 해제', selected: '선택됨',
  remove: '삭제', up: '위로', down: '아래로', count: '반복 횟수', times: '번 반복',
  action: (order: string, name: string, action: string) => `${order}번 ${name} ${action}`,
}
