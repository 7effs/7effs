// Geometry helpers for Baew's occasional idle glide.
// Only visible interactive controls are considered; the fixed resting position does not scan page text or images.

export const FLOAT_CONTROL_SELECTOR =
  'a[href], button, input, select, textarea, summary, audio, video[controls], [role="button"], [role="link"], [role="tab"], [role="slider"], [contenteditable="true"], [tabindex]:not([tabindex="-1"])'
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
