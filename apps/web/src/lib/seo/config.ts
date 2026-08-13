import { clientEnv } from "../env/client"

export const SITE_ORIGIN = clientEnv.VITE_SITE_ORIGIN
export const IS_INDEXABLE = clientEnv.VITE_SEO_INDEXABLE === "true"
