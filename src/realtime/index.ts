import type { RealtimeEvent, RealtimeListener, RealtimeProvider } from './types'

export type * from './types'

/**
 * Simula tempo real no navegador:
 * - ouvintes da própria aba recebem o evento imediatamente;
 * - outras abas (ex.: Presidência em uma aba, Vereador em outra, Painel no telão)
 *   recebem via BroadcastChannel. Como o localStorage é compartilhado, os dados ficam consistentes.
 */
class LocalRealtimeProvider implements RealtimeProvider {
  private listeners = new Set<RealtimeListener>()
  private channel: BroadcastChannel | null = null
  private readonly tabId = crypto.randomUUID()

  constructor() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('spl-realtime')
      this.channel.onmessage = (e: MessageEvent<RealtimeEvent>) => {
        if (e.data?.origin !== this.tabId) this.emit(e.data)
      }
    }
  }

  private emit(event: RealtimeEvent) {
    this.listeners.forEach((l) => l(event))
  }

  publish(partial: Omit<RealtimeEvent, 'at' | 'origin'>) {
    const event: RealtimeEvent = { ...partial, at: new Date().toISOString(), origin: this.tabId }
    this.emit(event)
    this.channel?.postMessage(event)
  }

  subscribe(listener: RealtimeListener) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
}

export const realtime: RealtimeProvider = new LocalRealtimeProvider()
