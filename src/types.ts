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

/** Chainable builder for a pre-configured `handleLoading`. Hooks are appended; the other setters replace. */
export interface IHandleLoadingBuilder {
  /** Add an `onSuccess` hook (appended; runs before per-call `onSuccess` hooks). */
  setSuccess(fn: Hook<[result: unknown]>): this
  /** Add an `onError` hook (appended; runs before per-call `onError` hooks). */
  setError(fn: Hook<[error: unknown]>): this
  /** Add an `onFinally` hook (appended; runs before per-call `onFinally` hooks). */
  setFinally(fn: Hook<[]>): this
  /** Set the loading handler (replaces any previous one; a per-call `setLoading` overrides it). */
  setLoading(fn: (loading: boolean) => void): this
  /** Set the check that decides whether `onSuccess` hooks run. */
  setValidateSuccess(fn: (result: unknown) => boolean): this
  /** Set the check that decides whether `onError` hooks run. */
  setValidateError(fn: (error: unknown) => boolean): this
  /** Set the check that decides whether `onFinally` hooks run. */
  setValidateFinally(fn: () => boolean): this
  /** Set the handler for errors thrown by hooks, validators or setLoading (replaces any previous one; a per-call `onHookError` overrides it). */
  setHookError(fn: HookErrorHandler): this
  /** Create a handler with a snapshot of the current configuration. */
  build(): HandleLoadingFn
}
