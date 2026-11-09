// The online-to-local handoff.
//
// One visitor request always produces exactly one answer:
//
//   ask the online assistant ──► reply within the budget ──► show the online reply
//                         └────► too slow / offline / error / unusable ──► show the local answer
//
// The local answer is computed by the caller before this starts, so taking over is instant and the
// visitor never has to ask again. When the local answer wins, the online request is aborted, and
// anything it returns afterwards is ignored. Cancelling (a newer request, a closed popup) settles
// with nothing to show, so an old request can never replace a newer answer.
//
// No DOM or React in here: timers and AbortController only, so it is testable in Node.

/** The most the online assistant is given before the local brain takes over. */
export const ONLINE_BUDGET_MS = 5000

export type HandoffSource = 'online' | 'local'
export type HandoffReason = 'online-ok' | 'timeout' | 'offline' | 'error' | 'invalid' | 'local-only'

export interface HandoffResult {
  source: HandoffSource
  reason: HandoffReason
  text: string
  elapsedMs: number
}

export interface HandoffOptions {
  /**
   * Ask the online assistant. Resolve with its raw reply or reject. The signal is aborted when the
   * budget runs out or the handoff is cancelled, so the request can stop and free its connection.
   * `null` means this answer is local only (a gated area, or nothing safe to send).
   */
  online: ((signal: AbortSignal) => Promise<unknown>) | null
  /** The local answer, already composed. */
  local: string
  budgetMs?: number
  /** Skip the wait when the browser already knows it has no connection. */
  offline?: () => boolean
  /** Turn a raw online reply into display text, or `null` to reject it and use the local answer. */
  accept?: (raw: unknown) => string | null
}

export interface HandoffHandle {
  /** Resolves once, with the one answer to show, or `null` if cancelled. Never rejects. */
  result: Promise<HandoffResult | null>
  /** Abandon the request. Safe to call at any time, including after it settled. */
  cancel: () => void
}

const URL_PATTERN = /https?:\/\/|www\./i

/**
 * Make an online reply fit for the popup: plain text, no speaker label, no links the assistant may have
 * invented, trimmed at a sentence boundary. Returns `null` for anything unusable.
 */
export function sanitizeReply(raw: unknown, maxChars = 420): string | null {
  if (typeof raw !== 'string') return null
  let text = raw.replace(/\s+/g, ' ').trim().replace(/^Baew\s*:\s*/i, '')
  text = text.replace(/[*_`#]+/g, '').trim()
  if (!text || URL_PATTERN.test(text)) return null
  if (text.length > maxChars) {
    const cut = text.slice(0, maxChars)
    const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '))
    text = end > maxChars * 0.4 ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, '') + '…'
  }
  return text
}

export function startHandoff(options: HandoffOptions): HandoffHandle {
  const budget = options.budgetMs ?? ONLINE_BUDGET_MS
  const accept = options.accept ?? ((raw: unknown) => sanitizeReply(raw))
  const started = Date.now()
  const controller = new AbortController()
  let settled = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let finish: (value: HandoffResult | null) => void = () => {}
  const result = new Promise<HandoffResult | null>(resolve => { finish = resolve })

  const settle = (value: HandoffResult | null) => {
    if (settled) return
    settled = true
    if (timer !== undefined) clearTimeout(timer)
    finish(value)
  }
  const useLocal = (reason: HandoffReason) => {
    if (settled) return
    controller.abort() // stop the online request; whatever it returns later is ignored
    settle({ source: 'local', reason, text: options.local, elapsedMs: Date.now() - started })
  }

  if (!options.online) {
    settle({ source: 'local', reason: 'local-only', text: options.local, elapsedMs: 0 })
  } else if (options.offline?.()) {
    useLocal('offline')
  } else {
    timer = setTimeout(() => useLocal('timeout'), budget)
    let pending: Promise<unknown>
    try {
      pending = Promise.resolve(options.online(controller.signal))
    } catch {
      useLocal('error')
      pending = Promise.resolve(null)
    }
    pending.then(
      raw => {
        if (settled) return // the local answer already won, or the request was cancelled
        const text = accept(raw)
        if (text) settle({ source: 'online', reason: 'online-ok', text, elapsedMs: Date.now() - started })
        else useLocal('invalid')
      },
      () => useLocal('error'),
    )
  }

  return {
    result,
    cancel: () => {
      if (settled) return
      controller.abort()
      settle(null)
    },
  }
}
