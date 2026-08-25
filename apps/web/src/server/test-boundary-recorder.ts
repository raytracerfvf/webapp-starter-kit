// createServerFn replacement for boundary tests. Import it dynamically inside
// vi.mock factories — they are hoisted and cannot reference top-level imports.
export interface BoundaryRecord {
  method: string | undefined
  middleware: ReadonlyArray<unknown>
  validator: ((input: unknown) => unknown) | undefined
}

function builder(record: BoundaryRecord) {
  return {
    middleware(middleware: ReadonlyArray<unknown>) {
      return builder({ ...record, middleware })
    },
    validator(validator: (input: unknown) => unknown) {
      return builder({ ...record, validator })
    },
    handler() {
      return record
    },
  }
}

export const createServerFnRecorder = (options?: { method?: string }) =>
  builder({ method: options?.method, middleware: [], validator: undefined })
