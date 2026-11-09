// Where Baew's resting corner is clear, and where she should rise to when it is not.
//
// Geometry only: this module reads layout (rects, visibility) and does arithmetic. It never writes to the page.
// `getContentBoxes` finds everything on screen Baew should not sit on, and `findHomeShift` picks the smallest
// move away from her CSS corner that leaves her clear of all of it. Behaviour is identical to the version that
// lived inside StrobiGuide.tsx: this is the same code, moved so it can be tested against the page on its own.
// (A cheaper scan was tried: caching each parent's rect and skipping display:none subtrees cut layout reads by 65%
// but measured no faster, because layout reads are cheap once layout is clean. It was not kept.)

export const FLOAT_CONTROL_SELECTOR =
  'a[href], button, input, select, textarea, summary, audio, video[controls], [role="button"], [role="link"], [role="tab"], [role="slider"], [contenteditable="true"], [tabindex]:not([tabindex="-1"])'
export const HOME_PAD = 8            // breathing room kept around whatever she must not cover
export const HOME_SIDE_COST = 1.5    // sideways costs more than rising, so she stays on the left where she can

export type Box = { left: number; top: number; right: number; bottom: number }

export function overlapArea(a: Box, b: Box): number {
  const width = Math.min(a.right, b.right) - Math.max(a.left, b.left)
  const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
  return width > 0 && height > 0 ? width * height : 0
}

// Visible on-screen controls Baew should not park on top of. Page-sized wrappers are skipped:
// they are containers, and dodging them would leave nowhere to go.
export function getControlBoxes(viewWidth: number, viewHeight: number): Box[] {
  const boxes: Box[] = []
  for (const element of document.querySelectorAll<HTMLElement>(FLOAT_CONTROL_SELECTOR)) {
    if (element.closest('#strobi-widget-root, #strobi-widget, .restore-strobi')) continue
    const rect = element.getBoundingClientRect()
    if (rect.width < 4 || rect.height < 4) continue
    if (rect.bottom < 0 || rect.top > viewHeight || rect.right < 0 || rect.left > viewWidth) continue
    if (rect.width * rect.height > viewWidth * viewHeight * 0.35) continue
    if (typeof element.checkVisibility === 'function' && !element.checkVisibility({ checkVisibilityCSS: true })) continue
    boxes.push({ left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom })
  }
  return boxes
}

export type HomeShift = { dx: number; lift: number }

// Everything on screen Baew's home should not sit on: the controls the idle float already avoids, plus
// text (line by line, so a paragraph's empty margin does not count), images and icons. Full-screen
// backgrounds are skipped for the same reason as in getControlBoxes.
export function getContentBoxes(viewWidth: number, viewHeight: number): Box[] {
  const boxes = getControlBoxes(viewWidth, viewHeight)
  const ours = '#strobi-widget-root, #strobi-widget, .restore-strobi, #jaye-background-switch'
  const onScreen = (rect: DOMRect) =>
    rect.width >= 2 && rect.height >= 2 && rect.bottom > 0 && rect.top < viewHeight && rect.right > 0 && rect.left < viewWidth
  const shown = (element: Element) =>
    typeof element.checkVisibility !== 'function' || element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.nodeValue || !/\S/.test(node.nodeValue)) continue
    const parent = node.parentElement
    if (!parent || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(parent.tagName) || parent.closest(ours)) continue
    if (!onScreen(parent.getBoundingClientRect()) || !shown(parent)) continue
    range.selectNodeContents(node)
    for (const rect of range.getClientRects()) {
      if (onScreen(rect)) boxes.push({ left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom })
    }
  }
  for (const element of document.querySelectorAll<Element>('svg, img, [role="img"]')) {
    if (element.closest(ours) || element.parentElement?.closest('svg')) continue
    const rect = element.getBoundingClientRect()
    if (!onScreen(rect) || rect.width * rect.height > viewWidth * viewHeight * 0.35 || !shown(element)) continue
    boxes.push({ left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom })
  }
  return boxes
}

// The smallest move away from the CSS home corner that leaves Baew's visible footprint (mascot, label and
// hide button) clear of every obstacle. Rising is preferred to moving sideways. Stays put where the corner
// is already clear, keeps a spot that is still clear (no fidgeting after a scroll), and, if nothing is fully
// clear, takes the least-covered spot only when it is clearly better than the corner.
export function findHomeShift(
  footprint: Box,
  home: { left: number; top: number; width: number },
  viewWidth: number,
  obstacles: Box[],
  current: HomeShift,
): HomeShift {
  const margin = 8
  const maxDx = Math.max(0, viewWidth - home.width - margin - home.left)
  const maxLift = Math.max(0, home.top - margin)
  const areaAt = (dx: number, lift: number): Box => {
    const left = home.left + dx
    const top = home.top - lift
    return {
      left: left + footprint.left - HOME_PAD,
      top: top + footprint.top - HOME_PAD,
      right: left + footprint.right + HOME_PAD,
      bottom: top + footprint.bottom + HOME_PAD,
    }
  }
  const blocked = (dx: number, lift: number) => {
    const area = areaAt(dx, lift)
    return obstacles.some(obstacle => overlapArea(area, obstacle) > 0)
  }
  const covered = (dx: number, lift: number) => {
    const area = areaAt(dx, lift)
    return obstacles.reduce((sum, obstacle) => sum + overlapArea(area, obstacle), 0)
  }

  if (!blocked(0, 0)) return { dx: 0, lift: 0 }
  if ((current.dx > 0 || current.lift > 0) && current.dx <= maxDx && current.lift <= maxLift && !blocked(current.dx, current.lift)) return current

  let best: (HomeShift & { cost: number }) | null = null
  for (let dx = 0; dx <= maxDx; dx += 6) {
    if (best && dx * HOME_SIDE_COST >= best.cost) break
    for (let lift = 0; lift <= maxLift; lift += 2) {
      if (best && lift + dx * HOME_SIDE_COST >= best.cost) break
      if (!blocked(dx, lift)) {
        best = { dx, lift, cost: lift + dx * HOME_SIDE_COST }
        break
      }
    }
  }
  if (best) return { dx: best.dx, lift: best.lift }

  const homeCover = covered(0, 0)
  let least = { dx: 0, lift: 0, cover: homeCover }
  for (let dx = 0; dx <= maxDx; dx += 12) {
    for (let lift = 0; lift <= maxLift; lift += 8) {
      const cover = covered(dx, lift)
      if (cover < least.cover - 1) least = { dx, lift, cover }
    }
  }
  return least.cover < homeCover * 0.75 ? { dx: least.dx, lift: least.lift } : { dx: 0, lift: 0 }
}
