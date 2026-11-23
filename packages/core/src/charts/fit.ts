import { estimateTextWidth } from '../layout.ts'

/** `text` cut to `width` pixels with an ellipsis, or `''` when not even a few letters fit. */
export function fit(text: string, width: number, fontSize: number): string {
  if (estimateTextWidth(text, fontSize) <= width) return text
  const chars = [...text]
  while (chars.length > 2) {
    chars.pop()
    const cut = `${chars.join('').trimEnd()}…`
    if (estimateTextWidth(cut, fontSize) <= width) return cut
  }
  return ''
}
