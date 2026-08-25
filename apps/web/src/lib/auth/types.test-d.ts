import type { Session, User } from "./client"

type IsAny<T> = 0 extends 1 & T ? true : false
type AssertFalse<T extends false> = T

type UserIdIsStrong = AssertFalse<IsAny<Session["userId"]>>
const check: UserIdIsStrong = false
void check

// adminClient must augment the inferred session types the root context consumes.
type ImpersonatedByIsStrong = AssertFalse<IsAny<Session["impersonatedBy"]>>
const impersonatedByCheck: ImpersonatedByIsStrong = false
void impersonatedByCheck

type RoleIsStrong = AssertFalse<IsAny<User["role"]>>
const roleCheck: RoleIsStrong = false
void roleCheck
