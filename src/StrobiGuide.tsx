import { createAvatar } from '@bible-strong/avatar-react'
import '@bible-strong/avatar-react/styles.css'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
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

type Position = {
  left: number
  top: number
}

const SECTION_SELECTOR =
  'main > section[id], .archive-interface > section[id], [data-strobi-section][id]'

const ANIMATIONS: AnimationName[] = [
  'excited',
  'playful',
  'listening',
  'happy',
  'proud',
]

const DOCK_CLASSES = [
  'dock-br',
  'dock-bl',
  'dock-tr',
  'dock-tl',
  'dock-br',
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

function isSectionVisibleInLayout(section: HTMLElement): boolean {
  const style = window.getComputedStyle(section)

  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    section.getClientRects().length > 0
  )
}

function getRenderableSections(): HTMLElement[] {
  return getGuideSections().filter(isSectionVisibleInLayout)
}

function getSectionTitle(section: HTMLElement): string {
  const heading = section.querySelector<HTMLElement>(
    'h1, h2, h3, [data-strobi-title]'
  )

  return (
    heading?.innerText?.trim().replace(/\s+/g, ' ').slice(0, 100) ||
    section.getAttribute('aria-label') ||
    section.id.replace(/[-_]+/g, ' ')
  )
}

function getSectionText(section: HTMLElement): string {
  // Avoid reading the Cat conversation, editable content or password areas.
  if (
    section.querySelector(
      'textarea, [contenteditable="true"], input[type="password"], [role="log"]'
    )
  ) {
    return ''
  }

  // Clone the section so content used for the request does not alter the page.
  const clone = section.cloneNode(true) as HTMLElement

  clone.querySelectorAll(
    'script, style, button, input, textarea, select, form,' +
    '[hidden], [aria-hidden="true"], [data-strobi-ignore],' +
    '[role="dialog"], #strobi-widget-root, #strobi-widget'
  ).forEach(element => element.remove())

  // innerText excludes text hidden by the page's CSS.
  return (clone.innerText || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1000)
}

function createFallbackCue(section: HTMLElement): Cue {
  const sections = getRenderableSections()
  const index = sections.findIndex(item => item.id === section.id)

  const hasNext = index >= 0 && index < sections.length - 1
  const targetSection = hasNext
    ? sections[index + 1]
    : sections[0] || section

  const title = getSectionTitle(section)
  const animationIndex = Math.max(0, index) % ANIMATIONS.length

  return {
    message:
      `You're exploring "${title}". ` +
      'Take a look around; I can help you navigate the archive.',
    action: hasNext
      ? 'Next section'
      : targetSection.id !== section.id
        ? 'Back to top'
        : 'Read this section',
    target: targetSection.id,
    animation: ANIMATIONS[animationIndex],
  }
}

function getSafePosition(x: number, y: number): Position {
  const margin = 8
  const width = Math.min(110, window.innerWidth - margin * 2)
  const height = Math.min(210, window.innerHeight - margin * 2)

  let left = x - width / 2
  let top = y - height - 14

  if (top < margin) top = y + 14

  left = Math.max(
    margin,
    Math.min(left, window.innerWidth - width - margin)
  )

  top = Math.max(
    margin,
    Math.min(top, window.innerHeight - height - margin)
  )

  return { left, top }
}

export default function StrobiGuide() {
  const [cue, setCue] = useState<Cue>({
    message: "Hey! I'm Strobi. Let's explore the archive together.",
    action: 'Explore the archive',
    target: 'archive-home',
    animation: 'excited',
  })

  const [bubbleOpen, setBubbleOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [animation, setAnimation] =
    useState<AnimationName>('playful')
  const [dock, setDock] = useState('dock-br')
  const [quiet, setQuiet] = useState(false)
  const [position, setPosition] = useState<Position | null>(null)
  const [thinking, setThinking] = useState(false)

  const seenSections = useRef(new Set<string>())
  const tipCache = useRef(new Map<string, Cue>())
  const activeSectionRef = useRef<string>('archive-home')
  const introShown = useRef(false)
  const manualHiddenRef = useRef(false)
  const lastActivity = useRef(Date.now())

  const requestId = useRef(0)
  const activeRequest = useRef<AbortController | null>(null)
  const activeRequestSection = useRef<string | null>(null)

  const inactivityTimer = useRef<number | undefined>(undefined)
  const sectionTimer = useRef<number | undefined>(undefined)
  const intersectionRatios = useRef(new Map<HTMLElement, number>())

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

    setAnimation(current =>
      current === 'sleeping' ? 'waking' : current
    )

    if (inactivityTimer.current) {
      window.clearTimeout(inactivityTimer.current)
    }

    inactivityTimer.current = window.setTimeout(() => {
      if (Date.now() - lastActivity.current >= 42000) {
        cancelInFlight()
        setBubbleOpen(false)
        setQuiet(true)
        setAnimation('sleeping')
      }
    }, 43000)
  }, [cancelInFlight])

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

    // If this exact section is already being processed, do not restart it.
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

    // Reuse a successful answer instead of requesting it again.
    const cachedCue = tipCache.current.get(sectionId)

    if (cachedCue) {
      setCue(cachedCue)
      return
    }

    const sectionText = getSectionText(section)

    // Sections with no suitable visible text still get a normal hint.
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
        ? "Hey! I'm Strobi. I'm finding one useful detail in this section..."
        : `Let me find a useful detail about "${title}"...`,
    })

    try {
      const response = await fetch('/api/strobi-guide', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: [
            'STROBI PROACTIVE WEBSITE GUIDE',
            'Write a helpful micro-guide for the section below.',
            'Use one or two short sentences, ideally under 40 words.',
            'Explain a useful detail or the purpose of the section.',
            'Be warm, clear, specific and natural.',
            'Do not ask the visitor to type a question.',
            'Do not invent features, links or facts.',
            'Only use the supplied section title and visible text.',
            'Never request passwords, API keys or private credentials.',
            '',
            `Section ID: ${sectionId}`,
            `Section title: ${title}`,
            `Visible section text: ${sectionText}`,
          ].join('\n'),
        }),
      })

      if (!response.ok) {
        throw new Error('The guide service returned an error.')
      }

      const data: { reply?: unknown } = await response.json()

      // Ignore replies from old requests or a hidden widget.
      if (
        currentRequest !== requestId.current ||
        controller.signal.aborted ||
        manualHiddenRef.current
      ) {
        return
      }

      if (typeof data.reply === 'string' && data.reply.trim()) {
        const result: Cue = {
          ...baseCue,
          message: data.reply.trim().slice(0, 500),
        }

        tipCache.current.set(sectionId, result)
        setCue(result)
      } else {
        setCue(baseCue)
      }
    } catch {
      if (
        currentRequest === requestId.current &&
        !manualHiddenRef.current
      ) {
        // The page remains usable even if AI is unavailable.
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

  const scrollToTarget = useCallback((target: string) => {
    const element = document.getElementById(target)

    if (!element) return

    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })

    activeSectionRef.current = target
  }, [])

  const closeBubble = useCallback(() => {
    cancelInFlight()
    setBubbleOpen(false)
    registerActivity()
  }, [cancelInFlight, registerActivity])

  useEffect(() => {
    const observedSections = new WeakSet<HTMLElement>()

    const observeNewSections = (observer: IntersectionObserver) => {
      for (const section of getGuideSections()) {
        if (observedSections.has(section)) continue

        observedSections.add(section)
        intersectionRatios.current.set(section, 0)
        observer.observe(section)
      }
    }

    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const section = entry.target as HTMLElement

        intersectionRatios.current.set(
          section,
          entry.isIntersecting ? entry.intersectionRatio : 0
        )
      }

      const currentSection = Array.from(
        intersectionRatios.current.entries()
      )
        .filter(([, ratio]) => ratio > 0)
        .sort((a, b) => b[1] - a[1])[0]?.[0]

      if (!currentSection) return

      activeSectionRef.current = currentSection.id

      const availableSections = getRenderableSections()
      const sectionIndex = availableSections.findIndex(
        section => section.id === currentSection.id
      )

      setDock(
        DOCK_CLASSES[
          Math.max(0, sectionIndex) % DOCK_CLASSES.length
        ]
      )

      if (!introShown.current || manualHiddenRef.current) return
      if (seenSections.current.has(currentSection.id)) return

      if (sectionTimer.current) {
        window.clearTimeout(sectionTimer.current)
      }

      const sectionId = currentSection.id

      // Wait briefly so the widget does not interrupt quick scrolling.
      sectionTimer.current = window.setTimeout(() => {
        const mostVisible = Array.from(
          intersectionRatios.current.entries()
        )
          .filter(([, ratio]) => ratio > 0)
          .sort((a, b) => b[1] - a[1])[0]?.[0]

        if (
          mostVisible?.id !== sectionId ||
          seenSections.current.has(sectionId) ||
          manualHiddenRef.current
        ) {
          return
        }

        void showSmartTip(currentSection)
      }, 850)
    }, {
      threshold: [0, 0.25, 0.45, 0.65, 0.8],
    })

    observeNewSections(observer)

    // Also discover sections added later by the page.
    const mutationObserver = new MutationObserver(() => {
      observeNewSections(observer)
    })

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    })

    const introTimer = window.setTimeout(() => {
      if (introShown.current || manualHiddenRef.current) return

      introShown.current = true

      const sections = getRenderableSections()
      const visibleSection = sections.find(section => {
        const rect = section.getBoundingClientRect()
        return rect.top < window.innerHeight && rect.bottom > 0
      })

      const firstSection = visibleSection || sections[0]

      if (firstSection) {
        void showSmartTip(firstSection, true)
      } else {
        setBubbleOpen(true)
        setCue({
          message: "Hey! I'm Strobi. Scroll through the archive and I'll guide you.",
          action: 'Explore the archive',
          target: 'archive-home',
          animation: 'excited',
        })
      }
    }, 1000)

    const onPagePointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || !(event.target instanceof Element)) {
        return
      }

      const target = event.target

      // Never intercept interactive controls or Strobi itself.
      if (target.closest(
        '#strobi-widget-root, #strobi-widget, .restore-strobi,' +
        'button, a, input, textarea, select, label, summary,' +
        '[role="button"], [role="switch"], [role="slider"],' +
        '[contenteditable="true"], [data-strobi-ignore]'
      )) {
        return
      }

      if (manualHiddenRef.current) return

      setPosition(getSafePosition(event.clientX, event.clientY))
      registerActivity()

      // Find the closest section Strobi knows how to explain.
      let candidate = target.closest<HTMLElement>(
        'section[id], [data-strobi-section][id]'
      )

      let guideSection: HTMLElement | undefined

      while (candidate) {
        if (candidate.matches(SECTION_SELECTOR)) {
          guideSection = candidate
          break
        }

        candidate = candidate.parentElement?.closest<HTMLElement>(
          'section[id], [data-strobi-section][id]'
        ) ?? null
      }

      if (guideSection) {
        void showSmartTip(guideSection)
        return
      }

      // Clicking elsewhere reopens a useful hint for the current section.
      const currentSection = getGuideSections().find(
        section => section.id === activeSectionRef.current
      )

      const fallbackSection =
        currentSection || getRenderableSections()[0]

      if (fallbackSection) {
        void showSmartTip(fallbackSection)
      }
    }

    document.addEventListener('pointerdown', onPagePointerDown, true)
    registerActivity()

    return () => {
      window.clearTimeout(introTimer)

      if (inactivityTimer.current) {
        window.clearTimeout(inactivityTimer.current)
      }

      if (sectionTimer.current) {
        window.clearTimeout(sectionTimer.current)
      }

      cancelInFlight()
      observer.disconnect()
      mutationObserver.disconnect()

      document.removeEventListener(
        'pointerdown',
        onPagePointerDown,
        true
      )
    }
  }, [cancelInFlight, registerActivity, showSmartTip])

  const toggleAvatar = () => {
    registerActivity()

    if (bubbleOpen) {
      closeBubble()
      return
    }

    const section =
      getGuideSections().find(
        item => item.id === activeSectionRef.current
      ) || getRenderableSections()[0]

    if (section) {
      void showSmartTip(section)
    } else {
      setBubbleOpen(true)
      setCue({
        message: "Hey! I'm Strobi. Scroll through the archive and I'll guide you.",
        action: 'Explore the archive',
        target: 'archive-home',
        animation: 'excited',
      })
    }
  }

  return (
    <>
      {!hidden && (
        <div
          id="strobi-widget"
          className={`strobi-widget ${dock} ${quiet ? 'is-quiet' : ''}`}
          aria-label="Strobi website guide"
          style={position ? {
            left: `${position.left}px`,
            top: `${position.top}px`,
            right: 'auto',
            bottom: 'auto',
          } : undefined}
        >
          {bubbleOpen && (
            <section
              className="strobi-bubble"
              aria-live="polite"
              aria-label="Strobi hint"
            >
              <button
                className="bubble-close"
                aria-label="Dismiss hint"
                onClick={closeBubble}
              >
                ×
              </button>

              <div className="bubble-label">
                <span className="bubble-pulse" />
                {thinking ? 'STROBI IS THINKING' : 'STROBI TIP'}
              </div>

              <p>{cue.message}</p>

              <div className="bubble-actions">
                <button
                  className="bubble-primary"
                  onClick={() => {
                    const target = cue.target
                    closeBubble()
                    scrollToTarget(target)
                  }}
                >
                  {cue.action} <span aria-hidden="true">↗</span>
                </button>

                <button
                  className="bubble-secondary"
                  onClick={closeBubble}
                >
                  Not now
                </button>
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
            >
              ×
            </button>

            <button
              className="strobi-mascot"
              aria-label={
                bubbleOpen
                  ? 'Dismiss Strobi hint'
                  : 'Ask Strobi for a hint'
              }
              aria-expanded={bubbleOpen}
              onClick={toggleAvatar}
            >
              <span className="mascot-glow" />
              <span className="mascot-avatar">
                <Avatar
                  animation={animation}
                  size="100%"
                  ariaLabel="Strobi animated avatar"
                />
              </span>
            </button>

            {!bubbleOpen && (
              <span className="tap-label">Need a hint?</span>
            )}
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
              getGuideSections().find(
                item => item.id === activeSectionRef.current
              ) || getRenderableSections()[0]

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
