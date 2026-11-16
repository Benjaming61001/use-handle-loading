import { describe, expect, it, vi } from 'vitest'
import { handleLoading, createHandleLoading, HandleLoadingBuilder } from './index'

describe('handleLoading', () => {
  it('returns result on success', async () => {
    const callback = vi.fn().mockResolvedValue('result')
    const result = await handleLoading(callback)
    expect(result).toBe('result')
  })

  it('returns undefined on error', async () => {
    const callback = vi.fn().mockRejectedValue(new Error('fail'))
    const result = await handleLoading(callback)
    expect(result).toBeUndefined()
  })

  it('forwards args to callback', async () => {
    const callback = vi.fn().mockResolvedValue('result')
    await handleLoading(callback, {}, 'a', 'b')
    expect(callback).toHaveBeenCalledWith('a', 'b')
  })

  it('calls setLoading true then false', async () => {
    const setLoading = vi.fn()
    const callback = vi.fn().mockResolvedValue('result')
    await handleLoading(callback, { setLoading })
    expect(setLoading).toHaveBeenCalledWith(true)
    expect(setLoading).toHaveBeenCalledWith(false)
    expect(setLoading).toHaveBeenCalledTimes(2)
  })

  it('calls setLoading false even on error', async () => {
    const setLoading = vi.fn()
    const callback = vi.fn().mockRejectedValue(new Error('fail'))
    await handleLoading(callback, { setLoading })
    expect(setLoading).toHaveBeenCalledWith(true)
    expect(setLoading).toHaveBeenCalledWith(false)
  })

  it('calls onSuccess callbacks', async () => {
    const onSuccess = vi.fn()
    const callback = vi.fn().mockResolvedValue('result')
    await handleLoading(callback, { onSuccess: [onSuccess] })
    expect(onSuccess).toHaveBeenCalledWith('result')
  })

  it('skips onSuccess when validateSuccess returns false', async () => {
    const onSuccess = vi.fn()
    const callback = vi.fn().mockResolvedValue('result')
    await handleLoading(callback, {
      onSuccess: [onSuccess],
      validateSuccess: () => false
    })
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('calls onError callbacks', async () => {
    const onError = vi.fn()
    const error = new Error('fail')
    const callback = vi.fn().mockRejectedValue(error)
    await handleLoading(callback, { onError: [onError] })
    expect(onError).toHaveBeenCalledWith(error)
  })

  it('skips onError when validateError returns false', async () => {
    const onError = vi.fn()
    const callback = vi.fn().mockRejectedValue(new Error('fail'))
    await handleLoading(callback, {
      onError: [onError],
      validateError: () => false
    })
    expect(onError).not.toHaveBeenCalled()
  })

  it('calls onFinally callbacks', async () => {
    const onFinally = vi.fn()
    const callback = vi.fn().mockResolvedValue('result')
    await handleLoading(callback, { onFinally: [onFinally] })
    expect(onFinally).toHaveBeenCalledTimes(1)
  })

  it('calls onFinally on error', async () => {
    const onFinally = vi.fn()
    const callback = vi.fn().mockRejectedValue(new Error('fail'))
    await handleLoading(callback, { onFinally: [onFinally] })
    expect(onFinally).toHaveBeenCalledTimes(1)
  })

  it('skips onFinally when validateFinally returns false', async () => {
    const onFinally = vi.fn()
    const callback = vi.fn().mockResolvedValue('result')
    await handleLoading(callback, {
      onFinally: [onFinally],
      validateFinally: () => false
    })
    expect(onFinally).not.toHaveBeenCalled()
  })

  it('calls multiple success callbacks in order', async () => {
    const calls: string[] = []
    const onSuccess1 = vi.fn().mockImplementation(() => calls.push('first'))
    const onSuccess2 = vi.fn().mockImplementation(() => calls.push('second'))
    const callback = vi.fn().mockResolvedValue('result')
    await handleLoading(callback, { onSuccess: [onSuccess1, onSuccess2] })
    expect(calls).toEqual(['first', 'second'])
  })
})

describe('createHandleLoading', () => {
  it('returns HandleLoadingBuilder', () => {
    const builder = createHandleLoading()
    expect(builder).toBeInstanceOf(HandleLoadingBuilder)
  })
})

describe('HandleLoadingBuilder', () => {
  it('chains setSuccess', () => {
    const builder = createHandleLoading()
    const result = builder.setSuccess(() => {})
    expect(result).toBe(builder)
  })

  it('chains setError', () => {
    const builder = createHandleLoading()
    const result = builder.setError(() => {})
    expect(result).toBe(builder)
  })

  it('chains setFinally', () => {
    const builder = createHandleLoading()
    const result = builder.setFinally(() => {})
    expect(result).toBe(builder)
  })

  it('chains setLoading', () => {
    const builder = createHandleLoading()
    const result = builder.setLoading(() => {})
    expect(result).toBe(builder)
  })

  it('chains setValidateSuccess', () => {
    const builder = createHandleLoading()
    const result = builder.setValidateSuccess(() => true)
    expect(result).toBe(builder)
  })

  it('chains setValidateError', () => {
    const builder = createHandleLoading()
    const result = builder.setValidateError(() => true)
    expect(result).toBe(builder)
  })

  it('chains setValidateFinally', () => {
    const builder = createHandleLoading()
    const result = builder.setValidateFinally(() => true)
    expect(result).toBe(builder)
  })

  it('builds handler that calls default success', async () => {
    const onSuccess = vi.fn()
    const handler = createHandleLoading().setSuccess(onSuccess).build()
    const callback = vi.fn().mockResolvedValue('result')
    await handler(callback)
    expect(onSuccess).toHaveBeenCalledWith('result')
  })

  it('builds handler that calls default error', async () => {
    const onError = vi.fn()
    const handler = createHandleLoading().setError(onError).build()
    const callback = vi.fn().mockRejectedValue(new Error('fail'))
    await handler(callback)
    expect(onError).toHaveBeenCalled()
  })

  it('builds handler that merges overrides', async () => {
    const defaultSuccess = vi.fn()
    const overrideSuccess = vi.fn()
    const handler = createHandleLoading().setSuccess(defaultSuccess).build()
    const callback = vi.fn().mockResolvedValue('result')
    await handler(callback, { onSuccess: [overrideSuccess] })
    expect(defaultSuccess).toHaveBeenCalledWith('result')
    expect(overrideSuccess).toHaveBeenCalledWith('result')
  })

  it('override setLoading takes precedence', async () => {
    const defaultSetLoading = vi.fn()
    const overrideSetLoading = vi.fn()
    const handler = createHandleLoading().setLoading(defaultSetLoading).build()
    const callback = vi.fn().mockResolvedValue('result')
    await handler(callback, { setLoading: overrideSetLoading })
    expect(defaultSetLoading).not.toHaveBeenCalled()
    expect(overrideSetLoading).toHaveBeenCalled()
  })

  it('build() snapshots hooks; later builder calls do not affect it', async () => {
    const builder = createHandleLoading()
    const first = vi.fn()
    const handler = builder.setSuccess(first).build()
    const late = vi.fn()
    builder.setSuccess(late)

    await handler(async () => 'ok')
    expect(first).toHaveBeenCalled()
    expect(late).not.toHaveBeenCalled()
  })

  it('override validateSuccess takes precedence', async () => {
    const onSuccess = vi.fn()
    const handler = createHandleLoading()
      .setSuccess(onSuccess)
      .setValidateSuccess(() => true)
      .build()
    const callback = vi.fn().mockResolvedValue('result')
    await handler(callback, { validateSuccess: () => false })
    expect(onSuccess).not.toHaveBeenCalled()
  })
})

describe('async hooks', () => {
  const tick = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))
  const slow = (log: string[], name: string) => async (): Promise<void> => {
    log.push(`${name} start`)
    await tick(10)
    log.push(`${name} end`)
  }

  it('awaits each hook in order before resolving', async () => {
    const log: string[] = []
    await handleLoading(async () => 'ok', {
      setLoading: (loading) => log.push(`loading ${loading}`),
      onSuccess: [slow(log, 'success1'), slow(log, 'success2')],
      onFinally: [slow(log, 'finally')]
    })
    log.push('resolved')
    expect(log).toEqual([
      'loading true',
      'success1 start',
      'success1 end',
      'success2 start',
      'success2 end',
      'loading false',
      'finally start',
      'finally end',
      'resolved'
    ])
  })

  it('awaits async onError hooks in order', async () => {
    const log: string[] = []
    await handleLoading(
      async () => {
        throw new Error('fail')
      },
      { onError: [slow(log, 'error1'), slow(log, 'error2')] }
    )
    log.push('resolved')
    expect(log).toEqual(['error1 start', 'error1 end', 'error2 start', 'error2 end', 'resolved'])
  })

  it('a rejecting async onSuccess is handled like a throwing sync one (goes to onError)', async () => {
    const onError = vi.fn()
    const result = await handleLoading(async () => 'ok', {
      onSuccess: [
        async () => {
          throw new Error('hook failed')
        }
      ],
      onError: [onError]
    })
    expect(onError).toHaveBeenCalledWith(new Error('hook failed'))
    expect(result).toBeUndefined()
  })

  it('builder awaits default hooks, then override hooks, in order', async () => {
    const log: string[] = []
    const handler = createHandleLoading().setSuccess(slow(log, 'default')).build()
    await handler(async () => 'ok', { onSuccess: [slow(log, 'override')] })
    log.push('resolved')
    expect(log).toEqual([
      'default start',
      'default end',
      'override start',
      'override end',
      'resolved'
    ])
  })
})
