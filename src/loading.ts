import { reportHookError } from './hooks'
import type { HookErrorHandler } from './types'

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

/** Start loading; if setLoading(true) throws, report it and return false (the call goes ahead without a spinner). */
export function safeStartLoading(
  setLoading: ((loading: boolean) => void) | undefined,
  handler?: HookErrorHandler
): boolean {
  try {
    startLoading(setLoading)
    return true
  } catch (error) {
    reportHookError(handler, error, 'setLoading')
    return false
  }
}

/** Stop loading; if setLoading(false) throws, report it instead of rejecting the call. */
export function safeStopLoading(
  setLoading: ((loading: boolean) => void) | undefined,
  handler?: HookErrorHandler
): void {
  try {
    stopLoading(setLoading)
  } catch (error) {
    reportHookError(handler, error, 'setLoading')
  }
}
