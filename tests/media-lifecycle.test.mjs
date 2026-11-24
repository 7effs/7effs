// Regression coverage for on-demand media loading, playback races, and resource release.
// The video is the first-visit default (<html data-jaye-bg="video">, set by jaye-background-choice-runtime) and starts only after the page has
// loaded and the browser is idle; every other background loads nothing until it is chosen. The harness runs the real scripts against a small fake DOM.
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
// mode = what <html data-jaye-bg> says when the script runs ('saturn' keeps the old click-driven tests meaningful: nothing is chosen for the visitor)
function makeHarness({mode='saturn',readyState='complete'}={}) {
  const video=new FakeVideo(), canvas=new FakeElement(), button=new FakeElement(), root=new FakeElement({'data-jaye-bg':mode})
  const choices=[], idle=[]
  const document={
    baseURI:'https://jaye.example/',hidden:false,readyState,documentElement:root,listeners:new Map(),
    getElementById(id){return id==='jaye-global-video-background'?video:id==='jaye-tornado-background'?canvas:id==='jaye-background-switch'?button:null},
    addEventListener(type,callback){const list=this.listeners.get(type)??[];list.push(callback);this.listeners.set(type,list)},
    dispatch(type){for(const callback of this.listeners.get(type)??[])callback({type})},
    dispatchEvent(event){if(event.type==='jaye-background-choice')choices.push(JSON.parse(JSON.stringify(event.detail)));for(const callback of this.listeners.get(event.type)??[])callback(event);return true}
  }
  const requestIdleCallback=callback=>{idle.push(callback);return idle.length}
  const window={location:{origin:'https://jaye.example'},listeners:new Map(),requestIdleCallback,
    addEventListener(type,callback){const list=this.listeners.get(type)??[];list.push(callback);this.listeners.set(type,list)},
    dispatch(type){for(const callback of this.listeners.get(type)??[])callback({type})}}
  vm.runInNewContext(videoScript,{document,window,URL,Promise,CustomEvent,requestIdleCallback})
  const runIdle=()=>{while(idle.length)idle.shift()()}
  return {video,button,root,document,window,choices,idle,runIdle}
}
const tick=async()=>{await Promise.resolve();await Promise.resolve()}
const click=button=>button.dispatch('click')

test('a page that opens on another background does not fetch or play the video',()=>{
  assert.match(html,/<video[^>]*preload="none" data-src="jaye-video-background\.mp4"/)
  assert.doesNotMatch(html,/<video[^>]*\ssrc="jaye-video-background\.mp4"/)
  for (const mode of ['saturn','amber','noir']) {
    const h=makeHarness({mode})
    h.runIdle()
    assert.equal(h.video.hasAttribute('src'),false,mode)
    assert.equal(h.video.playRequests.length,0,mode)
    assert.equal(h.video.loadCount,0,mode)
    assert.equal(h.idle.length,0,mode)
    assert.equal(h.window.listeners.has('load'),false,`${mode}: nothing is waiting for the page to load`)
    assert.deepEqual(h.choices,[],`${mode}: nothing announced`)
  }
})
test('first visit: the video waits for the page to load, then for idle, and only then is fetched and played',async()=>{
  const h=makeHarness({mode:'video',readyState:'loading'})
  assert.equal(h.button.attributes['aria-pressed'],'true','the switch already offers the way back to Saturn')
  assert.equal(h.button.textContent,'SATURN BACKGROUND')
  assert.equal(h.video.hasAttribute('src'),false,'no fetch while the page is loading')
  assert.equal(h.video.playRequests.length,0)
  h.window.dispatch('load')
  assert.equal(h.video.playRequests.length,0,'the load event alone does not start it')
  assert.equal(h.idle.length,1)
  h.runIdle()
  assert.equal(h.video.playRequests.length,1)
  assert.equal(h.video.getAttribute('src'),'https://jaye.example/jaye-video-background.mp4')
  assert.equal(h.root.classList.contains('jaye-video-background-active'),false,'shown only once it is playing')
  h.video.playRequests[0].resolve(); await tick()
  assert.equal(h.root.classList.contains('jaye-video-background-active'),true)
  assert.deepEqual(h.choices,[],'the default is not a choice: nothing is announced, so nothing can be saved')
})
test('first visit, page already loaded: the video still waits for idle',()=>{
  const h=makeHarness({mode:'video',readyState:'complete'})
  assert.equal(h.video.playRequests.length,0)
  h.runIdle()
  assert.equal(h.video.playRequests.length,1)
})
test('first visit in a background tab: nothing is fetched until the tab is shown, then the video starts',async()=>{
  const h=makeHarness({mode:'video'})
  h.document.hidden=true
  h.runIdle()
  assert.equal(h.video.playRequests.length,0)
  assert.equal(h.video.hasAttribute('src'),false)
  h.document.hidden=false; h.document.dispatch('visibilitychange')
  assert.equal(h.video.playRequests.length,1)
  h.video.playRequests[0].resolve(); await tick()
  assert.equal(h.root.classList.contains('jaye-video-background-active'),true)
  assert.deepEqual(h.choices,[])
})
test('pressing the switch while the first-visit video is still waiting cancels it, chooses Saturn and remembers that',async()=>{
  const h=makeHarness({mode:'video',readyState:'loading'})
  click(h.button)
  assert.deepEqual(h.choices,[{mode:'saturn',manual:true}])
  assert.equal(h.button.attributes['aria-pressed'],'false')
  h.window.dispatch('load'); h.runIdle(); await tick()
  assert.equal(h.video.playRequests.length,0,'the cancelled start never reaches the network')
  assert.equal(h.video.hasAttribute('src'),false)
})
test('first visit: autoplay refused, unsupported or broken file puts Saturn on for this visit without saving it',async()=>{
  const h=makeHarness({mode:'video'})
  h.runIdle()
  const error=new Error('play() failed because the user did not interact'); error.name='NotAllowedError'
  h.video.playRequests[0].reject(error); await tick()
  assert.deepEqual(h.choices,[{mode:'saturn',manual:false}],'announced as a fallback, not as a deliberate choice')
  assert.equal(h.video.hasAttribute('src'),false)
  assert.equal(h.root.classList.contains('jaye-video-background-active'),false)
  assert.equal(h.button.attributes['aria-pressed'],'false')
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
  assert.deepEqual(h.choices,[{mode:'video',manual:true},{mode:'saturn',manual:true}],'both presses are deliberate choices, so both are remembered')
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
  assert.deepEqual(h.choices,[{mode:'video',manual:true},{mode:'saturn',manual:false}],'the visitor asked for video; the failure falls back to Saturn without being saved')
})
test('an unexpected pause gets at most one event-driven recovery attempt',async()=>{
  const h=makeHarness(); click(h.button); h.video.playRequests[0].resolve(); await tick()
  h.video.paused=true; h.video.dispatch('pause')
  assert.equal(h.video.playRequests.length,2)
  h.video.paused=true; h.video.dispatch('pause')
  assert.equal(h.video.playRequests.length,2)
})
// ---- the photograph backgrounds (the real script against a fake DOM and a fake Image) ----
const flush=()=>new Promise(resolve=>setTimeout(resolve,0))
function makeImageHarness({mode='saturn'}={}) {
  const root=new FakeElement({'data-jaye-bg':mode}), made=[], choices=[], events=[]
  const el=(extra={})=>Object.assign(new FakeElement(),{contains:()=>false},extra)
  const switcher=el(), nudge=el(), panel=el(), closeButton=el(), layer=el({style:{}}), video=new FakeVideo(), mainButton=switcher
  const option=key=>el({key,getAttribute(name){return name==='data-jaye-image-bg'?key:null}})
  const options=[option('amber'),option('noir')]
  panel.querySelectorAll=selector=>selector==='[data-jaye-image-bg]'?options:[]
  const document={
    baseURI:'https://jaye.example/',documentElement:root,listeners:new Map(),
    getElementById(id){return {'jaye-background-switch':switcher,'jaye-image-background-layer':layer,'jaye-image-background-nudge':nudge,'jaye-image-background-panel':panel,'jaye-image-panel-close':closeButton,'jaye-global-video-background':video}[id]??null},
    addEventListener(type,callback){const list=this.listeners.get(type)??[];list.push(callback);this.listeners.set(type,list)},
    dispatchEvent(event){events.push(event.type);if(event.type==='jaye-background-choice')choices.push(JSON.parse(JSON.stringify(event.detail)));for(const callback of this.listeners.get(event.type)??[])callback(event);return true}
  }
  class FakeImage { constructor(){made.push(this);this.src='';this.decode=()=>Promise.resolve()} }
  vm.runInNewContext(imageScript,{document,Image:FakeImage,Event,CustomEvent,Promise,window:{}})
  return {root,made,choices,events,options,layer,mainButton}
}
test('nothing is fetched in advance: a page on the video or Saturn creates no photograph request',async()=>{
  for (const mode of ['video','saturn']) { const h=makeImageHarness({mode}); await flush(); assert.equal(h.made.length,0,mode) }
})
test('a saved photograph is the only file fetched, at full priority, and is shown only once it is decoded',async()=>{
  const h=makeImageHarness({mode:'amber'})
  assert.equal(h.made.length,1)
  assert.equal(h.made[0].src,'assets/amber-background.jpg')
  assert.equal(h.made[0].fetchPriority,'high')
  await flush()
  assert.equal(h.root.classList.contains('jaye-image-background-active'),false,'not shown while it is still downloading')
  h.made[0].onload(); await flush()
  assert.equal(h.root.classList.contains('jaye-image-background-active'),true)
  assert.equal(h.layer.style.backgroundImage,'url("assets/amber-background.jpg")')
  assert.deepEqual(h.choices,[{mode:'amber',manual:false}],'applying a saved choice is not a new choice, so it is not written again')
  assert.equal(h.mainButton.textContent,'CHANGE BACKGROUND')
})
test('a saved photograph that cannot load puts Saturn on for this visit without saving it',async()=>{
  const h=makeImageHarness({mode:'noir'})
  h.made[0].onerror(); await flush()
  assert.equal(h.root.classList.contains('jaye-image-background-active'),false)
  assert.deepEqual(h.choices,[{mode:'saturn',manual:false}])
})
test('picking a photograph is a deliberate choice, and one made while a saved photograph is still loading wins',async()=>{
  const h=makeImageHarness({mode:'amber'})
  h.options[1].dispatch('click')
  assert.equal(h.made.length,2)
  assert.equal(h.made[1].src,'assets/noir-background.jpg')
  h.made[0].onload(); h.made[1].onload(); await flush()
  assert.equal(h.layer.style.backgroundImage,'url("assets/noir-background.jpg")')
  assert.deepEqual(h.choices,[{mode:'noir',manual:true}],'only the deliberate pick is announced (and so remembered)')
})
test('picking a photograph from a page that opened on the video fetches that one file only when it is picked',async()=>{
  const h=makeImageHarness({mode:'video'})
  assert.equal(h.made.length,0)
  h.options[0].dispatch('click'); h.made[0].onload(); await flush()
  assert.equal(h.made.length,1)
  assert.deepEqual(h.choices,[{mode:'amber',manual:true}])
  assert.ok(h.events.includes('jaye-background-image-selected'),'the video is still told to stand down')
})
test('the photograph code has no warm-up of its own: no DOMContentLoaded prefetch of both photos, no video prefetch, thumbnails still wait for the visitor',()=>{
  assert.doesNotMatch(imageScript,/DOMContentLoaded|photosSettled|pageLoaded|preload\s*=|video\.setAttribute\('src'/)
  assert.ok(imageScript.includes('const warmUp=key=>warm[key]||(warm[key]=new Promise'))
  assert.match(imageScript,/\['pointerenter','pointerdown','focusin'\]\.forEach/)
  assert.ok(imageScript.includes('jaye-background-image-selected'))
  assert.ok(html.includes('data-deferred-src="assets/amber-background.jpg" alt="Orange-haired manga character" loading="eager"'))
  assert.ok(html.includes('data-deferred-src="assets/noir-background.jpg" alt="Black-haired manga character" loading="eager"'))
})
