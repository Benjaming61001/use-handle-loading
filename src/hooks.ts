import type { Hook } from './types'

export async function runHooks<TArgs extends unknown[]>(
  hooks: Hook<TArgs>[] | undefined,
  ...args: TArgs
): Promise<void> {
  for (const hook of hooks ?? []) {
    await hook(...args)
  }
}
