import { runHooks, safeValidate, settle } from './hooks'
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
    validateSuccess = () => true,
    validateError = () => true,
    validateFinally = () => true,
    onHookError
  } = options

  // Nothing below throws: hooks, validators and setLoading report errors to onHookError instead,
  // so only the callback's own outcome decides the result.
  const started = safeStartLoading(setLoading, onHookError)
  const outcome = await settle(() => callback(...args))

  if (outcome.ok) {
    if (safeValidate(validateSuccess, 'validateSuccess', onHookError, outcome.value)) {
      await runHooks(onSuccess, 'onSuccess', onHookError, outcome.value)
    }
  } else if (!onError?.length) {
    console.error('[use-handle-loading] unhandled error (no onError hooks):', outcome.error)
  } else if (safeValidate(validateError, 'validateError', onHookError, outcome.error)) {
    await runHooks(onError, 'onError', onHookError, outcome.error)
  }

  if (started) safeStopLoading(setLoading, onHookError)
  if (safeValidate(validateFinally, 'validateFinally', onHookError)) {
    await runHooks(onFinally, 'onFinally', onHookError)
  }

  return outcome.ok ? outcome.value : undefined
}

export class HandleLoadingBuilder implements IHandleLoadingBuilder {
  private options: HandleLoadingOptions<unknown> = {
    onSuccess: [],
    onError: [],
    onFinally: []
  }

  setSuccess(fn: Hook<[result: unknown]>): this {
    this.options.onSuccess!.push(fn)
    return this
  }

  setError(fn: Hook<[error: unknown]>): this {
    this.options.onError!.push(fn)
    return this
  }

  setFinally(fn: Hook<[]>): this {
    this.options.onFinally!.push(fn)
    return this
  }

  setLoading(fn: (loading: boolean) => void): this {
    this.options.setLoading = fn
    return this
  }

  setValidateSuccess(fn: (result: unknown) => boolean): this {
    this.options.validateSuccess = fn
    return this
  }

  setValidateError(fn: (error: unknown) => boolean): this {
    this.options.validateError = fn
    return this
  }

  setValidateFinally(fn: () => boolean): this {
    this.options.validateFinally = fn
    return this
  }

  setHookError(fn: HookErrorHandler): this {
    this.options.onHookError = fn
    return this
  }

  build(): HandleLoadingFn {
    // Snapshot the hook arrays so hooks added to the builder after build() don't leak into this handler
    const defaults: HandleLoadingOptions<unknown> = {
      ...this.options,
      onSuccess: [...(this.options.onSuccess ?? [])],
      onError: [...(this.options.onError ?? [])],
      onFinally: [...(this.options.onFinally ?? [])]
    }
    return (callback, overrides = {}, ...args) => {
      // Hooks/validators typed for `unknown` are assignable to ones for `T`, so no casts are needed
      const merged: typeof overrides = {
        setLoading: overrides.setLoading ?? defaults.setLoading,
        validateSuccess: overrides.validateSuccess ?? defaults.validateSuccess,
        validateError: overrides.validateError ?? defaults.validateError,
        validateFinally: overrides.validateFinally ?? defaults.validateFinally,
        onHookError: overrides.onHookError ?? defaults.onHookError,
        onSuccess: [...(defaults.onSuccess ?? []), ...(overrides.onSuccess ?? [])],
        onError: [...(defaults.onError ?? []), ...(overrides.onError ?? [])],
        onFinally: [...(defaults.onFinally ?? []), ...(overrides.onFinally ?? [])]
      }
      return handleLoading(callback, merged, ...args)
    }
  }
}

export function createHandleLoading(): IHandleLoadingBuilder {
  return new HandleLoadingBuilder()
}
