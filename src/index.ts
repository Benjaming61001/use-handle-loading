import { runHooks, safeValidate, safeValidateAsync, settle } from './hooks'
import type { Settled } from './hooks'
import { safeStartLoading, safeStopLoading } from './loading'
import type {
  HandleLoadingFn,
  HandleLoadingOptions,
  Hook,
  HookErrorHandler,
  IHandleLoadingBuilder
} from './types'

export type {
  HandleLoadingFn,
  HandleLoadingOptions,
  Hook,
  HookErrorHandler,
  HookErrorSource,
  IHandleLoadingBuilder
} from './types'

export const handleLoading: HandleLoadingFn = async (callback, options = {}, ...args) => {
  const {
    onSuccess,
    onError,
    onFinally,
    setLoading,
    validateBefore,
    validateSuccess = () => true,
    validateError = () => true,
    validateFinally = () => true,
    onHookError
  } = options

  // Nothing below throws: hooks, validators and setLoading report errors to onHookError instead,
  // so only the callback's own outcome decides the result.
  const started = safeStartLoading(setLoading, onHookError)
  const proceed =
    !validateBefore || (await safeValidateAsync(validateBefore, 'validateBefore', onHookError))

  // undefined: validateBefore said no, so the callback never ran
  let outcome: Settled<ReturnType<typeof callback>> | undefined
  if (proceed) {
    outcome = await settle(() => callback(...args))

    if (outcome.ok) {
      if (safeValidate(validateSuccess, 'validateSuccess', onHookError, outcome.value)) {
        await runHooks(onSuccess, 'onSuccess', onHookError, outcome.value)
      }
    } else if (!onError?.length) {
      console.error('[use-handle-loading] unhandled error (no onError hooks):', outcome.error)
    } else if (safeValidate(validateError, 'validateError', onHookError, outcome.error)) {
      await runHooks(onError, 'onError', onHookError, outcome.error)
    }
  }

  if (started) safeStopLoading(setLoading, onHookError)
  if (safeValidate(validateFinally, 'validateFinally', onHookError)) {
    await runHooks(onFinally, 'onFinally', onHookError)
  }

  return outcome?.ok ? outcome.value : undefined
}

/**
 * Immutable: every setter returns a new builder and leaves this one unchanged, so one base builder can be
 * extended into several handlers in any order.
 */
export class HandleLoadingBuilder implements IHandleLoadingBuilder {
  constructor(private readonly options: Readonly<HandleLoadingOptions<unknown>> = {}) {}

  private with(patch: HandleLoadingOptions<unknown>): IHandleLoadingBuilder {
    return new HandleLoadingBuilder({ ...this.options, ...patch })
  }

  setSuccess(fn: Hook<[result: unknown]>): IHandleLoadingBuilder {
    return this.with({ onSuccess: [...(this.options.onSuccess ?? []), fn] })
  }

  setError(fn: Hook<[error: unknown]>): IHandleLoadingBuilder {
    return this.with({ onError: [...(this.options.onError ?? []), fn] })
  }

  setFinally(fn: Hook<[]>): IHandleLoadingBuilder {
    return this.with({ onFinally: [...(this.options.onFinally ?? []), fn] })
  }

  replaceSuccess(...fns: Hook<[result: unknown]>[]): IHandleLoadingBuilder {
    return this.with({ onSuccess: fns })
  }

  replaceError(...fns: Hook<[error: unknown]>[]): IHandleLoadingBuilder {
    return this.with({ onError: fns })
  }

  replaceFinally(...fns: Hook<[]>[]): IHandleLoadingBuilder {
    return this.with({ onFinally: fns })
  }

  setLoading(fn: (loading: boolean) => void): IHandleLoadingBuilder {
    return this.with({ setLoading: fn })
  }

  setValidateBefore(fn: () => boolean | Promise<boolean>): IHandleLoadingBuilder {
    return this.with({ validateBefore: fn })
  }

  setValidateSuccess(fn: (result: unknown) => boolean): IHandleLoadingBuilder {
    return this.with({ validateSuccess: fn })
  }

  setValidateError(fn: (error: unknown) => boolean): IHandleLoadingBuilder {
    return this.with({ validateError: fn })
  }

  setValidateFinally(fn: () => boolean): IHandleLoadingBuilder {
    return this.with({ validateFinally: fn })
  }

  setHookError(fn: HookErrorHandler): IHandleLoadingBuilder {
    return this.with({ onHookError: fn })
  }

  build(): HandleLoadingFn {
    // No snapshot needed: this builder's options (and their hook arrays) are never mutated
    const defaults = this.options
    return (callback, overrides = {}, ...args) => {
      // Hooks/validators typed for `unknown` are assignable to ones for `T`, so no casts are needed
      const merged: typeof overrides = {
        setLoading: overrides.setLoading ?? defaults.setLoading,
        validateBefore: overrides.validateBefore ?? defaults.validateBefore,
        validateSuccess: overrides.validateSuccess ?? defaults.validateSuccess,
        validateError: overrides.validateError ?? defaults.validateError,
        validateFinally: overrides.validateFinally ?? defaults.validateFinally,
        onHookError: overrides.onHookError ?? defaults.onHookError,
        // Per-call hook lists replace the builder's (same rule as the other options)
        onSuccess: overrides.onSuccess ?? defaults.onSuccess,
        onError: overrides.onError ?? defaults.onError,
        onFinally: overrides.onFinally ?? defaults.onFinally
      }
      return handleLoading(callback, merged, ...args)
    }
  }
}

export function createHandleLoading(): IHandleLoadingBuilder {
  return new HandleLoadingBuilder()
}
