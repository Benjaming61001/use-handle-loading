/**
 * A hook may be sync or async; a returned promise is awaited before the next hook runs. The return value is otherwise
 * ignored (`unknown`, not `void | Promise<void>`, so hooks like `(r) => list.push(r)` still type-check).
 */
export type Hook<TArgs extends unknown[]> = (...args: TArgs) => unknown

/** Which part of a `handleLoading` call threw, as reported to `onHookError`. */
export type HookErrorSource =
  | 'onSuccess'
  | 'onError'
  | 'onFinally'
  | 'setLoading'
  | 'validateBefore'
  | 'validateSuccess'
  | 'validateError'
  | 'validateFinally'

/** Receives errors thrown by hooks, validators or `setLoading`, so they don't change the call's result. */
export type HookErrorHandler = (error: unknown, source: HookErrorSource) => void

export interface HandleLoadingOptions<T> {
  onSuccess?: Hook<[result: T]>[]
  onError?: Hook<[error: unknown]>[]
  onFinally?: Hook<[]>[]
  setLoading?: (loading: boolean) => void
  /**
   * Runs after `setLoading(true)`, before the callback (e.g. form validation). Returning `false` (or throwing) skips the
   * callback and its `onSuccess`/`onError` hooks; loading still stops, `onFinally` still runs, and the call resolves
   * `undefined`.
   */
  validateBefore?: () => boolean | Promise<boolean>
  validateSuccess?: (result: T) => boolean
  validateError?: (error: unknown) => boolean
  validateFinally?: () => boolean
  /**
   * Called when a hook, validator or `setLoading` throws. The call's result is unchanged: a throwing validator
   * counts as `false` (its hooks are skipped), and a throwing hook doesn't stop the rest of its list.
   * Defaults to `console.error`.
   */
  onHookError?: HookErrorHandler
}

/** Signature shared by `handleLoading` and every handler returned by `HandleLoadingBuilder.build()`. */
export type HandleLoadingFn = <T, TArgs extends unknown[]>(
  callback: (...args: TArgs) => T | Promise<T>,
  options?: HandleLoadingOptions<T>,
  ...args: TArgs
) => Promise<T | undefined>

/**
 * Immutable chainable builder for a pre-configured `handleLoading`: every method returns a new builder and leaves the
 * original unchanged. Hook setters add to a list; the other setters replace. A per-call option (hook list included)
 * replaces the builder's.
 */
export interface IHandleLoadingBuilder {
  /** Add an `onSuccess` hook (added to the builder's list; a per-call `onSuccess` replaces the whole list). */
  setSuccess(fn: Hook<[result: unknown]>): IHandleLoadingBuilder
  /** Add an `onError` hook (added to the builder's list; a per-call `onError` replaces the whole list). */
  setError(fn: Hook<[error: unknown]>): IHandleLoadingBuilder
  /** Add an `onFinally` hook (added to the builder's list; a per-call `onFinally` replaces the whole list). */
  setFinally(fn: Hook<[]>): IHandleLoadingBuilder
  /** Replace the builder's `onSuccess` hooks with these (none: clear them). */
  replaceSuccess(...fns: Hook<[result: unknown]>[]): IHandleLoadingBuilder
  /** Replace the builder's `onError` hooks with these (none: clear them). */
  replaceError(...fns: Hook<[error: unknown]>[]): IHandleLoadingBuilder
  /** Replace the builder's `onFinally` hooks with these (none: clear them). */
  replaceFinally(...fns: Hook<[]>[]): IHandleLoadingBuilder
  /** Set the loading handler (replaces any previous one; a per-call `setLoading` overrides it). */
  setLoading(fn: (loading: boolean) => void): IHandleLoadingBuilder
  /** Set the check that decides whether the callback runs at all (e.g. form validation). */
  setValidateBefore(fn: () => boolean | Promise<boolean>): IHandleLoadingBuilder
  /** Set the check that decides whether `onSuccess` hooks run. */
  setValidateSuccess(fn: (result: unknown) => boolean): IHandleLoadingBuilder
  /** Set the check that decides whether `onError` hooks run. */
  setValidateError(fn: (error: unknown) => boolean): IHandleLoadingBuilder
  /** Set the check that decides whether `onFinally` hooks run. */
  setValidateFinally(fn: () => boolean): IHandleLoadingBuilder
  /** Set the handler for errors thrown by hooks, validators or setLoading (replaces any previous one; a per-call `onHookError` overrides it). */
  setHookError(fn: HookErrorHandler): IHandleLoadingBuilder
  /** Create a handler with a snapshot of the current configuration. */
  build(): HandleLoadingFn
}
