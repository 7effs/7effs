// Two small, separate guards.
// 1. The background switch: its glass is 95% opaque, it keeps four distinctive highlights, the hover/focus state keeps the same layers, and it is 10% smaller
//    than it was (real width, height, padding and type, not a transform).
// 2. Parent Space: the open view is 85% opaque on purpose (the page's background layers show through), so the page's own content, which stays painted
//    behind the fixed view, must be hidden while it is open, otherwise it shows through as ghost text.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const css = html.replace(/\/\*[\s\S]*?\*\//g, '')
const block = (start) => { const i = css.indexOf(start); return i < 0 ? '' : css.slice(i, css.indexOf('\n}', i) + 2) }

test('switch: the tint is 95% opaque at both ends, and no older rule paints it at another opacity', () => {
  const rest = block('#jaye-background-switch{\n  position:fixed; isolation:isolate')
  assert.ok(rest.includes('linear-gradient(135deg,rgba(24,28,38,.95),rgba(6,8,13,.95)) 0 0/100% 100% no-repeat'))
  assert.doesNotMatch(rest, /rgba\(24,28,38,\.72\)|rgba\(6,8,13,\.84\)/)
  // the older rule that also matched :hover/:focus-visible used to replace all the layers with a flat 78% colour
  assert.doesNotMatch(css, /#jaye-background-switch:hover,#jaye-background-switch:focus-visible\{[^}]*background:/)
})

test('switch: four registration ticks, a brighter top edge and a halo ring; hover and focus keep exactly the same eight layers', () => {
  const rest = block('#jaye-background-switch{\n  position:fixed; isolation:isolate')
  assert.equal((rest.match(/var\(--jaye-switch-tick\),var\(--jaye-switch-tick\)/g) ?? []).length, 4, 'two ticks (an L) in the top-left and two in the bottom-right')
  assert.equal((rest.match(/linear-gradient\(/g) ?? []).length, 8, 'four ticks + sweep + reflection + sheen + tint')
  assert.match(rest, /inset 0 1px 0 rgba\(255,255,255,\.3\)/)
  assert.match(rest, /0 0 0 1px rgba\(176,192,255,\.16\),0 0 16px -3px rgba\(150,170,255,\.34\)/)
  const positions = '0 0,0 0,100% 100%,100% 100%,0 0,70% 0,0 0,0 0'
  assert.equal(css.split(`background-position:${positions}`).length - 1, 2, 'hover and focus-visible each list one position per layer')
  assert.doesNotMatch(css, /background-position:0 0,70% 0,0 0,0 0/, 'no stale four-layer list left')
})

test('switch: the breathing dot animates opacity only (so the video-mode halo is untouched) and never for reduced motion', () => {
  assert.ok(css.includes('@media(prefers-reduced-motion:no-preference){#jaye-background-switch::before{animation:jayeSwitchDot 3.2s ease-in-out infinite}}'))
  assert.ok(css.includes('@keyframes jayeSwitchDot{0%,100%{opacity:.55}50%{opacity:1}}'))
  assert.ok(css.includes('@media(prefers-reduced-motion:reduce){#jaye-background-switch{animation:none}}'))
})

test('switch: 10% smaller in every real dimension (27.5 -> 24.75px, 8 -> 7.2px type; phone 25 -> 22.5px, 7.4 -> 6.66px), with the same touch target', () => {
  const rest = block('#jaye-background-switch{\n  position:fixed; isolation:isolate')
  assert.match(rest, /gap:6\.3px;\s*height:24\.75px; min-height:0; padding:0 9\.9px 0 9px;/)
  assert.match(rest, /border-radius:4\.5px/)
  assert.match(rest, /font:600 7\.2px\/1 ui-monospace/)
  assert.doesNotMatch(rest, /transform:\s*scale/, 'real dimensions, not a transform, so the click target is the size it looks')
  // the four registration ticks scale with it
  assert.equal((rest.match(/0 0\/6\.3px 1px no-repeat|0 0\/1px 6\.3px no-repeat|100% 100%\/6\.3px 1px no-repeat|100% 100%\/1px 6\.3px no-repeat/g) ?? []).length, 4)
  assert.match(css, /#jaye-background-switch::before\{\s*content:""; flex:0 0 3\.6px; width:3\.6px; height:3\.6px/)
  // phones
  assert.match(css, /height:22\.5px; padding:0 8\.1px 0 7\.2px; gap:5\.4px; font-size:6\.66px; letter-spacing:\.09em; border-radius:3\.6px;/)
  assert.match(css, /#jaye-background-switch::before\{flex-basis:3\.15px;width:3\.15px;height:3\.15px\}/)
  // the invisible touch pad grows by what the button lost, so the tap area stays about 43.5px tall
  assert.ok(css.includes('#jaye-background-switch::after{content:"";position:absolute;inset:-10.4px -6px;'), 'desktop: 22.75 + 20.8 = 43.55px')
  assert.ok(css.includes('#jaye-background-switch::after{inset:-11.25px -6px}'), 'phone: 20.5 + 22.5 = 43px')
  assert.ok(22.75 + 2 * 10.4 >= 43.5 && 20.5 + 2 * 11.25 >= 43)
})

test('Parent Space: the open view keeps its 85% background; the page behind it is hidden only while it is open', () => {
  assert.ok(css.includes('.parent-space-view:not([hidden]){background-color:rgba(7,9,13,.85)!important}'))
  const rule = 'body.parent-space-open>main>:not(#parent-space-view){visibility:hidden}'
  assert.equal(css.split(rule).length - 1, 1, 'exactly one rule')
  assert.ok(css.indexOf(rule) > css.indexOf('.parent-space-view:not([hidden]){background-color:rgba(7,9,13,.85)!important}'), 'next to the transparency rule it completes')
  assert.doesNotMatch(rule, /display|height|position|margin|padding|opacity|transform/, 'visibility only: layout and scroll position cannot move')
})

test('Parent Space: the script still marks the body, makes the page inert and skips the view itself; the view is a direct child of main', () => {
  const js = html.match(/<script id="parent-space-navigation-v1">([\s\S]*?)<\/script>/)?.[1] ?? ''
  assert.ok(js.includes("document.body.classList.add('parent-space-open')"))
  assert.ok(js.includes("document.body.classList.remove('parent-space-open')"))
  assert.ok(js.includes('Array.from(main.children).forEach(function(el){\n        if(el===view)return;'))
  const mainAt = html.indexOf('<main'), viewAt = html.indexOf('id="parent-space-view"'), mainEnd = html.indexOf('</main>')
  assert.ok(mainAt > 0 && viewAt > mainAt && viewAt < mainEnd, 'inside main')
  // from inside the entry wrap's opening tag to the view's id: the wrap closes (one </div>) and the view opens (one <div>), so the view is its sibling
  const between = html.slice(html.indexOf('id="parent-interface-entry-wrap"'), viewAt)
  assert.equal((between.match(/<div/g) ?? []).length, (between.match(/<\/div>/g) ?? []).length, 'balanced: the view is not nested inside the entry wrap or any other section')
})
