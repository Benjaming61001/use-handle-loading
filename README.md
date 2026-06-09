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

### Direct Usage

```typescript
import { handleLoading } from '@benjaming61001/use-handle-loading'

const result = await handleLoading(
  fetchData,
  {
    setLoading: (loading) => isLoading.value = loading,
    onSuccess: (data) => console.log(data),
    onError: (err) => errorToast(err.message),
    onFinally: () => console.log('finished')
  },
  userId
)
```

### Factory Method (Builder Pattern)

```typescript
import { createHandleLoading } from '@benjaming61001/use-handle-loading'

const handleLoading = createHandleLoading()
  .setSuccess((result) => console.log('first success'))
  .setSuccess((result) => successToast('Done!'))
  .setError((err) => errorToast(err.message))
  .setError((err) => console.error(err))
  .setFinally(() => console.log('finished'))
  .setLoading((loading) => isLoading.value = loading)
  .build()

// Use with pre-configured hooks
await handleLoading(fetchData, {}, userId)

// Override hooks per call (appends to stack)
await handleLoading(fetchData, {
  onSuccess: [(data) => console.log('extra success')],
  onError: [(err) => console.log('extra error')]
}, userId)
```

### Validation

Add validation callbacks to control when hooks execute:

```typescript
const handleLoading = createHandleLoading()
  .setSuccess((result) => console.log('success'))
  .setError((err) => errorToast(err.message))
  .setValidateSuccess((result) => result !== null) // skip if null
  .setValidateError((err) => err.httpStatus !== 401) // skip if 401
  .build()

// Validation runs before callbacks
await handleLoading(fetchData, {}, userId)

// Override validation per call
await handleLoading(fetchData, {
  validateSuccess: (result) => result.data.length > 0,
  validateError: (err) => err.httpStatus >= 500
}, userId)
```

## API

### `handleLoading(callback, options?, ...args)`

Wraps an async callback with loading state management and error handling.

### `createHandleLoading()`

Returns a `HandleLoadingBuilder` for chaining configuration.

### HandleLoadingBuilder Methods

| Method | Description |
|--------|-------------|
| `.setSuccess(fn)` | Add success callback |
| `.setError(fn)` | Add error callback |
| `.setFinally(fn)` | Add finally callback |
| `.setLoading(fn)` | Set loading state handler |
| `.setValidateSuccess(fn)` | Add validation before success callbacks |
| `.setValidateError(fn)` | Add validation before error callbacks |
| `.setValidateFinally(fn)` | Add validation before finally callbacks |
| `.build()` | Create the configured handler function |

## Development

```bash
bun install
bun run test        # run tests
bun run test:watch  # watch mode
bun run build       # build package
```

## License

MIT
