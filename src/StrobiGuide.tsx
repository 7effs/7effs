import { createAvatar } from '@bible-strong/avatar-react'
import '@bible-strong/avatar-react/styles.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import definition from '../strobi.avatar.json'
import './widget.css'

const Avatar = createAvatar(definition)
type AnimationName = keyof typeof definition.animations

type Cue = {
  message: string
  action: string
  target: string
  animation: AnimationName
}

type Position = { left: number; top: number }

const SECTION_SELECTOR =
  'main > section[id], .archive-interface > section[id], [data-strobi-section][id]'

const ANIMATIONS: AnimationName[] = [
  'excited', 'playful', 'listening', 'happy', 'proud',
]

function getGuideSections(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(SECTION_SELECTOR)
  ).filter(section =>
    Boolean(section.id) &&
    !section.closest('#strobi-widget-root') &&
    !section.matches('[data-strobi-ignore]')
  )
}

function getRenderableSections(): HTMLElement[] {
  return getGuideSections().filter(section => {
    const style = getComputedStyle(section)
    return style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      section.getClientRects().length > 0
  })
}

function getSectionTitle(section: HTMLElement): string {
  const heading = section.querySelector<HTMLElement>(
    'h1, h2, h3, [data-strobi-title]'
  )
  return heading?.innerText?.trim().replace(/\s+/g, ' ').slice(0, 100)
    || section.getAttribute('aria-label')
    || section.id.replace(/[-_]+/g, ' ')
}

function getSectionText(section: HTMLElement): string {
  if (section.querySelector(
    'textarea, [contenteditable="true"], input[type="password"], [role="log"]'
  )) return ''

  const clone = section.cloneNode(true) as HTMLElement
  clone.querySelectorAll(
    'script, style, button, input, textarea, select, form, [hidden], ' +
    '[aria-hidden="true"], [data-strobi-ignore], [role="dialog"], ' +
    '#strobi-widget-root, #strobi-widget'
  ).forEach(el => el.remove())

  return (clone.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 1000)
}

function getLocalGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  if (hour >= 17 && hour < 21) return 'Good evening'
  return 'Good night'
}

function createFallbackCue(section: HTMLElement): Cue {
  const sections = getRenderableSections()
  const index = sections.findIndex(item => item.id === section.id)
  const next = sections[index + 1] || sections[0]
  const title = getSectionTitle(section)

  return {
    message: `You're exploring "${title}". Look through this section for its key details.`,
    action: next && next.id !== section.id ? 'Next section' : 'Read this section',
    target: next?.id || section.id,
    animation: ANIMATIONS[Math.max(0, index) % ANIMATIONS.length],
  }
}

function clampPosition(
  left: number,
  top: number,
  width = 188,
  height = 300
): Position {
  const margin = 10
  const maxLeft = Math.max(margin, window.innerWidth - width - margin)
  const maxTop = Math.max(margin, window.innerHeight - height - margin)

  return {
    left: Math.min(Math.max(margin, left), maxLeft),
    top: Math.min(Math.max(margin, top), maxTop),
  }
}

function positionNearPoint(x: number, y: number): Position {
  const width = Math.min(188, window.innerWidth - 20)
  const height = Math.min(300, window.innerHeight - 20)
  let top = y - height - 16

  if (top < 10) top = y + 16
  return clampPosition(x - width / 2, top, width, height)
}

export default function StrobiGuide() {
  const [cue, setCue] = useState<Cue>({
    message: `${getLocalGreeting()}! I'm Strobi. I'll help you explore this page.`,
    action: 'Explore the page',
    target: 'archive-home',
    animation: 'excited',
  })
  const [bubbleOpen, setBubbleOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [animation, setAnimation] = useState<AnimationName>('playful')
  const [quiet, setQuiet] = useState(false)
  const [position, setPosition] = useState<Position | null>(null)
  const [thinking, setThinking] = useState(false)

  const widgetRef = useRef<HTMLDivElement | null>(null)
  const seenSections = useRef(new Set<string>())
  const tipCache = useRef(new Map<string, Cue>())
  const activeSectionRef = useRef('archive-home')
  const introShown = useRef(false)
  const manualHiddenRef = useRef(false)
  const lastActivity = useRef(Date.now())
  const requestId = useRef(0)
  const activeRequest = useRef<AbortController | null>(null)
  const activeRequestSection = useRef<string | null>(null)
  const inactivityTimer = useRef<number | undefined>(undefined)
  const sectionTimer = useRef<number | undefined>(undefined)
  const ratios = useRef(new Map<HTMLElement, number>())
  const positionRef = useRef<Position | null>(null)

  const cancelInFlight = useCallback(() => {
    requestId.current += 1
    activeRequest.current?.abort()
    activeRequest.current = null
    activeRequestSection.current = null
    setThinking(false)
  }, [])

  const registerActivity = useCallback(() => {
    lastActivity.current = Date.now()
    setQuiet(false)
    setAnimation(current => current === 'sleeping' ? 'waking' : current)

    if (inactivityTimer.current) window.clearTimeout(inactivityTimer.current)
    inactivityTimer.current = window.setTimeout(() => {
      if (Date.now() - lastActivity.current >= 42000) {
        cancelInFlight()
        setBubbleOpen(false)
        setQuiet(true)
        setAnimation('sleeping')
      }
    }, 43000)
  }, [cancelInFlight])

  const moveNearPoint = useCallback((x: number, y: number) => {
    const next = positionNearPoint(x, y)
    positionRef.current = next
    setPosition(next)
  }, [])

  const showSmartTip = useCallback(async (
    section: HTMLElement,
    welcome = false
  ) => {
    if (manualHiddenRef.current || !section.id) return

    registerActivity()
    const sectionId = section.id
    const title = getSectionTitle(section)
    activeSectionRef.current = sectionId
    seenSections.current.add(sectionId)

    if (
      activeRequest.current &&
      activeRequestSection.current === sectionId
    ) {
      setBubbleOpen(true)
      return
    }

    cancelInFlight()
    const baseCue = createFallbackCue(section)
    setAnimation(baseCue.animation)
    setBubbleOpen(true)
    setHidden(false)
    setQuiet(false)

    const cached = tipCache.current.get(sectionId)
    if (cached) {
      setCue(cached)
      return
    }

    const sectionText = getSectionText(section)
    if (!sectionText) {
      setCue(baseCue)
      tipCache.current.set(sectionId, baseCue)
      return
    }

    const controller = new AbortController()
    const currentRequest = requestId.current
    activeRequest.current = controller
    activeRequestSection.current = sectionId
    setThinking(true)
    setCue({
      ...baseCue,
      message: welcome
        ? `${getLocalGreeting()}! I'm finding a useful detail in this section...`
        : `Here's a quick guide to "${title}"...`,
    })

    try {
      const response = await fetch('/api/strobi-guide', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: [
            'You are Strobi, a proactive guide for the JAYE / EFFS website.',
            'Give a useful, specific micro-guide in 1–3 short sentences, ideally under 45 words.',
            'Explain the purpose of this section or point out a helpful detail from the supplied text.',
            'Suggest a next step only when it is supported by the supplied text.',
            'Do not ask the visitor to type a question.',
            'Do not invent features, links, facts, or capabilities.',
            'Never request passwords, API keys, or private credentials.',
            `Local time greeting: ${getLocalGreeting()}.`,
            `Local time: ${new Date().toLocaleTimeString()}.`,
            `Section ID: ${sectionId}`,
            `Section title: ${title}`,
            `Visible section text: ${sectionText}`,
          ].join('\n'),
        }),
      })

      if (!response.ok) throw new Error('Strobi service unavailable')
      const data: { reply?: unknown } = await response.json()

      if (
        currentRequest !== requestId.current ||
        controller.signal.aborted ||
        manualHiddenRef.current
      ) return

      if (typeof data.reply === 'string' && data.reply.trim()) {
        const result = {
          ...baseCue,
          message: data.reply.trim().slice(0, 500),
        }
        tipCache.current.set(sectionId, result)
        setCue(result)
      } else {
        setCue(baseCue)
      }
    } catch {
      if (currentRequest === requestId.current && !manualHiddenRef.current) {
        setCue(baseCue)
      }
    } finally {
      if (currentRequest === requestId.current) {
        setThinking(false)
        activeRequest.current = null
        activeRequestSection.current = null
      }
    }
  }, [cancelInFlight, registerActivity])

  const closeBubble = useCallback(() => {
    cancelInFlight()
    setBubbleOpen(false)
    registerActivity()
  }, [cancelInFlight, registerActivity])

  const scrollToTarget = useCallback((target: string) => {
    document.getElementById(target)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
    activeSectionRef.current = target
  }, [])

  useEffect(() => {
    const observed = new WeakSet<HTMLElement>()

    const observeNewSections = (observer: IntersectionObserver) => {
      for (const section of getGuideSections()) {
        if (observed.has(section)) continue
        observed.add(section)
        ratios.current.set(section, 0)
        observer.observe(section)
      }
    }

    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        ratios.current.set(
          entry.target as HTMLElement,
          entry.isIntersecting ? entry.intersectionRatio : 0
        )
      }

      const current = Array.from(ratios.current.entries())
        .filter(([, ratio]) => ratio > 0)
        .sort((a, b) => b[1] - a[1])[0]?.[0]

      if (!current) return
      activeSectionRef.current = current.id

      if (!introShown.current || manualHiddenRef.current) return
      if (seenSections.current.has(current.id)) return

      if (sectionTimer.current) window.clearTimeout(sectionTimer.current)
      const sectionId = current.id

      sectionTimer.current = window.setTimeout(() => {
        const mostVisible = Array.from(ratios.current.entries())
          .filter(([, ratio]) => ratio > 0)
          .sort((a, b) => b[1] - a[1])[0]?.[0]

        if (
          mostVisible?.id !== sectionId ||
          seenSections.current.has(sectionId) ||
          manualHiddenRef.current
        ) return

        void showSmartTip(current)
      }, 850)
    }, { threshold: [0, 0.25, 0.45, 0.65, 0.8] })

    observeNewSections(observer)

    const mutationObserver = new MutationObserver(() => observeNewSections(observer))
    mutationObserver.observe(document.body, { childList: true, subtree: true })

    const introTimer = window.setTimeout(() => {
      if (introShown.current || manualHiddenRef.current) return
      introShown.current = true

      const sections = getRenderableSections()
      const visible = sections.find(section => {
        const rect = section.getBoundingClientRect()
        return rect.top < window.innerHeight && rect.bottom > 0
      })
      const section = visible || sections[0]

      if (section) {
        void showSmartTip(section, true)
      } else {
        setBubbleOpen(true)
        setCue({
          message: `${getLocalGreeting()}! I'm Strobi. Scroll through the page and I'll help you explore it.`,
          action: 'Explore the page',
          target: 'archive-home',
          animation: 'excited',
        })
      }
    }, 1000)

    const onPagePointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || !(event.target instanceof Element)) return
      const target = event.target

      if (target.closest(
        '#strobi-widget-root, #strobi-widget, .restore-strobi, ' +
        'button, a, input, textarea, select, label, summary, ' +
        '[role="button"], [role="switch"], [role="slider"], ' +
        '[contenteditable="true"], [data-strobi-ignore]'
      )) return

      if (manualHiddenRef.current) return

      registerActivity()
      moveNearPoint(event.clientX, event.clientY)

      const section = target.closest<HTMLElement>(SECTION_SELECTOR)
      const fallback = section ||
        getGuideSections().find(item => item.id === activeSectionRef.current) ||
        getRenderableSections()[0]

      if (fallback) void showSmartTip(fallback)
    }

    const onResize = () => {
      const current = positionRef.current
      if (!current) return
      const next = clampPosition(current.left, current.top)
      positionRef.current = next
      setPosition(next)
    }

    document.addEventListener('pointerdown', onPagePointerDown, true)
    window.addEventListener('resize', onResize)
    registerActivity()

    return () => {
      window.clearTimeout(introTimer)
      if (inactivityTimer.current) window.clearTimeout(inactivityTimer.current)
      if (sectionTimer.current) window.clearTimeout(sectionTimer.current)
      cancelInFlight()
      observer.disconnect()
      mutationObserver.disconnect()
      document.removeEventListener('pointerdown', onPagePointerDown, true)
      window.removeEventListener('resize', onResize)
    }
  }, [cancelInFlight, registerActivity, showSmartTip, moveNearPoint])

  const toggleAvatar = () => {
    registerActivity()
    if (bubbleOpen) {
      closeBubble()
      return
    }

    const section =
      getGuideSections().find(item => item.id === activeSectionRef.current) ||
      getRenderableSections()[0]

    if (section) {
      void showSmartTip(section)
    } else {
      setBubbleOpen(true)
      setCue({
        message: `${getLocalGreeting()}! I'm Strobi. Scroll through the page and I'll help you explore it.`,
        action: 'Explore the page',
        target: 'archive-home',
        animation: 'excited',
      })
    }
  }

  return (
    <>
      {!hidden && (
        <div
          ref={widgetRef}
          id="strobi-widget"
          className={`strobi-widget ${quiet ? 'is-quiet' : ''} ${bubbleOpen ? 'bubble-open' : ''}`}
          aria-label="Strobi website guide"
          style={position ? {
            left: `${position.left}px`,
            top: `${position.top}px`,
            right: 'auto',
            bottom: 'auto',
          } : undefined}
        >
          {bubbleOpen && (
            <section className="strobi-bubble" aria-live="polite" aria-label="Strobi hint">
              <button className="bubble-close" aria-label="Dismiss hint" onClick={closeBubble}>×</button>
              <div className="bubble-label">
                <span className="bubble-pulse" />
                {thinking ? 'STROBI IS THINKING' : 'STROBI TIP'}
              </div>
              <p>{cue.message}</p>
              <div className="bubble-actions">
                <button className="bubble-primary" onClick={() => {
                  const target = cue.target
                  closeBubble()
                  scrollToTarget(target)
                }}>
                  {cue.action} <span aria-hidden="true">↗</span>
                </button>
                <button className="bubble-secondary" onClick={closeBubble}>Not now</button>
              </div>
            </section>
          )}

          <div className="strobi-mascot-wrap">
            <button
              className="hide-strobi"
              aria-label="Hide Strobi"
              title="Hide Strobi"
              onClick={() => {
                manualHiddenRef.current = true
                cancelInFlight()
                setHidden(true)
                setBubbleOpen(false)
              }}
            >×</button>

            <button
              className="strobi-mascot"
              aria-label={bubbleOpen ? 'Dismiss Strobi hint' : 'Ask Strobi for a hint'}
              aria-expanded={bubbleOpen}
              onClick={toggleAvatar}
            >
              <span className="mascot-glow" />
              <span className="mascot-avatar">
                <Avatar animation={animation} size="100%" ariaLabel="Strobi animated avatar" />
              </span>
            </button>

            {!bubbleOpen && <span className="tap-label">Need a hint?</span>}
          </div>
        </div>
      )}

      {hidden && (
        <button
          className="restore-strobi"
          onClick={() => {
            manualHiddenRef.current = false
            setHidden(false)
            registerActivity()
            const section =
              getGuideSections().find(item => item.id === activeSectionRef.current) ||
              getRenderableSections()[0]
            if (section) void showSmartTip(section)
          }}
          aria-label="Show Strobi again"
        >
          <span className="restore-dot" /> Strobi
        </button>
      )}
    </>
  )
}
