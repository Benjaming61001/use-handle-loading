import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { handleLoading, createHandleLoading, HandleLoadingBuilder } from './index'

// Errors with no onError hooks are logged; keep test output quiet (tests that check it spy on it themselves)
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
})

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

  it('overlapping calls keep loading on until the last one finishes', async () => {
    const states: boolean[] = []
    const setLoading = (loading: boolean): void => {
      states.push(loading)
    }
    let release!: () => void
    const slow = handleLoading(
      () =>
        new Promise<void>((resolve) => {
          release = resolve
        }),
      { setLoading }
    )
    await handleLoading(async () => 'fast', { setLoading })
    expect(states).toEqual([true])
    release()
    await slow
    expect(states).toEqual([true, false])
  })

  it('reports one start and one stop across overlapping calls (counting store stays balanced)', async () => {
    let count = 0
    const setLoading = (loading: boolean): void => {
      count += loading ? 1 : -1
    }
    const calls = [1, 2, 3].map((ms) =>
      handleLoading(() => new Promise((resolve) => setTimeout(resolve, ms)), { setLoading })
    )
    expect(count).toBe(1)
    await Promise.all(calls)
    expect(count).toBe(0)
  })

  it('a throwing setLoading(true) is reported, the callback still runs, and the counter is not stuck', async () => {
    const states: boolean[] = []
    let failNextStart = true
    const setLoading = (loading: boolean): void => {
      states.push(loading)
      if (loading && failNextStart) {
        failNextStart = false
        throw new Error('start failed')
      }
    }
    const onHookError = vi.fn()
    await expect(handleLoading(async () => 1, { setLoading, onHookError })).resolves.toBe(1)
    expect(onHookError).toHaveBeenCalledWith(new Error('start failed'), 'setLoading')
    await handleLoading(async () => 2, { setLoading })
    // first call: only the failed `true` (no `false` for a start that didn't happen); second call: true, false
    expect(states).toEqual([true, true, false])
  })

  it('separate setLoading functions are tracked independently', async () => {
    const a: boolean[] = []
    const b: boolean[] = []
    await Promise.all([
      handleLoading(async () => 1, { setLoading: (v) => a.push(v) }),
      handleLoading(async () => 2, { setLoading: (v) => b.push(v) })
    ])
    expect(a).toEqual([true, false])
    expect(b).toEqual([true, false])
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
  it('replaceSuccess/replaceError/replaceFinally replace the builder lists (no args: clear)', async () => {
    const old = vi.fn()
    const next = vi.fn()
    const builder = createHandleLoading().setSuccess(old).setError(old).setFinally(old)
    const run = builder.replaceSuccess(next).replaceError(next).replaceFinally().build()
    await run(vi.fn().mockResolvedValue('ok'))
    await run(vi.fn().mockRejectedValue('fail'))
    expect(old).not.toHaveBeenCalled()
    expect(next.mock.calls).toEqual([['ok'], ['fail']])
  })

  it('setSuccess after replaceSuccess adds to the new list', async () => {
    const calls: string[] = []
    const run = createHandleLoading()
      .setSuccess(() => calls.push('old'))
      .replaceSuccess(() => calls.push('a'))
      .setSuccess(() => calls.push('b'))
      .build()
    await run(async () => 'ok')
    expect(calls).toEqual(['a', 'b'])
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

  it('per-call hook lists replace the builder hooks', async () => {
    const defaultSuccess = vi.fn()
    const overrideSuccess = vi.fn()
    const defaultError = vi.fn()
    const overrideError = vi.fn()
    const handler = createHandleLoading().setSuccess(defaultSuccess).setError(defaultError).build()
    await handler(vi.fn().mockResolvedValue('result'), { onSuccess: [overrideSuccess] })
    expect(defaultSuccess).not.toHaveBeenCalled()
    expect(overrideSuccess).toHaveBeenCalledWith('result')
    await handler(vi.fn().mockRejectedValue('fail'), { onError: [overrideError] })
    expect(defaultError).not.toHaveBeenCalled()
    expect(overrideError).toHaveBeenCalledWith('fail')
  })

  it('builder hooks still run for options the call leaves out', async () => {
    const defaultSuccess = vi.fn()
    const defaultFinally = vi.fn()
    const handler = createHandleLoading()
      .setSuccess(defaultSuccess)
      .setFinally(defaultFinally)
      .build()
    await handler(vi.fn().mockResolvedValue('result'), { onFinally: [] })
    expect(defaultSuccess).toHaveBeenCalledWith('result')
    expect(defaultFinally).not.toHaveBeenCalled()
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

  it('a built handler is unaffected by later builder calls', async () => {
    const first = vi.fn()
    const builder = createHandleLoading().setSuccess(first)
    const handler = builder.build()
    const late = vi.fn()
    builder.setSuccess(late).build()

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

  it('a rejecting async onSuccess is reported; the result is kept and onError does not run', async () => {
    const onError = vi.fn()
    const onHookError = vi.fn()
    const result = await handleLoading(async () => 'ok', {
      onSuccess: [
        async () => {
          throw new Error('hook failed')
        }
      ],
      onError: [onError],
      onHookError
    })
    expect(result).toBe('ok')
    expect(onError).not.toHaveBeenCalled()
    expect(onHookError).toHaveBeenCalledWith(new Error('hook failed'), 'onSuccess')
  })

  it('builder awaits its hooks in the order they were added', async () => {
    const log: string[] = []
    const handler = createHandleLoading()
      .setSuccess(slow(log, 'first'))
      .setSuccess(slow(log, 'second'))
      .build()
    await handler(async () => 'ok')
    log.push('resolved')
    expect(log).toEqual(['first start', 'first end', 'second start', 'second end', 'resolved'])
  })
})

describe('throwing validators (onHookError)', () => {
  const boom = new Error('validator failed')
  const throws = (): never => {
    throw boom
  }

  it('validateSuccess: keeps the result, skips onSuccess, does not call onError', async () => {
    const onSuccess = vi.fn()
    const onError = vi.fn()
    const onHookError = vi.fn()
    const result = await handleLoading(async () => 'ok', {
      validateSuccess: throws,
      onSuccess: [onSuccess],
      onError: [onError],
      onHookError
    })
    expect(result).toBe('ok')
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
    expect(onHookError).toHaveBeenCalledWith(boom, 'validateSuccess')
  })

  it('validateError: resolves undefined instead of rejecting, skips onError', async () => {
    const onError = vi.fn()
    const onHookError = vi.fn()
    const call = handleLoading(
      async () => {
        throw new Error('request failed')
      },
      { validateError: throws, onError: [onError], onHookError }
    )
    await expect(call).resolves.toBeUndefined()
    expect(onError).not.toHaveBeenCalled()
    expect(onHookError).toHaveBeenCalledWith(boom, 'validateError')
  })

  it('validateFinally: keeps the successful result, skips onFinally', async () => {
    const onFinally = vi.fn()
    const onHookError = vi.fn()
    const result = await handleLoading(async () => 'ok', {
      validateFinally: throws,
      onFinally: [onFinally],
      onHookError
    })
    expect(result).toBe('ok')
    expect(onFinally).not.toHaveBeenCalled()
    expect(onHookError).toHaveBeenCalledWith(boom, 'validateFinally')
  })

  it('falls back to console.error when onHookError is not set', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await handleLoading(async () => 'ok', { validateSuccess: throws })
    expect(result).toBe('ok')
    expect(consoleError).toHaveBeenCalledWith('[use-handle-loading] validateSuccess threw:', boom)
    consoleError.mockRestore()
  })

  it('a throwing onHookError is reported to console.error and does not escape', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const handlerError = new Error('handler failed')
    const result = await handleLoading(async () => 'ok', {
      validateSuccess: throws,
      onHookError: () => {
        throw handlerError
      }
    })
    expect(result).toBe('ok')
    expect(consoleError).toHaveBeenCalledWith(
      '[use-handle-loading] validateSuccess threw:',
      handlerError
    )
    consoleError.mockRestore()
  })

  it('builder setHookError is used, and a per-call onHookError overrides it', async () => {
    const fromBuilder = vi.fn()
    const perCall = vi.fn()
    const handler = createHandleLoading()
      .setHookError(fromBuilder)
      .setValidateSuccess(throws)
      .build()
    await handler(async () => 'ok')
    expect(fromBuilder).toHaveBeenCalledWith(boom, 'validateSuccess')
    await handler(async () => 'ok', { onHookError: perCall })
    expect(perCall).toHaveBeenCalledWith(boom, 'validateSuccess')
    expect(fromBuilder).toHaveBeenCalledTimes(1)
  })

  it('every method returns a new builder', () => {
    const builder = createHandleLoading()
    const results = [
      builder.setSuccess(() => {}),
      builder.setError(() => {}),
      builder.setFinally(() => {}),
      builder.replaceSuccess(),
      builder.replaceError(),
      builder.replaceFinally(),
      builder.setLoading(() => {}),
      builder.setValidateBefore(() => true),
      builder.setValidateSuccess(() => true),
      builder.setValidateError(() => true),
      builder.setValidateFinally(() => true),
      builder.setHookError(() => {})
    ]
    for (const result of results) {
      expect(result).toBeInstanceOf(HandleLoadingBuilder)
      expect(result).not.toBe(builder)
    }
  })

  it('extending a base builder leaves it unchanged, in any order', async () => {
    const calls: string[] = []
    const hook = (name: string) => (): void => void calls.push(name)
    const base = createHandleLoading().setSuccess(hook('x1')).setFinally(hook('y1'))

    const handleB = base.setSuccess(hook('x2')).replaceFinally(hook('y2')).build()
    const handleA = base.build() // built after B: still the base
    const handleC = base.setError(hook('z')).build()

    await handleA(async () => 'ok')
    expect(calls).toEqual(['x1', 'y1'])
    calls.length = 0
    await handleB(async () => 'ok')
    expect(calls).toEqual(['x1', 'x2', 'y2'])
    calls.length = 0
    await handleC(async () => 'ok')
    expect(calls).toEqual(['x1', 'y1'])
  })
})

describe('unhandled callback errors (bug 2)', () => {
  it('logs the error to console.error when there are no onError hooks', async () => {
    const error = new Error('request failed')
    const result = await handleLoading(async () => {
      throw error
    })
    expect(result).toBeUndefined()
    expect(console.error).toHaveBeenCalledWith(
      '[use-handle-loading] unhandled error (no onError hooks):',
      error
    )
  })

  it('does not log when onError hooks handle it', async () => {
    await handleLoading(
      async () => {
        throw new Error('x')
      },
      { onError: [() => {}] }
    )
    expect(console.error).not.toHaveBeenCalled()
  })

  it('does not log when onError hooks exist but validateError filters the error out', async () => {
    const onError = vi.fn()
    await handleLoading(
      async () => {
        throw new Error('401')
      },
      { onError: [onError], validateError: () => false }
    )
    expect(onError).not.toHaveBeenCalled()
    expect(console.error).not.toHaveBeenCalled()
  })
})

describe('failing hooks do not change the result (bugs 3 and 4)', () => {
  const fail = (message: string) => (): never => {
    throw new Error(message)
  }

  it('a throwing onSuccess keeps the result, skips onError, and later onSuccess hooks still run', async () => {
    const later = vi.fn()
    const onError = vi.fn()
    const onHookError = vi.fn()
    const result = await handleLoading(async () => 'ok', {
      onSuccess: [fail('s'), later],
      onError: [onError],
      onHookError
    })
    expect(result).toBe('ok')
    expect(later).toHaveBeenCalledWith('ok')
    expect(onError).not.toHaveBeenCalled()
    expect(onHookError).toHaveBeenCalledWith(new Error('s'), 'onSuccess')
  })

  it('a throwing onError hook does not reject; later onError hooks still run', async () => {
    const later = vi.fn()
    const onHookError = vi.fn()
    const call = handleLoading(
      async () => {
        throw new Error('request')
      },
      { onError: [fail('e'), later], onHookError }
    )
    await expect(call).resolves.toBeUndefined()
    expect(later).toHaveBeenCalledWith(new Error('request'))
    expect(onHookError).toHaveBeenCalledWith(new Error('e'), 'onError')
  })

  it('a throwing onFinally keeps the result; later onFinally hooks still run', async () => {
    const later = vi.fn()
    const onHookError = vi.fn()
    const result = await handleLoading(async () => 'ok', {
      onFinally: [fail('f'), later],
      onHookError
    })
    expect(result).toBe('ok')
    expect(later).toHaveBeenCalled()
    expect(onHookError).toHaveBeenCalledWith(new Error('f'), 'onFinally')
  })

  it('a throwing setLoading(false) keeps the result and onFinally still runs', async () => {
    const onFinally = vi.fn()
    const onHookError = vi.fn()
    const setLoading = (loading: boolean): void => {
      if (!loading) throw new Error('stop failed')
    }
    const result = await handleLoading(async () => 'ok', {
      setLoading,
      onFinally: [onFinally],
      onHookError
    })
    expect(result).toBe('ok')
    expect(onFinally).toHaveBeenCalled()
    expect(onHookError).toHaveBeenCalledWith(new Error('stop failed'), 'setLoading')
  })

  it('keeps the order: callback → onSuccess → setLoading(false) → onFinally', async () => {
    const log: string[] = []
    await handleLoading(
      async () => {
        log.push('callback')
        return 'ok'
      },
      {
        setLoading: (loading) => log.push(`loading ${loading}`),
        onSuccess: [() => log.push('success')],
        onFinally: [() => log.push('finally')]
      }
    )
    expect(log).toEqual(['loading true', 'callback', 'success', 'loading false', 'finally'])
  })
})

describe('validateBefore', () => {
  it('false: skips callback and success/error hooks, still stops loading and runs onFinally', async () => {
    const log: string[] = []
    const callback = vi.fn()
    const result = await handleLoading(callback, {
      setLoading: (loading) => log.push(`loading ${loading}`),
      validateBefore: () => {
        log.push('validate')
        return false
      },
      onSuccess: [() => log.push('success')],
      onError: [() => log.push('error')],
      onFinally: [() => log.push('finally')]
    })
    expect(result).toBeUndefined()
    expect(callback).not.toHaveBeenCalled()
    expect(log).toEqual(['loading true', 'validate', 'loading false', 'finally'])
    expect(console.error).not.toHaveBeenCalled()
  })

  it('async true: runs the callback normally', async () => {
    const result = await handleLoading(
      async (x: number) => x * 2,
      { validateBefore: async () => true },
      21
    )
    expect(result).toBe(42)
  })

  it.each([
    [
      'throws',
      () => {
        throw new Error('boom')
      }
    ],
    ['rejects', () => Promise.reject(new Error('boom'))]
  ])('%s: reported as validateBefore, counts as false', async (_, validateBefore) => {
    const onHookError = vi.fn()
    const onError = vi.fn()
    const onFinally = vi.fn()
    const callback = vi.fn()
    const result = await handleLoading(callback, {
      validateBefore,
      onHookError,
      onError: [onError],
      onFinally: [onFinally]
    })
    expect(result).toBeUndefined()
    expect(callback).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
    expect(onFinally).toHaveBeenCalledTimes(1)
    expect(onHookError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'boom' }),
      'validateBefore'
    )
  })

  it('builder: setValidateBefore applies, per-call value overrides', async () => {
    const callback = vi.fn().mockResolvedValue('ok')
    const run = createHandleLoading()
      .setValidateBefore(() => false)
      .build()
    expect(await run(callback)).toBeUndefined()
    expect(callback).not.toHaveBeenCalled()
    expect(await run(callback, { validateBefore: () => true })).toBe('ok')
  })
})
