/** A random number generator that gives the same numbers on every run, so made-up data never changes a picture. */
export function seeded(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }
}
