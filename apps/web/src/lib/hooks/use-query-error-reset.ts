import { useQueryErrorResetBoundary } from "@tanstack/react-query"
import { useEffect } from "react"

export function useResetQueryErrorsOnMount() {
  const queryErrorResetBoundary = useQueryErrorResetBoundary()

  useEffect(() => {
    queryErrorResetBoundary.reset()
  }, [queryErrorResetBoundary])
}
