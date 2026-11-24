import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const style = id => {
  const open = '<style id="' + id + '">'
  const start = html.indexOf(open)
  if (start < 0) return ''
  const contentStart = start + open.length
  const end = html.indexOf('</style>', contentStart)
  return end < 0 ? '' : html.slice(contentStart, end)
}
const sequenceStart = html.indexOf('<div class="jaye-v5-sequence"')
const sequenceEnd = html.indexOf('\n  </div>\n  <div class="jaye-intro-counter"', sequenceStart)
const sequence = sequenceStart >= 0 && sequenceEnd >= 0 ? html.slice(sequenceStart, sequenceEnd) : ''
const v5 = style('jaye-intro-cinematic-peak-v5')
const v6 = style('jaye-intro-cinematic-peak-v6')
const hi = style('jaye-intro-hi-v8')
const editorial = style('jaye-intro-editorial-v10')
const controllerStart = html.indexOf('<script id="jaye-intro-controller-v2">')
const controllerContentStart = controllerStart + '<script id="jaye-intro-controller-v2">'.length
const controllerEnd = html.indexOf('</script>', controllerContentStart)
const controller = controllerStart < 0 || controllerEnd < 0 ? '' : html.slice(controllerContentStart, controllerEnd)

test('the complete authored sequence and every original phrase remain present', () => {
  for (const text of [
    'A PRESENCE / 001',
    'MEMORY / ART&nbsp;&nbsp; — &nbsp;&nbsp;JAYE ARCHIVE',
    '<b>SUBJECTS OF</b>', '<b>INTEREST.</b>',
    '<b>PEOPLE /</b>', '<b>PLACES / OBJECTS</b>',
    'jaye-v5-blade', 'jaye-v5-wipe--ivory', 'jaye-v5-wipe--black',
    'jaye-v5-wordmark-echo', '<small>AN OPEN INDEX</small>',
    'jaye-v5-final-rule', 'MEMORY / ART / EVERYTHING THAT REMAINS',
    'jaye-v6-final-frame', 'jaye-v6-title-sweep', 'jaye-v5-progress'
  ]) assert.ok(sequence.includes(text), 'missing preserved entrance element: ' + text)
  assert.ok(!html.includes('jaye-b9') && !html.includes('jayeB9'), 'the stripped four-slice experiment is removed')
})

test('Hi remains the original left-anchored opening, including its index caption', () => {
  assert.ok(sequence.includes('<div class="jaye-v5-hi-core"><span>H</span><span>i</span></div>'))
  assert.ok(sequence.includes('A PRESENCE / 001'))
  assert.ok(hi.includes('jayeV8Wall 2.7s'))
  assert.ok(hi.includes('jayeV8H 1s'))
  assert.ok(hi.includes('jayeV8i 1s'))
  assert.ok(hi.includes('jayeV8Plinth 1.6s'))
  assert.ok(v5.includes('jayeV5GreetingExit .62s cubic-bezier(.76,0,.24,1) 2.15s'))
  assert.ok(!editorial.includes('jaye-v5-hi-index{display:none'))
})

test('OFFSET / IMPOSITION changes the art direction without deleting authored elements', () => {
  for (const token of [
    'jayeV10Register', 'jayeV10PlateLeft', 'jayeV10PlateRight',
    'jayeV10TypeLeft', 'jayeV10TypeRight', 'jayeV10Blade',
    'jayeV10Frame', 'jayeV10Wordmark', 'jayeV10Roll',
    'background:#eeeae1', 'background:#111111', '#c94b37'
  ]) assert.ok(editorial.includes(token), 'missing editorial treatment: ' + token)
  assert.ok(editorial.includes('.jaye-v5-wordmark-echo{\n  display:block!important'))
  assert.ok(editorial.includes('.jaye-v6-final-frame{'))
  assert.ok(editorial.includes('.jaye-v6-title-sweep{\n  display:block!important'))
  assert.ok(editorial.includes('.jaye-v5-progress{'))
  assert.ok(!editorial.includes('.jaye-intro-grain{display:none'))
  assert.ok(!editorial.includes('perspective:none!important'))
})

test('the original sequence timing remains intact through the final 10.76 second clock', () => {
  assert.ok(v5.includes('jayeV5StripSequence 1.1s cubic-bezier(.76,0,.24,1) 2.34s'))
  assert.ok(v6.includes('jayeV6PhraseLeft .68s cubic-bezier(.16,1,.3,1) 3.28s'))
  assert.ok(v6.includes('jayeV6PhraseRight .72s cubic-bezier(.16,1,.3,1) 3.45s'))
  assert.ok(v6.includes('jayeV6PhraseRight .68s cubic-bezier(.16,1,.3,1) 4.77s'))
  assert.ok(v6.includes('jayeV6PhraseLeft .72s cubic-bezier(.16,1,.3,1) 4.94s'))
  assert.ok(editorial.includes('jayeV10Blade 1.68s cubic-bezier(.16,1,.3,1) 5.65s'))
  assert.ok(v5.includes('jayeV5Wipe .62s cubic-bezier(.76,0,.24,1) 6.86s'))
  assert.ok(v5.includes('jayeV5Wipe .57s cubic-bezier(.76,0,.24,1) 7.49s'))
  assert.ok(editorial.includes('jayeV10Frame 3.25s cubic-bezier(.16,1,.3,1) 7.43s'))
  assert.ok(editorial.includes('jayeV10Wordmark .66s cubic-bezier(.82,0,.18,1) 7.98s'))
  assert.ok(editorial.includes('jayeV10Roll 1.12s cubic-bezier(.16,1,.3,1) 9.08s'))
  assert.ok(v5.includes('jayeV5Progress 10.72s linear .04s'))
  assert.ok(controller.includes('timer=window.setTimeout(closeIntro,10760);'))
})

test('the original peak-light canvas is restored and layered inside the visible sequence', () => {
  const scriptId = '<script id="jaye-intro-peak-light-v7">'
  const scriptStart = html.indexOf(scriptId)
  const contentStart = scriptStart + scriptId.length
  const scriptEnd = html.indexOf('</script>', contentStart)
  const peak = scriptStart < 0 || scriptEnd < 0 ? '' : html.slice(contentStart, scriptEnd)
  assert.ok(peak.includes("layer.querySelector('.jaye-v5-sequence')"))
  assert.ok(peak.includes("getContext('2d')"))
  assert.ok(peak.includes('requestAnimationFrame(frame)'))
  assert.ok(html.includes('<style id="jaye-intro-peak-light-v7">'))
  assert.ok(html.includes('jaye-peak-light{position:absolute'))
  assert.ok(peak.includes('cancelAnimationFrame(raf)'))
})

test('mobile, reduced-motion, skip and session lifecycle remain supported', () => {
  assert.ok(editorial.includes('@media(max-width:600px)'))
  assert.ok(editorial.includes('@media(max-width:360px)'))
  assert.ok(editorial.includes('@media(prefers-reduced-motion:reduce)'))
  assert.ok(v5.includes('@media(prefers-reduced-motion:reduce)'))
  assert.ok(controller.includes("skip.addEventListener('click',closeIntro)"))
  assert.ok(controller.includes("if(e.key==='Escape'&&!closed)closeIntro()"))
  assert.ok(controller.includes("window.sessionStorage.getItem(SEEN_KEY)"))
  assert.ok(!editorial.includes('@import'))
  assert.ok(!editorial.includes('https://'))
})
