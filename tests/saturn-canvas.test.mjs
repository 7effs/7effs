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
  assert.equal((code.match(/getContext\(/g) ?? []).length, 3, 'the page canvas, the cached halo bitmap and the cached planet bitmap')
  assert.doesNotMatch(code, /\bimport\b|fetch\(|https?:\/\//, 'no library, no network')
})

test('about 30% fewer particles; the outer orbit turns at 0.95 of its former speed', () => {
  assert.match(code, /coreN=reduce\?1600:2950/, 'was 4200')
  assert.match(code, /ringCount=reduce\?2600:5750/, 'was 8200')
  assert.match(code, /dustN=reduce\?180:365/, 'was 520')
  assert.ok(2950 / 4200 <= .75 && 2950 / 4200 >= .65 && 5750 / 8200 <= .75 && 5750 / 8200 >= .65)
  assert.match(code, /SPIN_SPEED=\.104\*\.95/, 'was .12, then .104; now x0.95 of that, for the outer rings only')
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
  assert.match(code, /QUALITY=\[\.98,\.8,\.62\]/, 'level 0 is 98% of the ring particles; the lower levels are unchanged')
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

test('the planet is still: drawn once per size and copied each frame; only the outer orbit moves', () => {
  // comments are stripped from `code`, so the slices are cut at real statements, not at comment markers
  const frameBody = code.slice(code.indexOf('function frame('), code.indexOf('let level=0'))
  const buildBody = code.slice(code.indexOf('function buildCore('), code.indexOf('let time=0'))
  assert.ok(frameBody.length > 500 && buildBody.length > 500 && frameBody.length < 6000 && buildBody.length < 3000, 'the slices are the two functions, not the rest of the script')
  // nothing about the planet is recomputed per frame
  assert.doesNotMatch(frameBody, /coreX|coreY|coreZ|coreSeedTau|sPX|sBk|CORE_B|Math\.cos\(spin\)|Math\.sin\(spin\)|glowG/, 'no per-frame planet projection, sorting or fill')
  assert.match(frameBody, /ctx\.drawImage\(coreC,coreOx,coreOy\)/, 'a 1:1 copy of the cached planet')
  assert.match(code, /buildCore\(\);\s*return true/, 'rebuilt only when the size changes')
  // the cached picture is the old first frame: same projection, shading, buckets, additive blend, limb
  assert.match(buildBody, /const spin=reduce\?-\.18:0/, 'the reduced-motion still frame keeps its angle; otherwise the opening orientation')
  assert.match(buildBody, /Math\.sin\(coreSeedTau\[i\]\)\*\.012/, 'the depth offset the old first frame had, now fixed')
  assert.match(buildBody, /globalCompositeOperation='lighter'/)
  assert.match(buildBody, /fillBuckets\(CORE_B,cStart,cOrd,coreStyle,sPX,sPY,sRad,k\)/)
  assert.match(buildBody, /k\.rotate\(-\.09\);k\.scale\(1,\.91\)/, 'the luminous limb')
  assert.doesNotMatch(buildBody, /time|requestAnimationFrame/, 'nothing in it depends on the clock')
  // the outer orbit still turns, both the far arcs and the front ring particles, and the other effects are untouched
  assert.match(frameBody, /const a=Math\.PI\+\(i\/120\)\*Math\.PI\+spin/, 'far ring arcs')
  assert.match(frameBody, /const a=ringA\[i\]\+spin\*ringK\[i\]/, 'front ring particles')
  assert.match(frameBody, /Math\.sin\(time\*\.7\+dSeed\[i\]\)/, 'dust twinkle')
  assert.match(frameBody, /const a=time\*\.16\+i\*TAU\/5/, 'glints')
  // the planet is always drawn at full density; adaptive quality now only thins the rings
  assert.doesNotMatch(code, /nCore/)
  assert.match(code, /nRing=Math\.floor\(ringN\*QUALITY\[l\]\)/)
})

test('the three background layers keep one height and one anchor while a phone browser bar shows and hides', () => {
  const rule = (id) => html.match(new RegExp(`${id}\\{position:fixed;[^}]*\\}`))?.[0] ?? ''
  for (const id of ['#jaye-tornado-background', '#jaye-global-video-background', '#jaye-image-background-layer']) {
    const r = rule(id)
    assert.match(r, /inset:auto 0 0 0/, `${id}: bottom anchored`)
    assert.match(r, /height:100lvh/, `${id}: the largest viewport height`)
    assert.match(html, new RegExp(`@supports\\(-webkit-touch-callout:none\\)\\{${id}\\{inset:0 0 auto 0\\}\\}`), `${id}: iOS keeps its top anchor`)
  }
  assert.match(rule('#jaye-tornado-background'), /height:100%;height:100lvh/, 'browsers without lvh keep the old height')
  // the canvas takes its height from CSS, never from the shrinking and growing innerHeight
  assert.match(code, /nh=canvas\.clientHeight\|\|innerHeight/)
  assert.doesNotMatch(code, /canvas\.style\.height/)
})

test('level 0 draws 2% fewer ring particles: same particles, the last 2% of the list is simply not drawn', () => {
  // the first frame and every return to level 0 use the same count
  assert.match(code, /let nRing=Math\.floor\(ringN\*QUALITY\[0\]\)/)
  assert.match(code, /nRing=Math\.floor\(ringN\*QUALITY\[l\]\)/)
  // the particles are still generated exactly as before (same count, same random draws), so every kept particle sits where it always did
  assert.match(code, /ringCount=reduce\?2600:5750/)
  assert.match(code, /const a=rand\(0,TAU\),r=Math\.sqrt\(rand\(1\.38\*1\.38,2\.62\*2\.62\)\),seed=Math\.random\(\),size=rand\(\.35,1\.15\),band=Math\.random\(\)/)
  // the planet is untouched and the frame still draws only the first nRing particles
  assert.match(code, /for\(let i=0;i<nRing;i\+\+\)\{/)
  assert.doesNotMatch(code, /nCore/)
})
