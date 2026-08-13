import "@tanstack/react-start/server-only"

import { getRequest } from "@tanstack/react-start/server"

import { auth } from "./auth.server"

// Plain function, not a server fn: server-side callers (middleware, handlers)
// read the session directly instead of dispatching a nested RPC.
export function readServerSession() {
  return auth.api.getSession({ headers: getRequest().headers })
}
