import { useSyncExternalStore } from 'react'
import type { Observable } from '../../controller/Observable'
export function useController<T>(controller: Observable<T>): T {
  return useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
}
