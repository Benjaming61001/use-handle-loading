/** A hook may be sync or async; a returned promise is awaited before the next hook runs. */
export type Hook<TArgs extends unknown[]> = (...args: TArgs) => unknown

export interface HandleLoadingOptions<T> {
  onSuccess?: Hook<[result: T]>[]
  onError?: Hook<[error: unknown]>[]
  onFinally?: Hook<[]>[]
  setLoading?: (loading: boolean) => void
  validateSuccess?: (result: T) => boolean
  validateError?: (error: unknown) => boolean
  validateFinally?: () => boolean
}

async function runHooks<TArgs extends unknown[]>(
  hooks: Hook<TArgs>[] | undefined,
  ...args: TArgs
): Promise<void> {
  for (const hook of hooks ?? []) {
    await hook(...args)
  }
}

export async function handleLoading<T, TArgs extends unknown[]>(
  callback: (...args: TArgs) => T | Promise<T>,
  options: HandleLoadingOptions<T> = {},
  ...args: TArgs
): Promise<T | undefined> {
  const {
    onSuccess,
    onError,
    onFinally,
    setLoading,
    validateSuccess = () => true,
    validateError = () => true,
    validateFinally = () => true
  } = options

  setLoading?.(true)

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
    setLoading?.(false)
    if (validateFinally()) {
      await runHooks(onFinally)
    }
  }
}

export class HandleLoadingBuilder {
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

  build() {
    // Snapshot the hook arrays so hooks added to the builder after build() don't leak into this handler
    const defaults: HandleLoadingOptions<unknown> = {
      ...this.options,
      onSuccess: [...(this.options.onSuccess ?? [])],
      onError: [...(this.options.onError ?? [])],
      onFinally: [...(this.options.onFinally ?? [])]
    }
    return <T, TArgs extends unknown[]>(
      callback: (...args: TArgs) => T | Promise<T>,
      overrides: {
        onSuccess?: Hook<[result: T]>[]
        onError?: Hook<[error: unknown]>[]
        onFinally?: Hook<[]>[]
        setLoading?: (loading: boolean) => void
        validateSuccess?: (result: T) => boolean
        validateError?: (error: unknown) => boolean
        validateFinally?: () => boolean
      } = {},
      ...args: TArgs
    ) => {
      const merged: HandleLoadingOptions<T> = {
        setLoading: overrides.setLoading ?? (defaults.setLoading as (loading: boolean) => void),
        validateSuccess:
          overrides.validateSuccess ?? (defaults.validateSuccess as (result: T) => boolean),
        validateError:
          overrides.validateError ?? (defaults.validateError as (error: unknown) => boolean),
        validateFinally: overrides.validateFinally ?? (defaults.validateFinally as () => boolean),
        onSuccess: [...(defaults.onSuccess as Hook<[result: T]>[]), ...(overrides.onSuccess ?? [])],
        onError: [...(defaults.onError as Hook<[error: unknown]>[]), ...(overrides.onError ?? [])],
        onFinally: [...(defaults.onFinally as Hook<[]>[]), ...(overrides.onFinally ?? [])]
      }
      return handleLoading(callback, merged, ...args)
    }
  }
}

export function createHandleLoading(): HandleLoadingBuilder {
  return new HandleLoadingBuilder()
}
