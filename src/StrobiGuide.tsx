import { createAvatar } from '@bible-strong/avatar-react'
import '@bible-strong/avatar-react/styles.css'
import { useCallback, useEffect, useRef, useState, type CSSProperties, type FocusEvent as ReactFocusEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import definition from '../strobi.avatar.json'
import { createBrain, type BrainAnswer, type Progress } from './baew/brain'
import { sanitizeReply, startHandoff, type HandoffHandle } from './baew/handoff'
import { askOnline, buildPrompt, type PromptIntent } from './baew/online'
import { findHomeShift, getContentBoxes, getControlBoxes, overlapArea, type Box, type HomeShift } from './baew/clearance'
import './widget.css'

const Avatar = createAvatar(definition)
type AnimationName = keyof typeof definition.animations
type Personality = 'playful' | 'freaky'
type CueKind = 'tip' | 'casual' | 'menu'
// Who a popup is for decides how long it stays and what may replace it:
//   ambient   - spontaneous / idle chatter. Short-lived, never replaces anything already showing.
//   important - an explanation Baew volunteers (welcome, section tips). A little longer.
//   user      - something the visitor asked for (menu, "Explain", "Surprise me"). Longest.
type CuePriority = 'ambient' | 'important' | 'user'
type DayPart = 'morning' | 'daytime' | 'evening' | 'night'
type Cue = {
  message: string
  action: string
  target: string
  animation: AnimationName
  kind: CueKind
  alternatives?: string[]
  verbatim?: boolean // show exactly this text (skip the "never repeat a tip" rewriting)
}
type Position = { left: number; top: number }
type HelpOptions = { welcome?: boolean; deeper?: boolean; automatic?: boolean }
type SessionMemory = { messages: string[]; ideas: string[]; recentTips: string[] }
type DragState = {
  pointerId: number
  startX: number
  startY: number
  startLeft: number
  startTop: number
  moved: boolean
}

// Every area Baew can explain: the main sections, the homepage header, the Parent Space doorway, and the two
// systems inside the Parent Space overlay (which only count while that overlay is open and on screen).
const SECTION_SELECTOR =
  'main > section[id], main > header[id], main > #parent-interface-entry-wrap, .archive-interface > section[id], .parent-space-sections > section[id], [data-strobi-section][id]'
const AUTO_HIDE_MS = 8000

// One popup timer serves every cue; only the length differs by priority (see CuePriority). Every answer Baew
// gives, volunteered or asked for, stays about eight seconds from the moment it is on screen. Ambient chatter
// (idle hellos and time-of-day check-ins) is not an answer and stays brief.
const DISMISS_MS: Record<CuePriority, number> = { ambient: 4500, important: AUTO_HIDE_MS, user: AUTO_HIDE_MS }
const WELCOME_DELAY_MS = 1250       // how long after Baew becomes visible the welcome appears

const brain = createBrain()
const DISMISS_RESUME_MIN_MS = 2000  // least time left once a hovered / focused popup is let go
const AMBIENT_IDLE_MS = 22000       // quiet needed before Baew says anything unprompted
const SPONTANEOUS_MIN_GAP_MS = 240000 // spontaneous time-of-day messages are rare: >= 4 min apart, and the first one is 4 min in
const SPONTANEOUS_RECENT = 3        // how many of the latest ones are never repeated

// Idle float: once the visitor has been inactive, Baew glides to a new spot now and then.
const FLOAT_IDLE_MS = 9000        // inactivity required before a glide (and between glides)
const FLOAT_REST_MIN_MS = 6000    // rest between glides while the visitor stays idle
const FLOAT_REST_MAX_MS = 11000
const FLOAT_MS_PER_PX = 9         // roughly 110px per second
const FLOAT_MIN_MS = 2800
const FLOAT_MAX_MS = 6500
const FLOAT_EDGE_MARGIN = 12      // keep clear of the screen edges
const FLOAT_AVOID_PAD = 12        // breathing room around controls Baew should not cover

// Home clearance: Baew's resting corner is bottom-left (CSS). If page text, an icon, a card or a control
// sits under it she rises to the nearest clear spot, and returns to the corner once it is clear again.
const HOME_SETTLE_MS = 450    // quiet time after a scroll / resize before she re-checks

const SESSION_MEMORY_KEY = 'baew-guide-session-v1'
const PROGRESS_KEY = 'baew-guide-progress-v1'
const THINKING_LINES = ['Reading this section…', 'Checking the archive…', 'Finding the right words…', 'One moment…']
const ANIMATIONS: AnimationName[] = ['excited', 'playful', 'listening', 'happy', 'proud']

// Baew's voice: dry, warm and specific to this site. Short sentences, no filler, no emoji confetti.
// Playful is the friendly register; Freaky is the same character deadpan and a little conspiratorial.
// (Each "idea" is only ever used once per visit, so the two lines under it are alternates.)
const CASUAL_MESSAGES: Record<Personality, Array<{ idea: string; messages: string[] }>> = {
  playful: [
    { idea: 'greeting', messages: ["Hello. I’m Baew. I live in the margins of this page, and I know where everything is.", 'Hi, I’m Baew: small, blue, and unusually well informed about this site.'] },
    { idea: 'mood-check', messages: ['How’s the day treating you: calm, chaotic, or somewhere in between?', 'Honest question: are you here to browse, or to put off something else?'] },
    { idea: 'silly-question', messages: ['Settle something for me: does a tab you opened last Tuesday still count as “in progress”?', 'Quick poll: how many tabs are open right now? I won’t tell anyone.'] },
    { idea: 'explore', messages: ['Each section has one line worth reading twice. See if you can spot yours.', 'Pick one line on this page and read it twice. It usually says more the second time.'] },
    { idea: 'tiny-reset', messages: ['Unclench your jaw. Drop your shoulders. Then carry on.', 'Look at something far away for ten seconds. Your eyes will thank you, quietly.'] },
    { idea: 'encouragement', messages: ['There’s no feed here to keep up with. Go as slowly as you like.', 'There’s no deadline in the archive. Read as much or as little as you want.'] },
    { idea: 'curiosity', messages: ['If this archive had one more room, what would you want in it?', 'Which section did you skip? There’s often something good in the one you skipped.'] },
    { idea: 'company', messages: ['I’ll hover here. Tap me for a section explained, or just for a second opinion.', 'Still here, still floating. Tap me if you get stuck.'] },
    { idea: 'time-greeting', messages: [`${getLocalGreeting()}. Glad you stopped by.`, `${getLocalGreeting()}. Take your time with this one.`] },
    { idea: 'celebrate', messages: ['You’ve covered a good stretch of the archive. Nicely done.', 'That’s a fair amount read. A short stretch might be in order before the next part.'] },
    { idea: 'focus', messages: ['Pick one section and stay with it for a minute. The rest will keep.', 'One section, properly read, beats five skimmed. Choose yours.'] },
    { idea: 'surprise', messages: ['You don’t have to type anything to get help here. Tap me and pick an option.', 'Something the archive says about itself: the favourite colour is blue. I’m blue too. Make of that what you will.'] },
  ],
  freaky: [
    { idea: 'greeting', messages: ['So you found the archive. I’m Baew. I was starting to think the door was too well hidden.', 'Hello, visitor. I’m Baew. I know where things are buried. Mostly metaphorically.'] },
    { idea: 'mood-check', messages: ['State your mood in one word. I’ll pretend I’m not taking notes.', 'Be honest: curious, restless, or avoiding something? I won’t tell.'] },
    { idea: 'silly-question', messages: ['If a tab stays open for a week, does it start paying rent?', 'Theory: every open tab is an unfinished promise. How many have you made?'] },
    { idea: 'explore', messages: ['Something on this page is more interesting than it looks. I’m not saying what.', 'You scrolled past something. I saw. Go back for it.'] },
    { idea: 'tiny-reset', messages: ['Blink slowly. Drop your shoulders. I’m watching, but kindly.', 'Take a break. The archive keeps its secrets perfectly well for five minutes.'] },
    { idea: 'encouragement', messages: ['You don’t have to understand all of it. Nobody does. That’s rather the point.', 'Slow is fine. The best parts of this place reward a second read.'] },
    { idea: 'curiosity', messages: ['If the archive had a locked drawer, which section would you check first?', 'Which part of this site would you least like explained? That’s where I’d start.'] },
    { idea: 'company', messages: ['I’m not following you. I’m simply always nearby.', 'Ignore me. I’m only floating here, looking mysterious. Tap me when curiosity wins.'] },
    { idea: 'time-greeting', messages: [`${getLocalGreeting()}. Another hour in the archive. Interesting choice.`, `${getLocalGreeting()}. The page has been waiting for you. Patiently.`] },
    { idea: 'celebrate', messages: ['Another corner explored. The archive notes it, quietly.', 'Real progress. I’ve updated my imaginary file on you, and it’s flattering.'] },
    { idea: 'focus', messages: ['Choose one thing to understand next. The rest can wait in the dark.', 'One section, one clear idea. Then decide what you want next.'] },
    { idea: 'surprise', messages: ['Ask me to go deeper and I’ll tell you something you wouldn’t spot at first glance.', 'Between us: the favourite colour here is blue. I’m blue. Suspicious, isn’t it?'] },
  ],
}

const MENU_LINES = [
  'What would help right now?',
  'Pick one. I’ll keep it brief.',
  'Short version, or a closer look?',
  'Stuck, or just curious?',
  'Choose a direction. I’ll follow.',
]

// Spontaneous, time-of-day aware check-ins. They only ask or encourage; none assume anything about
// the visitor's day, work or life. The pool for the current part of the day is the part-specific
// list plus the anytime list.
const SPONTANEOUS_ANYTIME = [
  'A reminder you didn’t ask for: you’re doing better than you think.',
  'Quiet check-in. Have you had some water recently?',
  'Posture check. Shoulders down, jaw loose, screen a little further away.',
]
const SPONTANEOUS_BY_DAYPART: Record<DayPart, string[]> = {
  morning: [
    'Good morning. Did you sleep well?',
    'Fresh day. Start gently, then build.',
    'Morning check-in: an easy start, or already at full speed?',
  ],
  daytime: [
    'How’s your day going so far?',
    'Need a short break, or are you in the zone? Either is fine.',
    'Stretch o’clock. Roll your shoulders, take one deep breath, carry on.',
  ],
  evening: [
    'How was your day? Tell me, or keep it to yourself.',
    'Evening check-in: did anything good happen today?',
    'Winding down, or still going? Either way, ease off a little.',
  ],
  night: [
    'It’s getting late. Rest counts as progress too.',
    'Night-owl hours. Give your eyes a break soon.',
    'Sleepy check: tomorrow-you would appreciate some rest.',
  ],
}

function getGuideSections(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(SECTION_SELECTOR)).filter(section =>
    Boolean(section.id) &&
    !section.closest('#strobi-widget-root, #strobi-widget') &&
    !section.matches('[data-strobi-ignore]')
  )
}

function getRenderableSections(): HTMLElement[] {
  return getGuideSections().filter(section => {
    const style = getComputedStyle(section)
    return style.display !== 'none' && style.visibility !== 'hidden' && section.getClientRects().length > 0
  })
}

function getSectionTitle(section: HTMLElement): string {
  const heading = section.querySelector<HTMLElement>('h1, h2, h3, [data-strobi-title]')
  return heading?.innerText?.trim().replace(/\s+/g, ' ').slice(0, 100) ||
    section.getAttribute('aria-label') ||
    section.id.replace(/[-_]+/g, ' ')
}

function getSectionText(section: HTMLElement): string {
  if (section.querySelector('textarea, [contenteditable="true"], input[type="password"], [role="log"]')) return ''

  const clone = section.cloneNode(true) as HTMLElement
  clone.querySelectorAll(
    'script, style, button, input, textarea, select, form, [hidden], ' +
    '[aria-hidden="true"], [data-strobi-ignore], [role="dialog"], ' +
    '#strobi-widget-root, #strobi-widget'
  ).forEach(element => element.remove())

  return (clone.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 1000)
}

function getLocalGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  if (hour >= 17 && hour < 21) return 'Good evening'
  return 'Good night'
}

// Same boundaries as getLocalGreeting(), so "Good morning" and a morning message always agree.
function getDayPart(hour = new Date().getHours()): DayPart {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'daytime'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

function normalizeMessage(message: string): string {
  return message.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ')
}

function loadSessionMemory(): SessionMemory {
  const empty: SessionMemory = { messages: [], ideas: [], recentTips: [] }
  try {
    if (typeof window === 'undefined') return empty
    const raw = window.sessionStorage.getItem(SESSION_MEMORY_KEY)
    if (!raw) return empty
    const parsed = JSON.parse(raw) as Partial<SessionMemory>
    return {
      messages: Array.isArray(parsed.messages) ? parsed.messages.filter((value): value is string => typeof value === 'string').slice(-180) : [],
      ideas: Array.isArray(parsed.ideas) ? parsed.ideas.filter((value): value is string => typeof value === 'string').slice(-80) : [],
      recentTips: Array.isArray(parsed.recentTips) ? parsed.recentTips.filter((value): value is string => typeof value === 'string').slice(-12) : [],
    }
  } catch {
    return empty
  }
}

function saveSessionMemory(messages: Set<string>, ideas: Set<string>, recentTips: string[]) {
  try {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(SESSION_MEMORY_KEY, JSON.stringify({
      messages: Array.from(messages).slice(-180),
      ideas: Array.from(ideas).slice(-80),
      recentTips: recentTips.slice(-12),
    }))
  } catch {
    // The guide still works with in-memory history if sessionStorage is unavailable.
  }
}

// How far the visitor has got with each area this session (see baew/brain.ts). Kept apart from the chatter
// memory above so neither can overwrite the other, and so a visitor never hears the same overview twice.
function loadProgress(): Progress {
  try {
    if (typeof window === 'undefined') return {}
    const raw = window.sessionStorage.getItem(PROGRESS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, { explained?: unknown; depth?: unknown }>
    const clean: Progress = {}
    for (const [id, value] of Object.entries(parsed).slice(0, 40)) {
      if (value && typeof value.depth === 'number' && Number.isFinite(value.depth) && value.depth >= 0) {
        clean[id] = { explained: value.explained === true, depth: Math.min(Math.floor(value.depth), 1000) }
      }
    }
    return clean
  } catch {
    return {}
  }
}

function saveProgress(progress: Progress) {
  try {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
  } catch {
    // Progress then lasts for the page view only.
  }
}

function clampPosition(left: number, top: number, width?: number, height?: number): Position {
  const margin = 8
  const measured = document.getElementById('strobi-widget')?.getBoundingClientRect()
  const boxWidth = width ?? measured?.width ?? 188
  const boxHeight = height ?? measured?.height ?? 80
  return {
    left: Math.min(Math.max(margin, left), Math.max(margin, window.innerWidth - boxWidth - margin)),
    top: Math.min(Math.max(margin, top), Math.max(margin, window.innerHeight - boxHeight - margin)),
  }
}

function findActiveSection(activeId: string): HTMLElement | undefined {
  return getGuideSections().find(section => section.id === activeId) || getRenderableSections()[0]
}

// While the page's opening intro plays, html.jaye-intro-active hides everything behind it, Baew included. Asking
// the browser for her computed visibility to find out when that ends can force a style recalculation of the whole
// page each time, so the two checks that must wait for it listen for the class changing instead of polling.
const INTRO_CLASS = 'jaye-intro-active'
const introActive = () => document.documentElement.classList.contains(INTRO_CLASS)
function afterIntro(callback: () => void): () => void {
  const root = document.documentElement
  const observer = new MutationObserver(() => {
    if (root.classList.contains(INTRO_CLASS)) return
    observer.disconnect()
    callback()
  })
  observer.observe(root, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

// The popup for one answer. The text is shown exactly as given (verbatim): it was either written and checked
// ahead of time (see baew/knowledge) or is an online reply that has already been screened.
function answerCue(text: string, target: string, personality: Personality): Cue {
  return {
    message: text,
    action: 'Find this section',
    target,
    animation: personality === 'freaky' ? 'playful' : 'happy',
    kind: 'tip',
    verbatim: true,
  }
}

// The visible name of whatever a cue points at, from the verified knowledge when it has one.
function targetTitle(target: string): string {
  const entry = brain.entryForDomId(target)
  return entry ? entry.title : target.replace(/[-_]+/g, ' ') || 'this page'
}

/** The one place the guide names the site: set it a little brighter, nothing else. */
function renderMessage(text: string): ReactNode {
  return text.split(/(\bJAYE\b)/).map((part, i) => (part === 'JAYE' ? <b key={i} className="bubble-brand">{part}</b> : part))
}

export default function StrobiGuide() {
  const [sessionMemoryInitial] = useState<SessionMemory>(() => loadSessionMemory())
  const [progressInitial] = useState<Progress>(() => loadProgress())
  const [cue, setCue] = useState<Cue>({
    message: `${getLocalGreeting()}! I’m Baew. I can explain a section or offer a fresh angle.`,
    action: 'Find this section',
    target: 'archive-home',
    animation: 'excited',
    kind: 'casual',
  })
  const [bubbleOpen, setBubbleOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [animation, setAnimation] = useState<AnimationName>('playful')
  const [quiet, setQuiet] = useState(false)
  const [position, setPosition] = useState<Position | null>(null)
  const [thinking, setThinking] = useState(false)
  const [personality, setPersonality] = useState<Personality>('playful')
  const [dragging, setDragging] = useState(false)
  const [floatMs, setFloatMs] = useState<number | null>(null)
  const [homeShift, setHomeShift] = useState<HomeShift>({ dx: 0, lift: 0 })
  const [pillShift, setPillShift] = useState<HomeShift>({ dx: 0, lift: 0 })

  const widgetRef = useRef<HTMLDivElement | null>(null)
  const homeShiftRef = useRef<HomeShift>({ dx: 0, lift: 0 })
  const pillShiftRef = useRef<HomeShift>({ dx: 0, lift: 0 })
  const pillRef = useRef<HTMLButtonElement | null>(null)
  const floatFreezeRef = useRef<(sync?: boolean) => void>(() => {})
  const seenSections = useRef(new Set<string>())
  const activeSectionRef = useRef('archive-home')
  const introShown = useRef(false)
  const manualHiddenRef = useRef(false)
  const lastActivity = useRef(Date.now())
  const requestId = useRef(0)
  const activeRequestSection = useRef<string | null>(null)
  const activeHandoff = useRef<HandoffHandle | null>(null)   // the online-to-local race for the current request
  const progressRef = useRef<Progress>(progressInitial)      // what each area has already told the visitor
  const menuLineIndex = useRef(0)
  const inactivityTimer = useRef<number | undefined>(undefined)
  const sectionTimer = useRef<number | undefined>(undefined)
  const casualTimer = useRef<number | undefined>(undefined)
  const dismissTimer = useRef<number | undefined>(undefined)
  // Popup lifetime bookkeeping, all for the one dismissTimer above.
  const bubbleRef = useRef<HTMLElement | null>(null)
  const dismissDeadline = useRef(0)      // when the running timer will fire
  const dismissBase = useRef(0)          // length for the popup on screen (0 = stays until closed)
  const dismissRemaining = useRef(0)     // time left, kept while the popup is held
  const pointerInsidePopup = useRef(false)
  const focusInsidePopup = useRef(false)
  const popupHeld = useRef(false)        // hovered or keyboard-focused: the clock is stopped
  const interactionAt = useRef(Date.now())     // last scroll / key / touch / pointer movement anywhere
  const lastSpontaneousAt = useRef(Date.now()) // so the first spontaneous message is also >= 4 min in
  const recentSpontaneous = useRef<string[]>([])
  const ratios = useRef(new Map<HTMLElement, number>())
  const positionRef = useRef<Position | null>(null)
  const personalityRef = useRef<Personality>('playful')
  const bubbleOpenRef = useRef(false)
  const thinkingRef = useRef(false)
  const usedMessages = useRef(new Set<string>(sessionMemoryInitial.messages))
  const usedIdeas = useRef(new Set<string>(sessionMemoryInitial.ideas))
  const recentTipMessages = useRef<string[]>(sessionMemoryInitial.recentTips)
  const messageSerial = useRef(0)
  const dragRef = useRef<DragState | null>(null)
  const dragMovedRef = useRef(false)

  useEffect(() => { bubbleOpenRef.current = bubbleOpen }, [bubbleOpen])
  useEffect(() => { thinkingRef.current = thinking }, [thinking])

  const cancelInFlight = useCallback(() => {
    requestId.current += 1
    activeHandoff.current?.cancel() // settles with nothing to show and aborts the online request
    activeHandoff.current = null
    activeRequestSection.current = null
    thinkingRef.current = false
    setThinking(false)
  }, [])

  const clearDismissTimer = useCallback(() => {
    if (dismissTimer.current !== undefined) window.clearTimeout(dismissTimer.current)
    dismissTimer.current = undefined
  }, [])

  // Forget hover / focus state. Called on every close path: a popup that unmounts under the pointer
  // never sends pointerleave, so stale "held" flags must not leak into the next popup.
  const resetPopupHold = useCallback(() => {
    pointerInsidePopup.current = false
    focusInsidePopup.current = false
    popupHeld.current = false
    dismissRemaining.current = 0
  }, [])

  // The single popup timer. Every cue goes through here; re-arming always clears the previous one
  // first, so there is never more than one pending and a stale callback cannot fire.
  const armDismiss = useCallback((ms: number) => {
    clearDismissTimer()
    if (ms <= 0) {
      dismissDeadline.current = 0
      return
    }
    dismissDeadline.current = Date.now() + ms
    dismissTimer.current = window.setTimeout(() => {
      dismissTimer.current = undefined
      dismissDeadline.current = 0
      if (popupHeld.current) return // held popups never dismiss under the visitor
      setBubbleOpen(false)
      bubbleOpenRef.current = false
      resetPopupHold()
    }, ms)
  }, [clearDismissTimer, resetPopupHold])

  // Pointer over the popup, or keyboard focus inside it, stops the clock; letting go starts it again
  // with whatever was left (never less than DISMISS_RESUME_MIN_MS, so it cannot vanish instantly).
  const updatePopupHold = useCallback(() => {
    const held = pointerInsidePopup.current || focusInsidePopup.current
    if (held === popupHeld.current) return
    popupHeld.current = held
    if (!bubbleOpenRef.current || thinkingRef.current || dismissBase.current <= 0) return
    if (held) {
      if (dismissTimer.current !== undefined) {
        dismissRemaining.current = Math.max(0, dismissDeadline.current - Date.now())
        clearDismissTimer()
      }
    } else {
      armDismiss(Math.max(dismissRemaining.current, DISMISS_RESUME_MIN_MS))
    }
  }, [armDismiss, clearDismissTimer])

  // Re-read hover / focus from the DOM, for when the popup opens or its buttons are swapped out
  // (a focused button that unmounts sends no blur). :hover is only trusted on hover-capable
  // devices, where touch would leave it stuck on after a tap.
  const syncPopupHold = useCallback(() => {
    const bubble = bubbleRef.current
    if (!bubble) return
    let hovered = false
    let focused = false
    try { hovered = window.matchMedia('(hover: hover)').matches && bubble.matches(':hover') } catch { /* leave false */ }
    try { focused = bubble.querySelector(':focus-visible') !== null } catch { focused = false }
    pointerInsidePopup.current = hovered
    focusInsidePopup.current = focused
    updatePopupHold()
  }, [updatePopupHold])

  const handlePopupPointer = useCallback((inside: boolean) => {
    pointerInsidePopup.current = inside
    updatePopupHold()
  }, [updatePopupHold])

  const handlePopupFocus = useCallback((event: ReactFocusEvent<HTMLElement>) => {
    // Only keyboard focus counts. A mouse click leaves a button focused, and that must not pin the
    // popup open after the pointer has left.
    let keyboard = true
    try { keyboard = event.target.matches(':focus-visible') } catch { /* assume keyboard */ }
    focusInsidePopup.current = keyboard
    updatePopupHold()
  }, [updatePopupHold])

  const handlePopupBlur = useCallback((event: ReactFocusEvent<HTMLElement>) => {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return
    focusInsidePopup.current = false
    updatePopupHold()
  }, [updatePopupHold])

  // Picks the first of the candidates not yet shown this session. When every one has been shown the first is
  // simply repeated: an honest repeat beats an invented "a different angle…" filler line.
  const uniqueMessage = useCallback((candidate: string, alternatives: string[] = []) => {
    const candidates = [candidate, ...alternatives].map(value => value.trim()).filter(Boolean)
    const fresh = candidates.find(value => !usedMessages.current.has(normalizeMessage(value)))
    const chosen = fresh ?? candidates[0] ?? candidate
    usedMessages.current.add(normalizeMessage(chosen))
    saveSessionMemory(usedMessages.current, usedIdeas.current, recentTipMessages.current)
    return chosen
  }, [])

  const presentCue = useCallback((next: Cue, priority: CuePriority, autoHideMs = DISMISS_MS[priority]): boolean => {
    // Ambient chatter never replaces a popup that is up, or an answer Baew is still preparing.
    if (priority === 'ambient' && (bubbleOpenRef.current || thinkingRef.current)) return false
    clearDismissTimer()
    const message = next.verbatim
      ? next.message
      : uniqueMessage(next.message, next.alternatives)
    const cleanCue = { ...next, message, alternatives: undefined }
    setCue(cleanCue)
    setAnimation(cleanCue.animation)
    setThinking(false)
    thinkingRef.current = false
    setBubbleOpen(true)
    bubbleOpenRef.current = true
    dismissBase.current = autoHideMs
    dismissRemaining.current = autoHideMs
    // The clock starts when the answer is actually in front of the visitor. If they are already hovering /
    // focused in the popup, or the tab is in the background, it waits (the visibility effect restarts it).
    if (autoHideMs > 0 && !popupHeld.current && document.visibilityState === 'visible') armDismiss(autoHideMs)
    return true
  }, [armDismiss, clearDismissTimer, uniqueMessage])

  const registerActivity = useCallback(() => {
    lastActivity.current = Date.now()
    setQuiet(false)
    setAnimation(current => current === 'sleeping' ? 'waking' : current)
    if (inactivityTimer.current !== undefined) window.clearTimeout(inactivityTimer.current)
    inactivityTimer.current = window.setTimeout(() => {
      if (Date.now() - lastActivity.current >= 60000) {
        setQuiet(true)
        setAnimation('sleeping')
      }
    }, 61000)
  }, [])

  const presentMenu = useCallback(() => {
    cancelInFlight()
    registerActivity()
    const section = findActiveSection(activeSectionRef.current)
    // The menu line simply cycles through its own list; it never needs the "not shown before" rewriting.
    const line = MENU_LINES[menuLineIndex.current % MENU_LINES.length]
    menuLineIndex.current += 1
    presentCue({
      message: line,
      action: 'Find this section',
      target: section?.id || activeSectionRef.current || 'archive-home',
      animation: 'listening',
      kind: 'menu',
      verbatim: true,
    }, 'user', 15000)
    if (section) activeSectionRef.current = section.id
  }, [cancelInFlight, presentCue, registerActivity])

  // True while Baew should keep quiet on her own: hidden, tab in the background, intro still
  // playing, a popup up or being prepared, a drag in progress, the visitor typing in a field, or
  // any recent activity (including scrolling, keys, touch and pointer movement). Cheap, and only
  // evaluated when a scheduled message is about to fire - nothing polls.
  const ambientBlocked = useCallback(() => {
    if (manualHiddenRef.current || document.visibilityState !== 'visible') return true
    if (bubbleOpenRef.current || thinkingRef.current || dragRef.current) return true
    const now = Date.now()
    if (now - lastActivity.current < AMBIENT_IDLE_MS || now - interactionAt.current < AMBIENT_IDLE_MS) return true
    const widget = widgetRef.current
    if (!widget || getComputedStyle(widget).visibility === 'hidden') return true
    const focused = document.activeElement
    return focused instanceof HTMLElement &&
      !focused.closest('#strobi-widget') &&
      focused.matches('input, textarea, select, [contenteditable=""], [contenteditable="true"]')
  }, [])

  const showCasual = useCallback((force = false) => {
    if (manualHiddenRef.current || document.visibilityState !== 'visible') return false
    if (!force && ambientBlocked()) return false

    const mode = personalityRef.current
    const pool = CASUAL_MESSAGES[mode]
    const available = pool.filter(item => !usedIdeas.current.has(item.idea))
    if (!available.length) return false
    const chosen = available[Math.floor(Math.random() * available.length)]
    const unusedText = chosen.messages.find(message => !usedMessages.current.has(normalizeMessage(message)))
    if (!unusedText) {
      usedIdeas.current.add(chosen.idea)
      saveSessionMemory(usedMessages.current, usedIdeas.current, recentTipMessages.current)
      return showCasual(force)
    }
    usedIdeas.current.add(chosen.idea)
    saveSessionMemory(usedMessages.current, usedIdeas.current, recentTipMessages.current)
    registerActivity()
    // "Surprise me" (force) is something the visitor asked for; the idle scheduler is not.
    presentCue({
      message: unusedText,
      action: 'More help',
      target: activeSectionRef.current || 'archive-home',
      animation: mode === 'freaky' ? 'playful' : 'happy',
      kind: 'casual',
    }, force ? 'user' : 'ambient')
    return true
  }, [ambientBlocked, presentCue, registerActivity])

  // An occasional time-of-day check-in. Rare (>= SPONTANEOUS_MIN_GAP_MS apart), never one of the
  // last few shown, never while the visitor is busy or any popup is up.
  const showSpontaneous = useCallback(() => {
    if (Date.now() - lastSpontaneousAt.current < SPONTANEOUS_MIN_GAP_MS) return false
    if (ambientBlocked()) return false
    const pool = [...SPONTANEOUS_BY_DAYPART[getDayPart()], ...SPONTANEOUS_ANYTIME]
    const fresh = pool.filter(message => !recentSpontaneous.current.includes(message))
    const unseen = fresh.filter(message => !usedMessages.current.has(normalizeMessage(message)))
    const choices = unseen.length ? unseen : fresh
    if (!choices.length) return false
    const message = choices[Math.floor(Math.random() * choices.length)]
    const shown = presentCue({
      message,
      action: 'More help',
      target: activeSectionRef.current || 'archive-home',
      animation: 'happy',
      kind: 'casual',
      verbatim: true,
    }, 'ambient')
    if (!shown) return false
    registerActivity()
    lastSpontaneousAt.current = Date.now()
    recentSpontaneous.current = [...recentSpontaneous.current, message].slice(-SPONTANEOUS_RECENT)
    usedMessages.current.add(normalizeMessage(message))
    saveSessionMemory(usedMessages.current, usedIdeas.current, recentTipMessages.current)
    return true
  }, [ambientBlocked, presentCue, registerActivity])

  // One visitor request, one answer. The local brain always has an answer ready; the online assistant is given
  // up to ONLINE_BUDGET_MS (5 s) to put it in fresher words, after which the local answer is shown and the online
  // request is abandoned. Whatever the online side returns later is ignored, and a newer request, a closed popup
  // or a hidden Baew cancels this one, so an old answer can never replace a newer one.
  const requestHelp = useCallback(async (section: HTMLElement | undefined, options: HelpOptions = {}) => {
    if (manualHiddenRef.current) return
    registerActivity()
    // Volunteered explanations (welcome, section tips) and ones the visitor asked for are both answers, and
    // both stay about eight seconds from the moment they appear.
    const priority: CuePriority = options.automatic ? 'important' : 'user'
    const hour = new Date().getHours()

    if (!section) {
      const generic = brain.respond({ intent: 'welcome', hour })
      cancelInFlight()
      presentCue({
        message: generic.text,
        action: 'Explore the page',
        target: 'archive-home',
        animation: 'excited',
        kind: 'casual',
        verbatim: true,
      }, priority)
      return
    }

    const sectionId = section.id
    const title = getSectionTitle(section)
    activeSectionRef.current = sectionId
    if (options.automatic) seenSections.current.add(sectionId)

    cancelInFlight()
    const intent: PromptIntent = options.welcome ? 'welcome' : options.deeper ? 'deeper' : 'explain'
    const entry = brain.entryForDomId(sectionId)
    // Page text is only read for a section the knowledge does not describe; described sections never need it.
    const sectionText = entry ? '' : getSectionText(section)
    const answer: BrainAnswer = brain.respond({ intent, domId: sectionId, title, text: sectionText, progress: progressRef.current, hour })

    // Progress is recorded only once the answer is actually on screen, so a dropped answer costs nothing.
    const show = (text: string) => {
      const shown = presentCue(answerCue(text, sectionId, personalityRef.current), priority)
      if (!shown) return
      if (answer.next) {
        progressRef.current = { ...progressRef.current, [answer.next.entryId]: answer.next.progress }
        saveProgress(progressRef.current)
      }
      recentTipMessages.current.push(text)
      if (recentTipMessages.current.length > 12) recentTipMessages.current.shift()
      saveSessionMemory(usedMessages.current, usedIdeas.current, recentTipMessages.current)
    }

    // Gated and chat areas, owner-approved wording, nothing safe to send, or no connection: answer at once.
    if (!answer.onlineEligible || navigator.onLine === false) {
      show(answer.text)
      return
    }

    const currentRequest = requestId.current
    activeRequestSection.current = sectionId
    thinkingRef.current = true
    setThinking(true)
    setBubbleOpen(true)
    bubbleOpenRef.current = true
    clearDismissTimer()
    setAnimation('listening')
    messageSerial.current += 1
    setCue({
      message: THINKING_LINES[messageSerial.current % THINKING_LINES.length],
      action: 'Find this section',
      target: sectionId,
      animation: 'listening',
      kind: 'tip',
      verbatim: true,
    })

    const prompt = buildPrompt({
      intent,
      answer: entry ? answer.text : null,
      grounding: entry ? brain.grounding(entry.id) : null,
      title: entry?.title ?? title,
      pageText: sectionText,
      recent: recentTipMessages.current.slice(-4),
    })
    const handle = startHandoff({
      online: signal => askOnline(prompt, signal),
      local: answer.text,
      offline: () => navigator.onLine === false,
      accept: raw => {
        const reply = sanitizeReply(raw)
        // An online reply that only repeats something already said is no better than the local answer.
        return reply && !recentTipMessages.current.some(previous => normalizeMessage(previous) === normalizeMessage(reply)) ? reply : null
      },
    })
    activeHandoff.current = handle

    const result = await handle.result
    // `null` means a newer request, a closed popup or a hidden Baew cancelled this one: show nothing.
    if (!result || currentRequest !== requestId.current || manualHiddenRef.current) return
    activeHandoff.current = null
    activeRequestSection.current = null
    show(result.text)
  }, [cancelInFlight, clearDismissTimer, presentCue, registerActivity])

  const closeBubble = useCallback(() => {
    clearDismissTimer()
    cancelInFlight()
    setBubbleOpen(false)
    bubbleOpenRef.current = false
    resetPopupHold()
    registerActivity()
  }, [cancelInFlight, clearDismissTimer, registerActivity, resetPopupHold])

  const scrollToTarget = useCallback((target: string) => {
    document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    activeSectionRef.current = target
  }, [])

  const switchPersonality = useCallback((mode: Personality) => {
    personalityRef.current = mode
    setPersonality(mode)
    registerActivity()
  }, [registerActivity])

  const handleMascotClick = useCallback(() => {
    if (dragMovedRef.current) {
      dragMovedRef.current = false
      return
    }
    presentMenu()
  }, [presentMenu])

  const handleDragStart = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || event.isPrimary === false) return
    const rect = widgetRef.current?.getBoundingClientRect()
    if (!rect) return
    event.preventDefault()
    dragMovedRef.current = false
    setDragging(true)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      moved: false,
    }
    try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* capture is optional */ }
  }, [])

  const handleDragMove = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY
    if (!drag.moved && Math.hypot(deltaX, deltaY) < 6) return
    drag.moved = true
    dragMovedRef.current = true
    const width = widgetRef.current?.getBoundingClientRect().width ?? 188
    const height = widgetRef.current?.getBoundingClientRect().height ?? 90
    const next = clampPosition(drag.startLeft + deltaX, drag.startTop + deltaY, width, height)
    positionRef.current = next
    setPosition(next)
  }, [])

  const handleDragEnd = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    const wasMoved = dragRef.current.moved
    dragRef.current = null
    setDragging(false)
    if (!wasMoved) dragMovedRef.current = false
    if (wasMoved) registerActivity()
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    } catch { /* pointer may already have been released */ }
  }, [registerActivity])

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        ratios.current.set(entry.target as HTMLElement, entry.isIntersecting ? entry.intersectionRatio : 0)
      }
      const current = Array.from(ratios.current.entries())
        .filter(([, ratio]) => ratio > 0)
        .sort((a, b) => b[1] - a[1])[0]?.[0]
      if (!current) return
      activeSectionRef.current = current.id
      if (!introShown.current || manualHiddenRef.current || seenSections.current.has(current.id)) return

      if (sectionTimer.current !== undefined) window.clearTimeout(sectionTimer.current)
      const sectionId = current.id
      const scheduleTry = () => {
        sectionTimer.current = window.setTimeout(() => {
          const mostVisible = Array.from(ratios.current.entries())
            .filter(([, ratio]) => ratio > 0)
            .sort((a, b) => b[1] - a[1])[0]?.[0]
          if (manualHiddenRef.current || mostVisible?.id !== sectionId || seenSections.current.has(sectionId)) return
          if (bubbleOpenRef.current || thinkingRef.current || dragRef.current) {
            scheduleTry()
            return
          }
          const section = getGuideSections().find(item => item.id === sectionId)
          if (section) void requestHelp(section, { automatic: true })
        }, 1400)
      }
      scheduleTry()
    }, { threshold: [0, 0.25, 0.45, 0.65, 0.8] })

    const observed = new WeakSet<HTMLElement>()
    const observeNewSections = () => {
      for (const section of getGuideSections()) {
        if (observed.has(section)) continue
        observed.add(section)
        ratios.current.set(section, 0)
        observer.observe(section)
      }
    }
    observeNewSections()
    const mutationObserver = new MutationObserver(observeNewSections)
    mutationObserver.observe(document.body, { childList: true, subtree: true })

    // The welcome. Baew is held hidden by the page while the cinematic intro plays (html.jaye-intro-active hides
    // everything behind it), so a welcome started on a fixed timer would be shown and dismissed unseen. Instead
    // this waits until Baew can actually be seen, then waits WELCOME_DELAY_MS more, so the eight-second popup
    // starts on screen. It re-checks if the intro ends, the tab comes back, or Baew is restored.
    const root = document.documentElement
    let welcomeTimer: number | undefined
    const baewVisible = () => {
      if (root.classList.contains('jaye-intro-active') || document.visibilityState !== 'visible') return false
      const widget = widgetRef.current
      return Boolean(widget) && getComputedStyle(widget as HTMLElement).visibility !== 'hidden'
    }
    const stopWatching = () => {
      window.clearTimeout(welcomeTimer)
      classWatcher.disconnect()
      document.removeEventListener('visibilitychange', armWelcome)
    }
    const showWelcome = () => {
      if (introShown.current || manualHiddenRef.current) return
      if (!baewVisible()) { armWelcome(); return }
      introShown.current = true
      stopWatching()
      const sections = getRenderableSections()
      const onScreen = sections.find(section => {
        const rect = section.getBoundingClientRect()
        return rect.top < window.innerHeight && rect.bottom > 0
      })
      const section = onScreen || sections[0]
      if (section) {
        seenSections.current.add(section.id)
        void requestHelp(section, { welcome: true, automatic: true })
      } else {
        void requestHelp(undefined, { welcome: true, automatic: true })
      }
    }
    function armWelcome() {
      window.clearTimeout(welcomeTimer)
      if (introShown.current || manualHiddenRef.current || !baewVisible()) return
      welcomeTimer = window.setTimeout(showWelcome, WELCOME_DELAY_MS)
    }
    const classWatcher = new MutationObserver(armWelcome)
    classWatcher.observe(root, { attributes: true, attributeFilter: ['class'] })
    document.addEventListener('visibilitychange', armWelcome)
    armWelcome()

    const onPagePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return
      if (event.target.closest('#strobi-widget, #strobi-widget-root, .restore-strobi, [data-strobi-ignore]')) return
      // Normal page taps count as activity only. They must never move Baew or open a bubble.
      registerActivity()
    }
    const onWheel = () => {
      // Wheel events fire repeatedly while scrolling; throttle activity updates.
      if (Date.now() - lastActivity.current > 1200) registerActivity()
    }
    const onResize = () => {
      if (!positionRef.current) return
      const rect = widgetRef.current?.getBoundingClientRect()
      const next = clampPosition(positionRef.current.left, positionRef.current.top, rect?.width, rect?.height)
      positionRef.current = next
      setPosition(next)
    }

    document.addEventListener('pointerdown', onPagePointerDown, true)
    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('resize', onResize)
    registerActivity()

    return () => {
      stopWatching()
      if (sectionTimer.current !== undefined) window.clearTimeout(sectionTimer.current)
      observer.disconnect()
      mutationObserver.disconnect()
      document.removeEventListener('pointerdown', onPagePointerDown, true)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('resize', onResize)
    }
  }, [presentCue, registerActivity, requestHelp])

  useEffect(() => {
    const scheduleNext = (delay = 38000 + Math.random() * 35000) => {
      if (casualTimer.current !== undefined) window.clearTimeout(casualTimer.current)
      casualTimer.current = window.setTimeout(() => {
        if (manualHiddenRef.current) {
          scheduleNext(45000 + Math.random() * 30000)
          return
        }
        if (document.visibilityState !== 'visible') {
          scheduleNext(30000)
          return
        }
        // Busy (popup up, typing, scrolling, dragging...): try again a little later.
        if (ambientBlocked()) {
          scheduleNext(AMBIENT_IDLE_MS + Math.random() * 15000)
          return
        }
        // The rare time-of-day check-in when its gap allows, otherwise the usual idle hello.
        if (!showSpontaneous()) showCasual(false)
        scheduleNext(42000 + Math.random() * 40000)
      }, delay)
    }
    scheduleNext()
    return () => {
      if (casualTimer.current !== undefined) window.clearTimeout(casualTimer.current)
    }
  }, [ambientBlocked, showCasual, showSpontaneous])

  // Real use of the page (scrolling, keys, touch, pointer movement) postpones unprompted messages.
  // Only a timestamp is written, so an event costs nothing and there is no polling.
  useEffect(() => {
    const mark = () => { interactionAt.current = Date.now() }
    const events = ['pointerdown', 'pointermove', 'touchstart', 'touchmove', 'wheel', 'keydown', 'scroll'] as const
    const options = { capture: true, passive: true } as const
    events.forEach(name => window.addEventListener(name, mark, options))
    return () => events.forEach(name => window.removeEventListener(name, mark, options))
  }, [])

  // An answer's clock runs only while the page is in front of the visitor. A popup that appears (or is up) while
  // the tab is in the background waits, and the clock starts or resumes when the tab returns.
  useEffect(() => {
    const onVisibility = () => {
      if (!bubbleOpenRef.current || thinkingRef.current || dismissBase.current <= 0 || popupHeld.current) return
      if (document.visibilityState === 'hidden') {
        if (dismissTimer.current !== undefined) {
          dismissRemaining.current = Math.max(0, dismissDeadline.current - Date.now())
          clearDismissTimer()
        }
      } else if (dismissTimer.current === undefined) {
        armDismiss(Math.max(dismissRemaining.current, DISMISS_RESUME_MIN_MS))
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [armDismiss, clearDismissTimer])

  // Idle float. Self-contained so drag, hide/restore and the bubble logic stay exactly as they were.
  // After a quiet spell Baew glides to a random free spot; any real interaction stops it in place.
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const canHover = window.matchMedia('(hover: hover)')
    const recentTargets: Position[] = []
    let timer: number | undefined
    let settleTimer: number | undefined
    let gliding = false
    let stopIntroWait: (() => void) | undefined
    let lastInteraction = Date.now()
    let pointer = { x: -9999, y: -9999, mouse: false }

    const schedule = (delay: number) => {
      if (timer !== undefined) window.clearTimeout(timer)
      timer = window.setTimeout(check, delay)
    }

    // Stop a glide right where Baew currently is: pin left/top to the live, mid-flight position
    // and drop the slow transition. flushSync makes it land before the interaction that caused it.
    const freeze = (sync = true) => {
      if (!gliding) return
      gliding = false
      window.clearTimeout(settleTimer)
      const rect = widgetRef.current?.getBoundingClientRect()
      const here = rect ? clampPosition(rect.left, rect.top, rect.width, rect.height) : null
      const apply = () => {
        setFloatMs(null)
        if (here) {
          positionRef.current = here
          setPosition(here)
        }
      }
      if (sync) flushSync(apply)
      else apply()
      schedule(FLOAT_IDLE_MS + 50)
    }
    floatFreezeRef.current = freeze

    const onInteract = () => {
      lastInteraction = Date.now()
      freeze()
    }
    const onPointerMove = (event: PointerEvent) => {
      // Browsers can replay a synthetic move when the layout shifts under a resting cursor; only
      // a real change of position counts as the visitor doing something.
      const moved = Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) >= 3
      pointer = { x: event.clientX, y: event.clientY, mouse: event.pointerType === 'mouse' }
      if (moved) onInteract()
    }
    const onPointerOver = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest('#strobi-widget')) freeze()
    }
    const onVisibility = () => { if (document.visibilityState !== 'visible') freeze() }
    const onMotionPreference = () => { if (reducedMotion.matches) freeze() }

    const hasKeyboardFocus = (widget: HTMLElement) => {
      try { return widget.querySelector(':focus-visible') !== null } catch { return widget.contains(document.activeElement) }
    }
    const isBusy = () => {
      const widget = widgetRef.current
      if (!widget) return true // hidden by the visitor
      if (reducedMotion.matches || document.visibilityState !== 'visible') return true
      if (dragRef.current || bubbleOpenRef.current || thinkingRef.current) return true
      if (canHover.matches && widget.matches(':hover')) return true
      return hasKeyboardFocus(widget)
    }

    // A random on-screen spot, far enough from here and from recent stops to feel varied, whose
    // visible footprint (the mascot and its label) clears every on-screen control and the cursor.
    const pickTarget = (): { target: Position; distance: number } | null => {
      const widget = widgetRef.current
      const wrap = widget?.querySelector<HTMLElement>('.strobi-mascot-wrap')
      if (!widget || !wrap) return null
      const viewWidth = document.documentElement.clientWidth
      const viewHeight = document.documentElement.clientHeight
      const box = widget.getBoundingClientRect()
      const wrapBox = wrap.getBoundingClientRect()
      const offsetX = wrapBox.left - box.left
      const offsetY = wrapBox.top - box.top
      const maxLeft = viewWidth - box.width - FLOAT_EDGE_MARGIN
      const maxTop = viewHeight - box.height - FLOAT_EDGE_MARGIN
      if (maxLeft <= FLOAT_EDGE_MARGIN || maxTop <= FLOAT_EDGE_MARGIN) return null
      const minTravel = Math.min(320, Math.hypot(viewWidth, viewHeight) * 0.16)
      const controls = getControlBoxes(viewWidth, viewHeight)

      for (let attempt = 0; attempt < 32; attempt += 1) {
        const left = FLOAT_EDGE_MARGIN + Math.random() * (maxLeft - FLOAT_EDGE_MARGIN)
        const top = FLOAT_EDGE_MARGIN + Math.random() * (maxTop - FLOAT_EDGE_MARGIN)
        const distance = Math.hypot(left - box.left, top - box.top)
        if (distance < minTravel) continue
        if (recentTargets.some(spot => Math.hypot(spot.left - left, spot.top - top) < minTravel * 0.6)) continue
        const footprint: Box = {
          left: left + offsetX - FLOAT_AVOID_PAD,
          top: top + offsetY - FLOAT_AVOID_PAD,
          right: left + offsetX + wrapBox.width + FLOAT_AVOID_PAD,
          bottom: top + offsetY + wrapBox.height + FLOAT_AVOID_PAD,
        }
        if (
          pointer.mouse &&
          pointer.x > footprint.left - 24 && pointer.x < footprint.right + 24 &&
          pointer.y > footprint.top - 24 && pointer.y < footprint.bottom + 24
        ) continue
        if (controls.some(control => overlapArea(footprint, control) > 0)) continue
        return { target: { left, top }, distance }
      }
      return null
    }

    const glide = (target: Position, distance: number) => {
      const widget = widgetRef.current
      if (!widget) return
      if (!positionRef.current) {
        // Still anchored to the CSS corner. Pin it to explicit left/top without moving it, so the
        // first glide has a real starting point to animate from.
        const rect = widget.getBoundingClientRect()
        const start = clampPosition(rect.left, rect.top, rect.width, rect.height)
        positionRef.current = start
        flushSync(() => setPosition(start))
        void widget.offsetWidth
      }
      const duration = Math.round(Math.min(FLOAT_MAX_MS, Math.max(FLOAT_MIN_MS, distance * FLOAT_MS_PER_PX)))
      gliding = true
      positionRef.current = target
      setFloatMs(duration)
      setPosition(target)
      settleTimer = window.setTimeout(() => {
        gliding = false
        setFloatMs(null)
        recentTargets.push(target)
        if (recentTargets.length > 3) recentTargets.shift()
        schedule(FLOAT_REST_MIN_MS + Math.random() * (FLOAT_REST_MAX_MS - FLOAT_REST_MIN_MS))
      }, duration + 150)
    }

    const check = () => {
      timer = undefined
      // Baew is hidden while the page's opening intro plays. Idle time only counts once she can
      // be seen, so she greets from her corner first and drifts off ~9s after appearing.
      const widget = widgetRef.current
      if (introActive()) {
        lastInteraction = Date.now()
        if (!stopIntroWait) {
          stopIntroWait = afterIntro(() => {
            stopIntroWait = undefined
            lastInteraction = Date.now()
            schedule(FLOAT_IDLE_MS + 50)
          })
        }
        return
      }
      if (widget && getComputedStyle(widget).visibility === 'hidden') {
        lastInteraction = Date.now()
        schedule(1000)
        return
      }
      const idleFor = Date.now() - lastInteraction
      if (idleFor < FLOAT_IDLE_MS) { schedule(FLOAT_IDLE_MS - idleFor + 50); return }
      if (isBusy()) { schedule(1500); return }
      const pick = pickTarget()
      if (!pick) { schedule(4000); return }
      glide(pick.target, pick.distance)
    }

    const listen = { capture: true, passive: true } as const
    const interactionEvents = ['pointerdown', 'touchstart', 'touchmove', 'wheel', 'keydown', 'focusin'] as const
    interactionEvents.forEach(name => window.addEventListener(name, onInteract, listen))
    window.addEventListener('pointermove', onPointerMove, listen)
    window.addEventListener('pointerover', onPointerOver, listen)
    window.addEventListener('scroll', onInteract, { passive: true })
    window.addEventListener('resize', onInteract)
    document.addEventListener('visibilitychange', onVisibility)
    reducedMotion.addEventListener('change', onMotionPreference)
    schedule(FLOAT_IDLE_MS)

    return () => {
      if (timer !== undefined) window.clearTimeout(timer)
      window.clearTimeout(settleTimer)
      stopIntroWait?.()
      interactionEvents.forEach(name => window.removeEventListener(name, onInteract, listen))
      window.removeEventListener('pointermove', onPointerMove, listen)
      window.removeEventListener('pointerover', onPointerOver, listen)
      window.removeEventListener('scroll', onInteract)
      window.removeEventListener('resize', onInteract)
      document.removeEventListener('visibilitychange', onVisibility)
      reducedMotion.removeEventListener('change', onMotionPreference)
      floatFreezeRef.current = () => {}
    }
  }, [])

  // Home clearance. Self-contained like the idle float: it only ever touches a Baew who is still at her
  // CSS home, and stands down for good the moment she has been dragged or has floated off. It never
  // writes left/top, only the two offsets the home rule in widget.css reads, so the corner stays the
  // anchor (resize, rotation and safe areas keep working) and drag / float / popups are untouched.
  // While she is hidden the same check keeps the small "Baew" restore pill off the page content too.
  useEffect(() => {
    const pill = hidden
    const shiftRef = pill ? pillShiftRef : homeShiftRef
    const setShift = pill ? setPillShift : setHomeShift
    let timer: number | undefined
    let placed = false
    let stopIntroWait: (() => void) | undefined
    let relayout = false // the viewport or fonts changed: pick the nearest clear spot afresh

    const schedule = (delay: number) => {
      if (timer !== undefined) window.clearTimeout(timer)
      timer = window.setTimeout(check, delay)
    }

    const check = () => {
      timer = undefined
      const widget = pill ? pillRef.current : widgetRef.current
      if (!widget || (!pill && positionRef.current)) return
      if (introActive()) { // opening intro: wait for it to end instead of polling
        if (!stopIntroWait) stopIntroWait = afterIntro(() => { stopIntroWait = undefined; schedule(100) })
        return
      }
      if (getComputedStyle(widget).visibility === 'hidden') { schedule(500); return }
      if (!pill && (dragRef.current || bubbleOpenRef.current || thinkingRef.current)) { schedule(900); return }
      const wrap = pill ? widget : widget.querySelector<HTMLElement>('.strobi-mascot-wrap')
      if (!wrap) return
      const viewWidth = document.documentElement.clientWidth
      const viewHeight = document.documentElement.clientHeight
      const box = widget.getBoundingClientRect()
      const current = shiftRef.current
      const parts = [wrap, pill ? null : widget.querySelector<HTMLElement>('.hide-strobi')]
        .filter((part): part is HTMLElement => part !== null)
        .map(part => part.getBoundingClientRect())
      const footprint: Box = {
        left: Math.min(...parts.map(part => part.left)) - box.left,
        top: Math.min(...parts.map(part => part.top)) - box.top,
        right: Math.max(...parts.map(part => part.right)) - box.left,
        bottom: Math.max(...parts.map(part => part.bottom)) - box.top,
      }
      const home = { left: box.left - current.dx, top: box.top + current.lift, width: box.width }
      const keep = relayout ? { dx: 0, lift: 0 } : current
      relayout = false
      const next = findHomeShift(footprint, home, viewWidth, getContentBoxes(viewWidth, viewHeight), keep)
      if (Math.abs(next.dx - current.dx) > 0.5 || Math.abs(next.lift - current.lift) > 0.5) {
        shiftRef.current = next
        if (placed) {
          setShift(next)
        } else {
          // First placement: she is only just appearing, so put her there without a slide.
          widget.style.transition = 'none'
          flushSync(() => setShift(next))
          void widget.offsetWidth
          widget.style.transition = ''
        }
      }
      if (!placed) {
        placed = true
        schedule(1500) // once more after the page's own entrance motion has settled
      }
    }

    const onScroll = () => schedule(HOME_SETTLE_MS)
    const onResize = () => { relayout = true; schedule(HOME_SETTLE_MS) }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    void document.fonts?.ready.then(() => { relayout = true; schedule(150) })
    schedule(pill ? 60 : 600)

    return () => {
      if (timer !== undefined) window.clearTimeout(timer)
      stopIntroWait?.()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [hidden])

  // A bubble opening (casual hello, menu, thinking) means Baew has something to say: stand still.
  useEffect(() => {
    if (bubbleOpen || thinking) floatFreezeRef.current(false)
  }, [bubbleOpen, thinking])

  // Popup hover / focus bookkeeping: re-read it whenever the popup opens or its content changes,
  // and clear it once the popup is gone.
  useEffect(() => {
    if (bubbleOpen) syncPopupHold()
    else resetPopupHold()
  }, [bubbleOpen, cue, thinking, syncPopupHold, resetPopupHold])

  useEffect(() => {
    if (!position || !widgetRef.current) return
    const rect = widgetRef.current.getBoundingClientRect()
    const next = clampPosition(position.left, position.top, rect.width, rect.height)
    if (Math.abs(next.left - position.left) > 1 || Math.abs(next.top - position.top) > 1) {
      positionRef.current = next
      setPosition(next)
    }
  }, [position, bubbleOpen, cue.message, thinking])

  useEffect(() => () => {
    if (inactivityTimer.current !== undefined) window.clearTimeout(inactivityTimer.current)
    if (sectionTimer.current !== undefined) window.clearTimeout(sectionTimer.current)
    if (casualTimer.current !== undefined) window.clearTimeout(casualTimer.current)
    clearDismissTimer()
    cancelInFlight()
  }, [cancelInFlight, clearDismissTimer])

  const activeTitle = targetTitle(cue.target)
  const widgetStyle: CSSProperties | undefined = position
    ? ({
        left: `${position.left}px`,
        top: `${position.top}px`,
        right: 'auto',
        bottom: 'auto',
        ...(floatMs !== null ? { '--strobi-float-ms': `${floatMs}ms` } : {}),
      } as CSSProperties)
    : homeShift.dx > 0 || homeShift.lift > 0
      ? ({ '--strobi-home-dx': `${homeShift.dx}px`, '--strobi-home-lift': `${homeShift.lift}px` } as CSSProperties)
      : undefined

  const modeSwitch = (
    <div className="bubble-modes" role="group" aria-label="Baew personality mode">
      <button className={`mode-pill ${personality === 'playful' ? 'is-active' : ''}`} aria-pressed={personality === 'playful'} onClick={() => switchPersonality('playful')}>Playful</button>
      <button className={`mode-pill ${personality === 'freaky' ? 'is-active' : ''}`} aria-pressed={personality === 'freaky'} onClick={() => switchPersonality('freaky')}>Freaky</button>
    </div>
  )

  return (
    <>
      {!hidden && (
        <div
          ref={widgetRef}
          id="strobi-widget"
          className={`strobi-widget ${quiet ? 'is-quiet' : ''} ${bubbleOpen ? 'bubble-open' : ''} ${position ? 'is-positioned' : ''} ${dragging ? 'is-dragging' : ''} ${floatMs !== null ? 'is-floating' : ''}`}
          aria-label="Baew website guide"
          data-vibe={personality}
          style={widgetStyle}
        >
          {bubbleOpen && (
            <section
              ref={bubbleRef}
              className={`strobi-bubble ${cue.kind === 'menu' ? 'is-menu' : ''}`}
              aria-live="polite"
              aria-label="Baew Tips"
              onPointerEnter={() => handlePopupPointer(true)}
              onPointerLeave={() => handlePopupPointer(false)}
              onFocus={handlePopupFocus}
              onBlur={handlePopupBlur}
            >
              <button className="bubble-close" aria-label="Dismiss Baew hint" onClick={closeBubble}>×</button>
              <div className="bubble-scroll">
              <div className="bubble-heading-row">
                <div className="bubble-label">
                  <span className="bubble-pulse" />
                  Baew
                  <span className="bubble-kind">· {thinking ? 'thinking' : cue.kind === 'menu' ? 'help' : cue.kind === 'casual' ? 'aside' : 'note'}</span>
                </div>
                <span className="bubble-context">{activeTitle}</span>
              </div>
              <p>{renderMessage(cue.message)}</p>

              {cue.kind === 'menu' ? (
                <div className="quick-help-actions">
                  <button className="bubble-primary" onClick={() => void requestHelp(findActiveSection(activeSectionRef.current), {})}>Explain this section</button>
                  <button className="bubble-primary" onClick={() => void requestHelp(findActiveSection(activeSectionRef.current), { deeper: true })}>Go deeper</button>
                  <button className="bubble-secondary" onClick={() => { showCasual(true) }}>Surprise me</button>
                  {modeSwitch}
                </div>
              ) : (
                <div className="bubble-actions">
                  {cue.kind === 'tip' && (
                    <button className="bubble-primary" onClick={() => {
                      const target = cue.target
                      closeBubble()
                      scrollToTarget(target)
                    }}>{cue.action} <span aria-hidden="true">↗</span></button>
                  )}
                  {cue.kind === 'casual' && (
                    <button className="bubble-primary" onClick={presentMenu}>More help <span aria-hidden="true">↗</span></button>
                  )}
                  <button className="bubble-secondary" onClick={closeBubble}>Got it</button>
                  {modeSwitch}
                </div>
              )}
              </div>
            </section>
          )}

          <div className="strobi-mascot-wrap">
            <button
              className="hide-strobi"
              aria-label="Hide Baew"
              title="Hide Baew"
              onClick={() => {
                manualHiddenRef.current = true
                clearDismissTimer()
                resetPopupHold()
                cancelInFlight()
                setHidden(true)
                setBubbleOpen(false)
                bubbleOpenRef.current = false
              }}
            >×</button>

            <button
              className="strobi-mascot"
              aria-label="Open Baew help menu"
              aria-expanded={bubbleOpen}
              title="Drag to move · tap for help"
              onPointerDown={handleDragStart}
              onPointerMove={handleDragMove}
              onPointerUp={handleDragEnd}
              onPointerCancel={handleDragEnd}
              onClick={handleMascotClick}
            >
              <span className="mascot-glow" />
              <span className="mascot-avatar">
                <Avatar animation={animation} size="100%" ariaLabel="Baew animated avatar" />
              </span>
            </button>
            {!bubbleOpen && <span className="tap-label">Baew Tips · tap for help</span>}
          </div>
        </div>
      )}

      {hidden && (
        <button
          ref={pillRef}
          className="restore-strobi"
          style={pillShift.dx > 0 || pillShift.lift > 0
            ? ({ '--strobi-pill-dx': `${pillShift.dx}px`, '--strobi-pill-lift': `${pillShift.lift}px` } as CSSProperties)
            : undefined}
          onClick={() => {
            manualHiddenRef.current = false
            introShown.current = true
            setHidden(false)
            registerActivity()
            window.setTimeout(presentMenu, 0)
          }}
          aria-label="Show Baew again"
        >
          <span className="restore-dot" /> Baew
        </button>
      )}
    </>
  )
}
