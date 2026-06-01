# @join/db

Database package for Supabase types and database-specific helpers.

`src/index.ts` currently contains hand-maintained types that match the checked-in migrations. After migrations are applied to a local or remote Supabase project, replace them with generated types:

```sh
supabase gen types typescript --local > packages/db/src/index.ts
```
