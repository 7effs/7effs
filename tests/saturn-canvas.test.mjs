import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Guards for the homepage particle-sphere background (#jaye-tornado-background): lighter to draw, same picture, one loop that only
// runs while the canvas can be seen. The runtime behaviour (pause / resume / caps) was exercised in a browser; these keep the shape.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const script = html.match(/<script id="jaye-tornado-page-background">([\s\S]*?)<\/script>/)?.[1] ?? ''
const code = script.replace(/\/\*[\s\S]*?\*\//g, '')

test('the canvas element and its script are still the single background layer', () => {
  assert.equal((html.match(/<canvas[^>]*id="jaye-tornado-background"/g) ?? []).length, 1)
  assert.equal((html.match(/<script id="jaye-tornado-page-background">/g) ?? []).length, 1)
  assert.equal((code.match(/getContext\(/g) ?? []).length, 2, 'the page canvas and one cached halo bitmap')
  assert.doesNotMatch(code, /\bimport\b|fetch\(|https?:\/\//, 'no library, no network')
})

test('about 30% fewer particles and a slightly slower turn', () => {
  assert.match(code, /coreN=reduce\?1600:2950/, 'was 4200')
  assert.match(code, /ringCount=reduce\?2600:5750/, 'was 8200')
  assert.match(code, /dustN=reduce\?180:365/, 'was 520')
  assert.ok(2950 / 4200 <= .75 && 2950 / 4200 >= .65 && 5750 / 8200 <= .75 && 5750 / 8200 >= .65)
  assert.match(code, /SPIN_SPEED=\.104/, 'was .12')
  assert.match(code, /const spin=reduce\?-\.18:time\*SPIN_SPEED/)
})

test('one loop only, started and stopped from one place', () => {
  assert.equal((code.match(/requestAnimationFrame\(/g) ?? []).length, 2, 'one in evaluate(), one re-arm inside loop()')
  assert.equal((code.match(/function loop\(/g) ?? []).length, 1)
  assert.match(code, /else if\(!raf\)\{[^}]*raf=requestAnimationFrame\(loop\)/, 'a second loop can never start while one is armed')
  assert.match(code, /cancelAnimationFrame\(raf\)/)
  assert.equal((code.match(/addEventListener\('resize'/g) ?? []).length, 1)
  assert.equal((code.match(/new MutationObserver/g) ?? []).length, 1)
  assert.equal((code.match(/new IntersectionObserver/g) ?? []).length, 1)
})

test('it stops when it cannot be seen, and a still frame stays on screen', () => {
  for (const reason of ['reduced-motion', 'hidden', 'offscreen', 'archive', 'intro', 'covered']) assert.match(code, new RegExp(`'${reason}'`), reason)
  assert.match(code, /data-archive-view/)
  assert.match(code, /indexOf\('interface-'\)===0/, 'both Archive collections')
  assert.match(code, /jaye-video-background-active/)
  assert.match(code, /jaye-image-background-active/)
  assert.match(code, /document\.hidden/)
  assert.match(code, /visibilitychange/)
  assert.match(code, /if\(!drawnOnce\)frame\(now,true\)/, 'one frame is always painted first')
  assert.match(code, /if\(!raf\)frame\(performance\.now\(\),true\)/, 'a resize repaints the still frame while paused')
  assert.match(code, /if\(reduce\)return 'reduced-motion'/, 'reduced motion never starts the loop')
})

test('frame-rate caps, pixel-ratio cap and adaptive quality', () => {
  assert.match(code, /MOBILE_FPS=36,DESKTOP_FPS=60/)
  assert.match(code, /if\(now-lastDraw<minDt\)return/)
  assert.match(code, /Math\.min\(devicePixelRatio\|\|1,mobile\?1\.5:2\)/, 'was a flat 2')
  assert.match(code, /QUALITY=\[1,\.8,\.62\]/)
  assert.match(code, /function adapt\(/)
  assert.match(code, /setLevel\(level\+1,now\)/)
  assert.match(code, /setLevel\(level-1,now\)/, 'quality comes back when the device keeps up')
})

test('static pieces are cached, the cloud is built once, resize is debounced', () => {
  assert.match(code, /haloC=document\.createElement\('canvas'\)/)
  assert.match(code, /globalCompositeOperation='copy';ctx\.drawImage\(haloC/)
  assert.match(code, /filament=new Path2D\(\)/)
  assert.match(code, /ctx\.stroke\(filament\)/)
  assert.match(code, /setTimeout\(\(\)=>\{\s*if\(!resize\(\)\)return/, 'debounced')
  assert.equal((code.match(/Math\.random\(\)/g) ?? []).length >= 1, true)
  // the cloud is generated at the top level of the closure, never inside resize() or frame()
  const resizeBody = code.slice(code.indexOf('function resize()'), code.indexOf('/* ---- the frame ---- */'))
  const frameBody = code.slice(code.indexOf('function frame('), code.indexOf('/* ---- adaptive quality ---- */'))
  assert.doesNotMatch(resizeBody + frameBody, /Math\.random|new Float32Array|Array\.from|\.map\(|\.sort\(|\.filter\(/)
})

test('drawing is bucketed by colour: no per-particle strings, no depth sort, no blur or filters', () => {
  assert.doesNotMatch(code, /\.sort\(/, 'additive blending is order independent, so the sorts are gone')
  assert.doesNotMatch(code, /shadowBlur|shadowColor|filter\s*=|ctx\.filter|backdrop|createImageData|getImageData/)
  assert.doesNotMatch(code, /fillStyle=`|fillStyle='rgba\(\$\{|strokeStyle=`/, 'no colour string is built per particle')
  assert.match(code, /function fillBuckets\(/)
  assert.match(code, /function group\(/)
  assert.match(code, /globalCompositeOperation='lighter'/, 'the same additive look')
  // all the colour tables are built once, at the top
  assert.equal((code.match(/Array\.from\(\{length:(?:CORE_B|RING_B|DUST_B)\}/g) ?? []).length, 3)
})

test('the canvas element keeps its look rules (opacity, containment, no pointer events)', () => {
  const rule = html.match(/#jaye-tornado-background\{[^}]*\}/)?.[0] ?? ''
  assert.match(rule, /position:fixed/)
  assert.match(rule, /pointer-events:none/)
  assert.match(rule, /contain:strict/)
})
