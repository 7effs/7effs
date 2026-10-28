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

const cues: Record<string, Cue> = {
  home: {
    message: 'Hey! I’m Strobi. Tap any section and I’ll help you explore it.',
    action: 'Take the tour',
    target: 'features',
    animation: 'excited',
  },
  features: {
    message: 'Explore the features here. Want me to show you how they work?',
    action: 'How it works',
    target: 'how-it-works',
    animation: 'playful',
  },
  'how-it-works': {
    message: 'Here’s how it works. Ready for the next section?',
    action: 'Next section',
    target: 'get-started',
    animation: 'listening',
  },
  faq: {
    message: 'Have a question? I can help you find the right information.',
    action: 'Get started',
    target: 'get-started',
    animation: 'happy',
  },
  'get-started': {
    message: 'You made it! Tap me whenever you need another hint.',
    action: 'Back to top',
    target: 'home',
    animation: 'proud',
  },
}

const sectionOrder = ['home', 'features', 'how-it-works', 'faq', 'get-started']
const dockClasses = ['dock-br', 'dock-bl', 'dock-tr', 'dock-tl', 'dock-br']

type Position = { left: number; top: number }

function getSafePosition(x: number, y: number): Position {
  const margin = 8
  const widgetWidth = Math.min(110, window.innerWidth - margin * 2)
  const widgetHeight = Math.min(210, window.innerHeight - margin * 2)

  let left = x - widgetWidth / 2
  let top = y - widgetHeight - 14

  if (top < margin) top = y + 14
  if (top + widgetHeight > window.innerHeight - margin) {
    top = window.innerHeight - widgetHeight - margin
  }

  left = Math.max(margin, Math.min(left, window.innerWidth - widgetWidth - margin))
  top = Math.max(margin, Math.min(top, window.innerHeight - widgetHeight - margin))

  return { left, top }
}

export default function StrobiGuide() {
  const [activeSection, setActiveSection] = useState('home')
  const [cue, setCue] = useState<Cue>(cues.home)
  const [bubbleOpen, setBubbleOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [animation, setAnimation] = useState<AnimationName>('playful')
  const [dock, setDock] = useState('dock-br')
  const [quiet, setQuiet] = useState(false)
  const [position, setPosition] = useState<Position | null>(null)

  const seenSections = useRef(new Set<string>())
  const introShown = useRef(false)
  const inactivityTimer = useRef<number | undefined>(undefined)
  const manualHiddenRef = useRef(false)
  const lastActivity = useRef(Date.now())

  const showCue = useCallback((sectionId: string, force = false) => {
    if (manualHiddenRef.current) return
    const next = cues[sectionId] ?? cues.home
    setCue(next)
    setAnimation(next.animation)
    setBubbleOpen(true)
    setHidden(false)
    setQuiet(false)
    if (!force) seenSections.current.add(sectionId)
  }, [])

  const registerActivity = useCallback(() => {
    lastActivity.current = Date.now()
    setQuiet(false)
    setAnimation(current => current === 'sleeping' ? 'waking' : current)

    if (inactivityTimer.current) window.clearTimeout(inactivityTimer.current)
    inactivityTimer.current = window.setTimeout(() => {
      if (Date.now() - lastActivity.current >= 42000) {
        setBubbleOpen(false)
        setQuiet(true)
        setAnimation('sleeping')
      }
    }, 43000)
  }, [])

  const scrollToTarget = useCallback((target: string) => {
    const element = document.getElementById(target)
    if (!element) return
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveSection(target)
  }, [])

  useEffect(() => {
    const introTimer = window.setTimeout(() => {
      if (!introShown.current && !manualHiddenRef.current) {
        introShown.current = true
        showCue('home', true)
      }
    }, 1100)

    const sectionElements = sectionOrder
      .map(id => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null)

    const observer = new IntersectionObserver(entries => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

      if (!visible) return
      const id = visible.target.id
      setActiveSection(id)

      const index = Math.max(0, sectionOrder.indexOf(id))
      setDock(dockClasses[index % dockClasses.length])

      if (
        introShown.current &&
        id !== 'home' &&
        !seenSections.current.has(id) &&
        !manualHiddenRef.current
      ) {
        seenSections.current.add(id)
        showCue(id)
      }
    }, { threshold: [0.3, 0.55, 0.75] })

    sectionElements.forEach(element => observer.observe(element))

    // Only react to taps on non-interactive page content.
    // Buttons, links, inputs, switches and Strobi controls remain untouched.
    const onPagePointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || !(event.target instanceof Element)) return

      const target = event.target
      if (target.closest(
        '#strobi-widget-root, #strobi-widget, .restore-strobi,' +
        'button, a, input, textarea, select, label, summary,' +
        '[role="button"], [role="switch"], [role="slider"],' +
        '[contenteditable="true"], [data-strobi-ignore]'
      )) return

      if (manualHiddenRef.current) return

      const x = event.clientX
      const y = event.clientY
      setPosition(getSafePosition(x, y))
      registerActivity()

      const section = target.closest<HTMLElement>(
        '[data-strobi-tip], section[id], main[id], article[id], [id]'
      )

      const sectionId = section?.dataset.strobiTip || section?.id
      if (sectionId && cues[sectionId]) {
        showCue(sectionId, true)
      } else {
        const heading = target.closest('h1, h2, h3')?.textContent?.trim()
        const name = heading || target.textContent?.trim().replace(/\s+/g, ' ').slice(0, 90)

        setCue({
          message: name
            ? `Want help understanding “${name}”? I can guide you around this page.`
            : 'Need help with this part of the page? Tap a section to explore it.',
          action: 'Explore the page',
          target: activeSection,
          animation: 'playful',
        })
        setAnimation('playful')
        setBubbleOpen(true)
      }
    }

    document.addEventListener('pointerdown', onPagePointerDown, true)
    registerActivity()

    return () => {
      window.clearTimeout(introTimer)
      if (inactivityTimer.current) window.clearTimeout(inactivityTimer.current)
      observer.disconnect()
      document.removeEventListener('pointerdown', onPagePointerDown, true)
    }
  }, [activeSection, registerActivity, showCue])

  const toggleAvatar = () => {
    registerActivity()
    if (bubbleOpen) {
      setBubbleOpen(false)
    } else {
      showCue(activeSection, true)
    }
  }

  return <>
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
          <section className="strobi-bubble" aria-live="polite" aria-label="Strobi hint">
            <button
              className="bubble-close"
              aria-label="Dismiss hint"
              onClick={() => {
                setBubbleOpen(false)
                registerActivity()
              }}
            >×</button>
            <div className="bubble-label">
              <span className="bubble-pulse" /> STROBI TIP
            </div>
            <p>{cue.message}</p>
            <div className="bubble-actions">
              <button
                className="bubble-primary"
                onClick={() => {
                  const target = cue.target
                  setBubbleOpen(false)
                  registerActivity()
                  scrollToTarget(target)
                }}
              >
                {cue.action} <span aria-hidden="true">↗</span>
              </button>
              <button
                className="bubble-secondary"
                onClick={() => {
                  setBubbleOpen(false)
                  registerActivity()
                }}
              >Not now</button>
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
          showCue(activeSection, true)
        }}
        aria-label="Show Strobi again"
      >
        <span className="restore-dot" /> Strobi
      </button>
    )}
  </>
}
