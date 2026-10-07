# First shared environment

Establish these in order when the first staging or production environment is created:

1. An environment and callback matrix — exact origins and provider callback URLs, no secret values — plus a
   credential rotation procedure: create the replacement, deploy it, verify the whole flow, then revoke.
2. A smoke-test pass: health and graceful response · correlation and security headers · sign-in and sign-out ·
   one protected read/write plus an authorization rejection · asset compression and cache headers ·
   robots/indexing policy · analytics-disabled behavior with no key · after a schema change, an old-version
   read and a current-version write.
3. Backup ownership with a last-verified date, and the incident correlation-ID lookup path.
