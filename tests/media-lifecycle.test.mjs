// Regression coverage for on-demand media loading, playback races, and resource release.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const videoScript = html.match(/<script id="jaye-global-background-video-toggle-runtime">([\s\S]*?)<\/script>/)?.[1] ?? ''
const imageScript = html.match(/<script id="jaye-optional-image-backgrounds-runtime-v1">([\s\S]*?)<\/script>/)?.[1] ?? ''

class FakeClassList {
  values = new Set()
  add(name) { this.values.add(name) }
  remove(name) { this.values.delete(name) }
  contains(name) { return this.values.has(name) }
}
class FakeElement {
  constructor(attributes = {}) { this.attributes={...attributes}; this.listeners=new Map(); this.classList=new FakeClassList(); this.textContent=''; this.error=null }
  addEventListener(type,callback) { const list=this.listeners.get(type)??[]; list.push(callback); this.listeners.set(type,list) }
  setAttribute(name,value) { this.attributes[name]=String(value) }
  getAttribute(name) { return this.attributes[name]??null }
  hasAttribute(name) { return Object.hasOwn(this.attributes,name) }
  removeAttribute(name) { delete this.attributes[name] }
  dispatch(type) { for(const callback of this.listeners.get(type)??[])callback({type,target:this}) }
}
class FakeVideo extends FakeElement {
  constructor() { super({'data-src':'jaye-video-background.mp4'}); this.paused=true; this.currentSrc=''; this.readyState=0; this.loadCount=0; this.playRequests=[] }
  play() {
    let resolve,reject
    const promise=new Promise((res,rej)=>{resolve=res;reject=rej})
    this.playRequests.push({promise,resolve,reject})
    return promise.then(value=>{
      this.paused=!this.getAttribute('src')
      this.currentSrc=this.getAttribute('src')||''
      this.readyState=this.paused?0:3
      if(!this.paused)this.dispatch('playing')
      return value
    })
  }
  pause() { this.paused=true }
  load() { this.loadCount++; this.currentSrc=''; this.readyState=0; this.paused=true }
}
function makeHarness() {
  const video=new FakeVideo(), canvas=new FakeElement(), button=new FakeElement(), root=new FakeElement()
  const document={
    baseURI:'https://jaye.example/',hidden:false,documentElement:root,listeners:new Map(),
    getElementById(id){return id==='jaye-global-video-background'?video:id==='jaye-tornado-background'?canvas:id==='jaye-background-switch'?button:null},
    addEventListener(type,callback){const list=this.listeners.get(type)??[];list.push(callback);this.listeners.set(type,list)},
    dispatch(type){for(const callback of this.listeners.get(type)??[])callback({type})}
  }
  const window={location:{origin:'https://jaye.example'}}
  vm.runInNewContext(videoScript,{document,window,URL,Promise})
  return {video,button,root,document}
}
const tick=async()=>{await Promise.resolve();await Promise.resolve()}
const click=button=>button.dispatch('click')

test('initial page load does not fetch or play video',()=>{
  assert.match(html,/<video[^>]*preload="none" data-src="jaye-video-background\.mp4"/)
  assert.doesNotMatch(html,/<video[^>]*\ssrc="jaye-video-background\.mp4"/)
  const h=makeHarness()
  assert.equal(h.video.hasAttribute('src'),false)
  assert.equal(h.video.playRequests.length,0)
  assert.equal(h.video.loadCount,0)
})
test('explicit selection starts video; deselection pauses and releases source',async()=>{
  const h=makeHarness()
  click(h.button)
  assert.equal(h.video.playRequests.length,1)
  assert.equal(h.video.getAttribute('src'),'https://jaye.example/jaye-video-background.mp4')
  h.video.playRequests[0].resolve(); await tick()
  assert.equal(h.root.classList.contains('jaye-video-background-active'),true)
  click(h.button)
  assert.equal(h.video.paused,true)
  assert.equal(h.video.hasAttribute('src'),false)
  assert.equal(h.video.loadCount,1)
  assert.equal(h.root.classList.contains('jaye-video-background-active'),false)
})
test('late play resolution cannot reactivate video after a rapid off tap',async()=>{
  const h=makeHarness(); click(h.button); const pending=h.video.playRequests[0]
  click(h.button); pending.resolve(); await tick()
  assert.equal(h.video.paused,true)
  assert.equal(h.video.hasAttribute('src'),false)
  assert.equal(h.root.classList.contains('jaye-video-background-active'),false)
})
test('image selection cancels pending video playback and releases the source',async()=>{
  const h=makeHarness(); click(h.button); h.document.dispatch('jaye-background-image-selected')
  assert.equal(h.video.hasAttribute('src'),false)
  h.video.playRequests[0].resolve(); await tick()
  assert.equal(h.root.classList.contains('jaye-video-background-active'),false)
  assert.equal(h.button.attributes['aria-pressed'],'false')
})
test('hidden tab releases video and resumes only the visitor-selected background',async()=>{
  const h=makeHarness(); click(h.button); h.video.playRequests[0].resolve(); await tick()
  h.document.hidden=true; h.document.dispatch('visibilitychange')
  assert.equal(h.video.hasAttribute('src'),false)
  assert.equal(h.root.classList.contains('jaye-video-background-active'),false)
  assert.equal(h.button.attributes['aria-pressed'],'true')
  h.document.hidden=false; h.document.dispatch('visibilitychange')
  assert.equal(h.video.playRequests.length,2)
  h.video.playRequests[1].resolve(); await tick()
  assert.equal(h.root.classList.contains('jaye-video-background-active'),true)
})
test('play failure restores normal background and releases media',async()=>{
  const h=makeHarness(); click(h.button)
  const error=new Error('network failure'); error.name='NotSupportedError'
  h.video.playRequests[0].reject(error); await tick()
  assert.equal(h.video.hasAttribute('src'),false)
  assert.equal(h.root.classList.contains('jaye-video-background-active'),false)
  assert.equal(h.button.attributes['aria-pressed'],'false')
})
test('an unexpected pause gets at most one event-driven recovery attempt',async()=>{
  const h=makeHarness(); click(h.button); h.video.playRequests[0].resolve(); await tick()
  h.video.paused=true; h.video.dispatch('pause')
  assert.equal(h.video.playRequests.length,2)
  h.video.paused=true; h.video.dispatch('pause')
  assert.equal(h.video.playRequests.length,2)
})
test('optional images and video are not preloaded at startup',()=>{
  assert.doesNotMatch(imageScript,/DOMContentLoaded|photosSettled|pageLoaded|preload\s*=\s*['"]auto|warmUp\(|new Image\(\)/)
  assert.match(imageScript,/nudge\.addEventListener\('click',\(\)=>\{attachThumbnails\(\)/)
  assert.doesNotMatch(imageScript,/pointerenter|pointerdown|focusin/)
  assert.match(html,/data-deferred-src="assets\/amber-background\.jpg"[^>]*loading="lazy"/)
  assert.match(html,/data-deferred-src="assets\/noir-background\.jpg"[^>]*loading="lazy"/)
})
test('a pending image choice is invalidated when switching background or closing the picker',()=>{
  const switcher=imageScript.match(/switcher\.addEventListener\('click',\(\)=>\{([\s\S]*?)\}\);/)?.[1]??''
  assert.match(switcher,/latestChoice\+\+/)
  assert.match(imageScript,/document\.dispatchEvent\(new Event\('jaye-background-image-selected'\)\)/)
  assert.match(imageScript,/const closePanel=\(\)=>\{latestChoice\+\+/)
  const outsideClose=imageScript.match(/document\.addEventListener\('pointerdown',event=>\{([\s\S]*?)\}\);/)?.[1]??''
  assert.match(outsideClose,/latestChoice\+\+/)
})
