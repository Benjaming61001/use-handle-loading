// Running-call count per setLoading function, so overlapping calls that share one setLoading
// (e.g. through a built handler) report loading `true` on the first start and `false` only after
// the last call finishes. WeakMap: entries go away with the function.
const pending = new WeakMap<(loading: boolean) => void, number>()

export function startLoading(setLoading?: (loading: boolean) => void): void {
  if (!setLoading) return
  const count = pending.get(setLoading) ?? 0
  pending.set(setLoading, count + 1)
  if (count === 0) {
    try {
      setLoading(true)
    } catch (error) {
      // Undo the increment: this call never reaches stopLoading, so the count would stay stuck
      pending.delete(setLoading)
      throw error
    }
  }
}

export function stopLoading(setLoading?: (loading: boolean) => void): void {
  if (!setLoading) return
  const count = (pending.get(setLoading) ?? 1) - 1
  if (count > 0) {
    pending.set(setLoading, count)
    return
  }
  pending.delete(setLoading)
  setLoading(false)
}
