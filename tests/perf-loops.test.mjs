import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Performance only: what the per-frame loops are allowed to do. Their output was compared value for value, frame for
// frame, with and without a moving pointer, before and after these changes.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const orbit = (() => {
  const start = html.indexOf('<script id="jaye-archive-orbit">')
  assert.ok(start > 0, 'the Archive orbit script exists')
  return html.slice(start, html.indexOf('</script>', start))
})()

test('the Archive orbit measures its box only while the pointer is steering the tilt', () => {
  const frame = orbit.slice(orbit.indexOf('const frame=t=>{'))
  const reads = frame.match(/getBoundingClientRect\(\)/g) ?? []
  assert.equal(reads.length, 1, 'one geometry read in the whole frame')
  const read = frame.indexOf('getBoundingClientRect()')
  const guard = frame.lastIndexOf('if(!reduce&&t-ptr.t<3600){', read)
  assert.ok(guard > 0 && guard < read && read - guard < 40, 'the read sits inside the recent-pointer branch, not before it')
  assert.doesNotMatch(frame.slice(0, guard), /getBoundingClientRect|offsetWidth|offsetHeight|clientWidth|getComputedStyle/, 'nothing is measured earlier in the frame')
})

test('the orbit still writes the same things each frame', () => {
  assert.match(orbit, /tilt\.style\.transform='rotateX\('\+rx\.toFixed\(2\)\+'deg\) rotateY\('\+ry\.toFixed\(2\)\+'deg\)'/)
  assert.match(orbit, /core\.style\.transform='rotateY\('\+\(-ry\)\.toFixed\(2\)\+'deg\) rotateX\('\+\(-rx\)\.toFixed\(2\)\+'deg\)'/)
  assert.match(orbit, /ring\.style\.transform='rotateY\('\+ang\.toFixed\(2\)\+'deg\)'/)
  assert.match(orbit, /cards\[i\]\.style\.setProperty\('--sh',/)
  assert.match(orbit, /if\(!inView\|\|document\.hidden\)return;/, 'still idle when off screen or hidden')
})
