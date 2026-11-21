export class Observable<T> {
  protected state: T
  private listeners = new Set<() => void>()
  constructor(initial: T) { this.state = initial }
  getSnapshot = (): T => this.state
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  protected update(next: T) { this.state = next; this.listeners.forEach(listener => listener()) }
}
