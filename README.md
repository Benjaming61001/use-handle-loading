# use-handle-loading

A lightweight TypeScript utility for managing async loading states with success/error/finally hooks.

## Installation

```bash
npm install @benjaming61001/use-handle-loading
```

```bash
bun add @benjaming61001/use-handle-loading
```

```bash
yarn add @benjaming61001/use-handle-loading
```

```bash
pnpm add @benjaming61001/use-handle-loading
```

## Usage

### Direct usage

```typescript
import { handleLoading } from '@benjaming61001/use-handle-loading'

const user = await handleLoading(
  fetchUser, // (id: number) => Promise<User>
  {
    setLoading,
    onSuccess: [(user) => console.info('loaded', user.name)],
    onError: [(err) => toast.error(err instanceof Error ? err.message : 'Request failed')],
    onFinally: [() => console.info('finished')]
  },
  userId // forwarded to fetchUser
)
// user: User | undefined — undefined when fetchUser failed
```

Hooks are **arrays** and run in order. They may be async: each one is awaited before the next starts, and
`handleLoading` resolves only after all of them finish.

### Builder

Configure shared hooks once, then reuse the handler:

```typescript
import { createHandleLoading } from '@benjaming61001/use-handle-loading'

const run = createHandleLoading()
  .setLoading(setLoading)
  .setSuccess(() => toast.success('Done'))
  .setError((err) => toast.error(err instanceof Error ? err.message : 'Request failed'))
  .setHookError((err, source) => console.warn(`${source} failed`, err))
  .build()

// pre-configured hooks only
const users = await run(fetchUsers)

// per-call hooks run after the builder's (they are appended)
await run(fetchUser, { onSuccess: [(user) => router.push(`/users/${user.id}`)] }, userId)
```

`build()` takes a snapshot: hooks added to the builder afterwards don't affect handlers that were already built.

### Validation

Validators decide whether a group of hooks runs:

```typescript
const run = createHandleLoading()
  .setError((err) => toast.error(String(err)))
  .setValidateSuccess((result) => result !== null) // skip onSuccess for null results
  .setValidateError((err) => !isHttpError(err, 401)) // 401s are handled elsewhere: skip onError
  .build()

// override validation per call (replaces the builder's validator)
await run(fetchUsers, { validateSuccess: (users) => users.length > 0 })
```

### Loading state

`setLoading` is reference-counted **per function**. When calls that share the same `setLoading` overlap, it receives
`true` when the first one starts and `false` only after the last one finishes:

```typescript
const isLoading = ref(false)
const setLoading = (loading: boolean): void => {
  isLoading.value = loading
}

await Promise.all([handleLoading(fetchUsers, { setLoading }), handleLoading(fetchRoles, { setLoading })])
// isLoading: true → (both finished) → false
```

Define the function once (or set it on the builder): an inline arrow written in each call is a new function every
time, so those calls aren't counted together. A counting store works either way:

```typescript
const setLoading = (loading: boolean): void => (loading ? loadingStore.add() : loadingStore.remove())
```

### Errors: `onError` vs `onHookError`

`handleLoading` **never rejects**, and only the callback's own outcome decides the result.

- **`onError`** runs when the **callback** fails. With no `onError` hooks the error is logged with `console.error`
  instead of disappearing.
- **`onHookError(error, source)`** receives errors thrown by **your hooks, validators or `setLoading`**. They don't
  change the result:
  - a failing hook doesn't stop the rest of its list, and a failing `onSuccess` does **not** trigger `onError`;
  - a throwing validator counts as `false` (its hooks are skipped);
  - a throwing `setLoading` doesn't stop the callback or `onFinally`.

  `source` is one of `'onSuccess' | 'onError' | 'onFinally' | 'setLoading' | 'validateSuccess' | 'validateError' |
  'validateFinally'`. Without `onHookError` these errors go to `console.error`.

```typescript
const saved = await handleLoading(saveUser, {
  setLoading,
  onSuccess: [
    () => router.push('/users'), // throws: navigation blocked
    () => toast.success('Saved') // still runs
  ],
  onError: [() => toast.error('Save failed')], // does NOT run: the save itself succeeded
  onHookError: (err, source) => reportError(err, { source }) // ('onSuccess', navigation error)
}, form)
// saved: the saved user
```

Keep `onHookError` synchronous (its return value isn't awaited); if it throws, that error goes to `console.error`.

## API

### `handleLoading(callback, options?, ...args)`

Runs `callback(...args)` and returns `Promise<T | undefined>`: the callback's result, or `undefined` if it failed.
Order: `setLoading(true)` → callback → `onSuccess` (or `onError`) → `setLoading(false)` → `onFinally`.

| Option | Type | Description |
| --- | --- | --- |
| `onSuccess` | `Hook<[result: T]>[]` | Run after the callback succeeds |
| `onError` | `Hook<[error: unknown]>[]` | Run after the callback fails |
| `onFinally` | `Hook<[]>[]` | Run last, either way |
| `setLoading` | `(loading: boolean) => void` | Loading state (reference-counted per function) |
| `validateSuccess` | `(result: T) => boolean` | Return `false` to skip `onSuccess` |
| `validateError` | `(error: unknown) => boolean` | Return `false` to skip `onError` |
| `validateFinally` | `() => boolean` | Return `false` to skip `onFinally` |
| `onHookError` | `(error: unknown, source: HookErrorSource) => void` | Errors from hooks, validators or `setLoading` |

`Hook<Args>` is `(...args: Args) => unknown` — sync or async.

### `createHandleLoading()`

Returns an `IHandleLoadingBuilder`. Hook setters **append**; the other setters **replace**. Per call, hooks are appended
after the builder's and the other options override it.

| Method | Description |
| --- | --- |
| `.setSuccess(fn)` | Add an `onSuccess` hook |
| `.setError(fn)` | Add an `onError` hook |
| `.setFinally(fn)` | Add an `onFinally` hook |
| `.setLoading(fn)` | Set the loading handler |
| `.setValidateSuccess(fn)` | Set the `onSuccess` validator |
| `.setValidateError(fn)` | Set the `onError` validator |
| `.setValidateFinally(fn)` | Set the `onFinally` validator |
| `.setHookError(fn)` | Set the handler for errors from hooks, validators or `setLoading` |
| `.build()` | Create a handler (`HandleLoadingFn`) from a snapshot of the configuration |

### Types

`HandleLoadingFn`, `HandleLoadingOptions<T>`, `Hook<Args>`, `HookErrorHandler`, `HookErrorSource`, `IHandleLoadingBuilder`.

## Development

```bash
bun install
bun run lint        # oxlint
bun run format      # oxfmt --check (format:fix to write)
bun run test        # run tests
bun run test:watch  # watch mode
bun run build       # build package
```

## License

MIT
