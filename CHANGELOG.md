# Changelog

## 0.2.1

### Changed (breaking)

- **Per-call hook lists replace the builder's.** A handler from `build()` used to run the builder's `onSuccess` /
  `onError` / `onFinally` hooks and then the call's; now a call that passes one of these lists replaces the builder's
  list (same rule as `setLoading`, the validators and `onHookError`). Lists the call leaves out still use the builder's.
  To keep a builder hook, include it in the call's list. `[]` turns the builder's hooks off for that call.

- **The builder is immutable.** Every method returns a new builder instead of changing the one it is called on, so a
  base builder can be extended into several handlers in any order. Code that called a setter without using its return
  value (`builder.setSuccess(fn)` on its own line) must reassign or chain instead. Builder methods return
  `IHandleLoadingBuilder` (was `this`).

### Added

- Builder methods `replaceSuccess(...fns)`, `replaceError(...fns)`, `replaceFinally(...fns)`: replace the builder's hook
  list instead of adding to it (`setSuccess` etc. still add). No arguments clears the list.
- Optional `validateBefore` option and `setValidateBefore()` builder method: a sync or async check that runs after
  `setLoading(true)` and before the callback (e.g. form validation). `false` or a throw skips the callback and its
  `onSuccess`/`onError` hooks; loading still stops, `onFinally` still runs, and the call resolves `undefined`. A throw is
  reported to `onHookError` with source `'validateBefore'`.

## 0.2.0

### Breaking changes

- **Async hooks are awaited.** `onSuccess`, `onError` and `onFinally` hooks run one after another, each awaited before
  the next, and `handleLoading` resolves only after all of them finish. Previously async hooks ran in the background.
  Order: `setLoading(true)` → callback → `onSuccess` (or `onError`) → `setLoading(false)` → `onFinally`.
- **`handleLoading` never rejects.** Errors thrown by hooks, validators or `setLoading` go to the new `onHookError`
  option (or `console.error`) instead of rejecting the call.
- **A failing `onSuccess` hook no longer triggers `onError`** and no longer discards the result.
- **`setLoading` is reference-counted per function.** Overlapping calls that share one `setLoading` (e.g. through a
  built handler) receive `true` when the first starts and `false` only after the last finishes — not one pair per call.
- **`createHandleLoading()` returns `IHandleLoadingBuilder`** instead of the `HandleLoadingBuilder` class.
- **Handlers from `build()` are typed `Promise<T | undefined>`** (was `Promise<T>`), matching their runtime behavior.

### Added

- `onHookError(error, source)` option and `setHookError()` builder method. `source` is one of `'onSuccess'`,
  `'onError'`, `'onFinally'`, `'setLoading'`, `'validateSuccess'`, `'validateError'`, `'validateFinally'`.
- Exported types: `HandleLoadingFn`, `Hook`, `HookErrorHandler`, `HookErrorSource`, `IHandleLoadingBuilder`.

### Fixed

- Hooks added to a builder after `build()` leaked into handlers that were already built.
- Callback errors with no `onError` hooks disappeared silently; they are now logged with `console.error`.
- A failing hook stopped the remaining hooks in its list; the rest now still run.
- A throwing validator discarded the result or rejected the call; it now counts as `false` (its hooks are skipped).
- A throwing `setLoading(true)` skipped the callback and could leave the loading count stuck.
- Overlapping calls sharing one `setLoading` turned loading off when the first call finished.

### Tooling

- `bun.lock` is the only lockfile (`package-lock.json` removed); Dependabot uses the `bun` ecosystem.
- Dev dependencies updated: oxlint 1.93, oxfmt 0.78, vitest 5.1, tsup 9.0, TypeScript 6.0.
- CI: Bun pinned via `packageManager`, Node 24 in both workflows; lint, format check and tests run on pull requests
  (with `--frozen-lockfile`); `bun run format` now checks instead of rewriting.

### Migrating from 0.1.x

- If you wrapped `handleLoading` in `try`/`catch` for errors thrown by your own hooks, use `onHookError` instead.
- If your `onError` hooks relied on catching errors thrown by `onSuccess`, handle those in `onHookError`
  (`source === 'onSuccess'`).
- If you typed a stored builder as `HandleLoadingBuilder`, type it as `IHandleLoadingBuilder` (or let it be inferred).
- Handle the `undefined` result of built handlers, as with `handleLoading` itself.
- If you count `setLoading(true)` calls yourself, overlapping calls that share one function now produce a single pair.

## 0.1.1 and earlier

See the git history.
