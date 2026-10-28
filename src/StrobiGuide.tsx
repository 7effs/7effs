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

// Match these IDs and targets to the sections on the real website.
const cues: Record<string, Cue> = {
  home: { message: 'Hey! I’m Strobi. I can help you find your way around this page.', action: 'Take the tour', target: 'features', animation: 'excited' },
  features: { message: 'Here’s the useful stuff, all in one place. Want to see how it works?', action: 'Show me', target: 'how-it-works', animation: 'playful' },
  'how-it-works': { message: 'Three simple steps. I’ll point you to the next one when you’re ready.', action: 'Get started', target: 'get-started', animation: 'listening' },
  faq: { message: 'Questions? The quick answers are right here.', action: 'See next step', target: 'get-started', animation: 'happy' },
  'get-started': { message: 'You made it! Tap me any time for another pointer or hint.', action: 'Back to top', target: 'home', animation: 'proud' },
}
const sectionOrder = ['home', 'features', 'how-it-works', 'faq', 'get-started']
const dockClasses = ['dock-br', 'dock-bl', 'dock-tr', 'dock-br', 'dock-tl']

export default function StrobiGuide() {
  const [activeSection, setActiveSection] = useState('home')
  const [cue, setCue] = useState<Cue | null>(null)
  const [bubbleOpen, setBubbleOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [animation, setAnimation] = useState<AnimationName>('playful')
  const [dock, setDock] = useState('dock-br')
  const [quiet, setQuiet] = useState(false)
  const seenSections = useRef(new Set<string>())
  const introShown = useRef(false)
  const inactivityTimer = useRef<number | undefined>(undefined)
  const lastActivity = useRef(Date.now())
  const quietRef = useRef(false)
  const manualHiddenRef = useRef(false)

  const showCue = useCallback((sectionId: string, force = false) => {
    if (manualHiddenRef.current) return
    const next = cues[sectionId] ?? cues.home
    setCue(next)
    setAnimation(next.animation)
    setBubbleOpen(true)
    setHidden(false)
    if (!force) seenSections.current.add(sectionId)
  }, [])

  const scrollToTarget = useCallback((target: string) => {
    const element = document.getElementById(target)
    if (element) {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      element.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })
      setActiveSection(target)
      const index = Math.max(0, sectionOrder.indexOf(target))
      setDock(dockClasses[index % dockClasses.length])
    }
  }, [])

  const registerActivity = useCallback(() => {
    lastActivity.current = Date.now()
    quietRef.current = false
    setQuiet(false)
    setAnimation(current => current === 'sleeping' ? 'waking' : current)
    if (inactivityTimer.current) window.clearTimeout(inactivityTimer.current)
    inactivityTimer.current = window.setTimeout(() => {
      if (Date.now() - lastActivity.current >= 42000) {
        setBubbleOpen(false)
        quietRef.current = true
        setQuiet(true)
        setAnimation('sleeping')
      }
    }, 43000)
  }, [])

  useEffect(() => {
    const introTimer = window.setTimeout(() => {
      if (!introShown.current) {
        introShown.current = true
        showCue('home', true)
      }
    }, 1100)

    // Existing sites only need matching section IDs for automatic section cues.
    const sections = sectionOrder.map(id => document.getElementById(id)).filter((node): node is HTMLElement => node !== null)
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
      if (!visible) return
      const id = visible.target.id
      setActiveSection(id)
      const index = Math.max(0, sectionOrder.indexOf(id))
      setDock(dockClasses[index % dockClasses.length])
      if (introShown.current && !seenSections.current.has(id) && id !== 'home' && !quietRef.current) {
        seenSections.current.add(id)
        showCue(id)
      }
    }, { threshold: [0.25, 0.5, 0.7] })
    sections.forEach(section => observer.observe(section))

    const onClick = (event: MouseEvent) => {
      const element = event.target
      if (!(element instanceof Element)) return
      const clickable = element.closest<HTMLElement>('[data-strobi-tip], [data-strobi-go]')
      if (!clickable) return
      registerActivity()
      const tip = clickable.dataset.strobiTip
      const go = clickable.dataset.strobiGo
      if (tip && cues[tip]) showCue(tip, true)
      else if (go) showCue(go in cues ? go : activeSection, true)
    }
    document.addEventListener('click', onClick)

    const activityEvents: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart', 'scroll']
    const onActivity = () => registerActivity()
    activityEvents.forEach(name => window.addEventListener(name, onActivity, { passive: true }))
    registerActivity()

    return () => {
      window.clearTimeout(introTimer)
      if (inactivityTimer.current) window.clearTimeout(inactivityTimer.current)
      observer.disconnect()
      document.removeEventListener('click', onClick)
      activityEvents.forEach(name => window.removeEventListener(name, onActivity))
    }
  }, [registerActivity, showCue])

  const toggleAvatar = () => {
    registerActivity()
    if (bubbleOpen) setBubbleOpen(false)
    else showCue(activeSection, true)
  }
  const currentCue = cue ?? cues.home

  return <>
    {!hidden && <div className={`strobi-widget ${dock} ${quiet ? 'is-quiet' : ''}`} aria-label="Strobi website guide">
      {bubbleOpen && <section className="strobi-bubble" aria-live="polite" aria-label="Strobi hint">
        <button className="bubble-close" aria-label="Dismiss hint" onClick={() => { setBubbleOpen(false); registerActivity() }}>×</button>
        <div className="bubble-label"><span className="bubble-pulse" /> STROBI TIP</div>
        <p>{currentCue.message}</p>
        <div className="bubble-actions">
          <button className="bubble-primary" onClick={() => { const target = currentCue.target; setBubbleOpen(false); registerActivity(); scrollToTarget(target) }}>{currentCue.action} <span aria-hidden="true">↗</span></button>
          <button className="bubble-secondary" onClick={() => { setBubbleOpen(false); registerActivity() }}>Not now</button>
        </div>
      </section>}
      <div className="strobi-mascot-wrap">
        <button className="hide-strobi" aria-label="Hide Strobi" title="Hide Strobi" onClick={() => { manualHiddenRef.current = true; setHidden(true); setBubbleOpen(false) }}>×</button>
        <button className="strobi-mascot" aria-label={bubbleOpen ? 'Dismiss Strobi hint' : 'Ask Strobi for a hint'} aria-expanded={bubbleOpen} onClick={toggleAvatar}>
          <span className="mascot-glow" />
          <span className="mascot-avatar"><Avatar animation={animation} size="100%" ariaLabel="Strobi animated avatar" /></span>
        </button>
        {!bubbleOpen && <span className="tap-label">Need a hint?</span>}
      </div>
    </div>}
    {hidden && <button className="restore-strobi" onClick={() => { manualHiddenRef.current = false; setHidden(false); setQuiet(false); registerActivity(); showCue(activeSection, true) }} aria-label="Show Strobi again"><span className="restore-dot" /> Strobi</button>}
  </>
}
