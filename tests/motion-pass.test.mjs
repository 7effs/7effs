import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Guards for the motion pass: press feedback, the Baew flick and the eased Saturn-doorway parallax. The behaviour itself (timing,
// release, drift, bounds, reduced motion, touch) was exercised in a browser; these keep the shape and the things that must not change.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const tsx = readFileSync(new URL('../src/StrobiGuide.tsx', import.meta.url), 'utf8')
const widgetCss = readFileSync(new URL('../src/widget.css', import.meta.url), 'utf8')
const bundleJs = readFileSync(new URL('../strobi-widget.js', import.meta.url), 'utf8')
const bundleCss = readFileSync(new URL('../strobi-widget.css', import.meta.url), 'utf8')
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '')
const press = strip(html.match(/<script id="jaye-press-feedback-v1">([\s\S]*?)<\/script>/)?.[1] ?? '')
const motion = strip(html.match(/<script id="jaye-definitive-motion-v3">([\s\S]*?)<\/script>/)?.[1] ?? '')

test('press feedback is one delegated listener driving the compositor-friendly scale property', () => {
  assert.equal((html.match(/<script id="jaye-press-feedback-v1">/g) ?? []).length, 1)
  assert.equal((press.match(/document\.addEventListener\('pointerdown'/g) ?? []).length, 1, 'one delegated listener, not one per control')
  assert.match(press, /\.animate\(\{scale:frames\}/, 'WAAPI on the independent scale property')
  // the pointerdown handler only looks the control up: the style + layout read is cached per control and the return reads the animation
  const down = press.slice(press.indexOf("document.addEventListener('pointerdown'"))
  assert.doesNotMatch(down.slice(0, down.indexOf('if(e.pointerType===')), /getComputedStyle|getBoundingClientRect|getAnimations/, 'no forced style or layout inside the pointerdown dispatch')
  assert.match(press, /meta=new WeakMap\(\)/)
  assert.doesNotMatch(press.slice(press.indexOf('function giveBack'), press.indexOf('function end')), /getComputedStyle/, 'release reads the animation, not the style')
  assert.doesNotMatch(press, /requestAnimationFrame|setInterval|\.style\.|transition|will-change|import\b|fetch\(|https?:\/\//, 'no loop, no inline styles, no library, no network')
  assert.equal((press.match(/\.animate\(/g) ?? []).length, 1, 'every animation goes through the one play() helper, which only ever animates scale')
  assert.match(press, /cubic-bezier\(\.23,1,\.32,1\)/, 'strong ease-out')
})

test('press feedback leaves controls that have their own press state alone and respects reduced motion', () => {
  for (const skip of ['.sound-button', '#jaye-background-switch', '.strobi-mascot', '.bubble-primary', '[disabled]', '[aria-disabled="true"]', '#jaye-intro-v1'])
    assert.ok(press.includes(skip), `skips ${skip}`)
  // the existing press states are still there, untouched
  assert.match(html, /\.sound-button:active\{transform:scale\(\.95\)\}/)
  assert.match(html, /#jaye-background-switch:active\{/)
  assert.match(widgetCss, /\.bubble-primary:active\s*\{\s*transform:\s*translateY\(1px\)/)
  assert.match(widgetCss, /\.strobi-mascot:active\s*\{\s*cursor:\s*grabbing/)
  assert.match(press, /calm\.matches/, 'reduced motion is read at press time')
  assert.match(press, /prefers-reduced-motion: reduce/)
  assert.match(press, /cs\.scale==='none'/, 'a control that already sets its own scale is not touched')
  assert.match(press, /cs\.display!=='inline'/, 'inline text links are not transformed')
})

test('press feedback: touch waits 70 ms, drift lets go, tap still pulses, depth is size-aware', () => {
  assert.match(press, /TOUCH_DELAY=70/)
  assert.match(press, /MOVE_LIMIT=8/)
  assert.match(press, /MIN_HOLD=90/)
  assert.match(press, /isPrimary/, 'multi-touch protection')
  assert.match(press, /pointercancel/)
  assert.match(press, /Math\.min\(\.04,6\/big\)/, 'about 3px of travel per edge, never more than 4%')
  assert.match(press, /\[String\(st\.from\),String\(st\.to\),'1'\],260/, 'a tap that ends inside the delay still pulses once')
  assert.match(press, /,140\)/)
  assert.match(press, /,200\)/)
})

test('Baew flick: velocity-gated, bounded, stops inside the screen, never under reduced motion', () => {
  for (const [name, v] of [['FLICK_WINDOW_MS', 100], ['FLICK_STALE_MS', 80], ['FLICK_MIN_SPEED', 0.45], ['FLICK_PROJECT_MS', 200], ['FLICK_MAX_PX', 260], ['FLICK_MIN_PX', 14]])
    assert.match(tsx, new RegExp(`const ${name} = ${v}\\b`), name)
  assert.match(tsx, /prefers-reduced-motion: reduce/)
  assert.match(tsx, /if \(wasMoved && event\.type === 'pointerup'\) flick\(drag, event\.timeStamp\)/, 'a cancelled gesture (the browser scrolling) never throws her')
  assert.match(tsx, /clampPosition\(here\.left \+ \(vx \/ speed\) \* reach/, 'the landing point goes through the same screen clamp as dragging')
  assert.match(tsx, /Grabbed mid-coast/, 'grabbing her mid-coast pins her where she is')
  assert.match(tsx, /flickTimerRef\.current = window\.setTimeout/)
})

test('Baew flick uses the existing left/top glide machinery with its own strong ease-out; nothing else in the widget changed', () => {
  assert.match(widgetCss, /\.strobi-widget\.is-flicking\s*\{[^}]*transition:\s*left var\(--strobi-flick-ms, 520ms\) cubic-bezier\(\.23, 1, \.32, 1\)/)
  // the idle glide, the dragging rule and the mascot rules are all still there
  assert.match(widgetCss, /\.strobi-widget\.is-floating\s*\{[^}]*cubic-bezier\(\.37, 0, \.63, 1\)/)
  assert.match(widgetCss, /\.strobi-widget\.is-dragging\s*\{\s*transition:\s*none !important/)
  assert.match(widgetCss, /\.strobi-widget\.is-dragging \.strobi-mascot\s*\{[^}]*animation:\s*none !important/)
  assert.match(tsx, /handleDragStart[\s\S]*?setPointerCapture/)
  assert.match(tsx, /if \(dragMovedRef\.current\) \{\s*dragMovedRef\.current = false\s*return/, 'a drag still never opens the menu')
})

test('the built Baew bundle carries the flick (so the page that ships has it)', () => {
  assert.match(bundleCss, /is-flicking/)
  assert.match(bundleJs, /is-flicking/)
  assert.match(bundleJs, /--strobi-flick-ms/)
})

test('Saturn doorway stays fixed and does not follow pointer movement', () => {
  assert.match(motion, /function follow\\(host, target, nameX, nameY\\)/)
  assert.equal((motion.match(/requestAnimationFrame\\(/g) ?? []).length, 2, 'the hero parallax keeps its single armed loop')
  assert.match(motion, /if\\(!raf\\)\\{last = performance\\.now\\(\\);raf = requestAnimationFrame\\(tick\\);\\}/, 'a second loop can never start while one is armed')
  assert.match(motion, /raf = 0;return/, 'the loop ends once it has arrived')
  assert.match(motion, /Math\\.exp\\(-dt\\*9\\)/, 'the hero easing remains unchanged')
  assert.match(motion, /if \\(reduce \\|\\| !hover\\) return;/, 'the hero effect stays gated to fine hover pointers and reduced motion')
  assert.match(motion, /follow\\(hero, artifact, '--px', '--py'\\)/, 'the hero artifact keeps its existing pointer effect')
  assert.doesNotMatch(motion, /saturnEntry|--saturn-x|--saturn-y/, 'Saturn is not registered with the pointer-follow handler')
  assert.match(html, /\\.parent-entry-saturn\\{[^}]*right:clamp\\(10px,4\\.2vw,66px\\);top:47%;width:clamp\\(370px,42vw,540px\\);height:clamp\\(370px,42vw,540px\\);transform:translate3d\\(calc\\(var\\(--saturn-x,0\\)\\*5px\\),calc\\(-53% \\+ var\\(--saturn-y,0\\)\\*5px\\),0\\)/, 'Saturn keeps its original fixed CSS anchor, size, and zero-offset fallback')
})

test('no motion library was added by this pass', () => {
  for (const code of [press, motion]) assert.doesNotMatch(code, /\bgsap\b|framer-motion|\bmotion\b\s*from|anime\(|lottie/i)
  assert.doesNotMatch(tsx, /from 'motion|from "motion|framer-motion|gsap/)
})
