import { runHooks } from './hooks'
import { startLoading, stopLoading } from './loading'
import type { HandleLoadingFn, HandleLoadingOptions, Hook, IHandleLoadingBuilder } from './types'

export type { HandleLoadingFn, HandleLoadingOptions, Hook, IHandleLoadingBuilder } from './types'

export const handleLoading: HandleLoadingFn = async (callback, options = {}, ...args) => {
  const {
    onSuccess,
    onError,
    onFinally,
    setLoading,
    validateSuccess = () => true,
    validateError = () => true,
    validateFinally = () => true
  } = options

  startLoading(setLoading)

  try {
    const result = await callback(...args)
    if (validateSuccess(result)) {
      await runHooks(onSuccess, result)
    }
    return result
  } catch (error) {
    if (validateError(error)) {
      await runHooks(onError, error)
    }
    return undefined
  } finally {
    stopLoading(setLoading)
    if (validateFinally()) {
      await runHooks(onFinally)
    }
  }
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
