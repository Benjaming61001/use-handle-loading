import type { Hook, HookErrorHandler, HookErrorSource } from './types'

/**
 * Run hooks in order, awaiting each. A hook that throws or rejects is reported and the remaining hooks still run,
 * so a failing hook never changes the call's result.
 */
export async function runHooks<TArgs extends unknown[]>(
  hooks: Hook<TArgs>[] | undefined,
  source: HookErrorSource,
  handler: HookErrorHandler | undefined,
  ...args: TArgs
): Promise<void> {
  for (const hook of hooks ?? []) {
    try {
      await hook(...args)
    } catch (error) {
      reportHookError(handler, error, source)
    }
  }
}

export type Settled<R> = { ok: true; value: Awaited<R> } | { ok: false; error: unknown }

/** Run the callback and capture its outcome, so only the callback's own error counts as a failure. */
export async function settle<R>(fn: () => R | Promise<R>): Promise<Settled<R>> {
  try {
    return { ok: true, value: await fn() }
  } catch (error) {
    return { ok: false, error }
  }
}

function defaultHookError(error: unknown, source: HookErrorSource): void {
  console.error(`[use-handle-loading] ${source} threw:`, error)
}

/** Report a hook/validator error without letting it escape (a throwing handler falls back to console.error). */
export function reportHookError(
  handler: HookErrorHandler | undefined,
  error: unknown,
  source: HookErrorSource
): void {
  try {
    ;(handler ?? defaultHookError)(error, source)
  } catch (handlerError) {
    defaultHookError(handlerError, source)
  }
}

/** Run a validator; if it throws, report the error and treat the result as `false`. */
export function safeValidate<TArgs extends unknown[]>(
  validate: (...args: TArgs) => boolean,
  source: HookErrorSource,
  handler: HookErrorHandler | undefined,
  ...args: TArgs
): boolean {
  try {
    return validate(...args)
  } catch (error) {
    reportHookError(handler, error, source)
    return false
  }
}
