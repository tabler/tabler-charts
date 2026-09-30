/** Valid XML-ish tag and attribute names; anything else is skipped by renderers. */
const NAME_RE = /^[a-zA-Z_][\w:.-]*$/

/** Inline event handler attributes (`onclick`, `onLoad`…) are never rendered. */
const EVENT_RE = /^on/i

/** Whether a tag name is safe to render. */
export function isValidTag(name: string): boolean {
  return NAME_RE.test(name)
}

/** Whether an attribute name is safe to render. */
export function isValidAttr(name: string): boolean {
  return NAME_RE.test(name) && !EVENT_RE.test(name)
}
