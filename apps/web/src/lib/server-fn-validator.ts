import type { z } from "zod"

// Bypasses the Standard Schema path, which wraps issues in a plain Error (500);
// a thrown ZodError is what sanitizeBoundaryError maps to 400 VALIDATION_ERROR.
export function zodValidator<Schema extends z.ZodType>(schema: Schema) {
  return (input: z.input<Schema>): z.output<Schema> => schema.parse(input)
}
