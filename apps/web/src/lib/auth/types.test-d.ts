import type { Session } from "./client"

type IsAny<T> = 0 extends 1 & T ? true : false
type AssertFalse<T extends false> = T

type UserIdIsStrong = AssertFalse<IsAny<Session["userId"]>>
const check: UserIdIsStrong = false
void check
