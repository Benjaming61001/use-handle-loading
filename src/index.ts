export interface HandleLoadingOptions<T> {
  onSuccess?: ((result: T) => void)[]
  onError?: ((error: unknown) => void)[]
  onFinally?: (() => void)[]
  setLoading?: (loading: boolean) => void
  validateSuccess?: (result: T) => boolean
  validateError?: (error: unknown) => boolean
  validateFinally?: () => boolean
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
      onSuccess?.forEach((fn) => fn(result))
    }
    return result
  } catch (error) {
    if (validateError(error)) {
      onError?.forEach((fn) => fn(error))
    }
    return undefined
  } finally {
    setLoading?.(false)
    if (validateFinally()) {
      onFinally?.forEach((fn) => fn())
    }
  }
}

export class HandleLoadingBuilder {
  private options: HandleLoadingOptions<unknown> = {
    onSuccess: [],
    onError: [],
    onFinally: []
  }

  setSuccess(fn: (result: unknown) => void): this {
    this.options.onSuccess!.push(fn)
    return this
  }

  setError(fn: (error: unknown) => void): this {
    this.options.onError!.push(fn)
    return this
  }

  setFinally(fn: () => void): this {
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
    const defaults = { ...this.options }
    return <T, TArgs extends unknown[]>(
      callback: (...args: TArgs) => T | Promise<T>,
      overrides: {
        onSuccess?: ((result: T) => void)[]
        onError?: ((error: unknown) => void)[]
        onFinally?: (() => void)[]
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
        onSuccess: [
          ...(defaults.onSuccess as ((result: T) => void)[]),
          ...(overrides.onSuccess ?? [])
        ],
        onError: [
          ...(defaults.onError as ((error: unknown) => void)[]),
          ...(overrides.onError ?? [])
        ],
        onFinally: [...(defaults.onFinally as (() => void)[]), ...(overrides.onFinally ?? [])]
      }
      return handleLoading(callback, merged, ...args)
    }
  }
}

export function createHandleLoading(): HandleLoadingBuilder {
  return new HandleLoadingBuilder()
}
