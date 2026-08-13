// Response headers are immutable on handler results; rebuild once, here.
export function withResponseHeaders<T extends { response: Response }>(
  result: T,
  set: Record<string, string>,
): T {
  const headers = new Headers(result.response.headers)
  for (const [name, value] of Object.entries(set)) headers.set(name, value)
  return {
    ...result,
    response: new Response(result.response.body, {
      status: result.response.status,
      statusText: result.response.statusText,
      headers,
    }),
  }
}
