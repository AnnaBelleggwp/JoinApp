
# JoinApp Prototype

This repository currently contains the JoinApp Vite prototype exported from Figma Make.

The long-term product target is a production iOS, Android, and web system.

- Architecture decisions and the staged migration plan: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Supabase setup, migrations, and RPC checklist: [docs/SUPABASE.md](docs/SUPABASE.md)

## Running The Current Prototype

Install dependencies:

```sh
pnpm install
```

Start the development server:

```sh
pnpm dev
```

Build:

```sh
pnpm build
```

Type-check:

```sh
pnpm typecheck
```

## Workspace Packages

- `@join/core`: shared domain types, command contracts, and business rules.
- `@join/db`: Supabase database types and future generated DB helpers.
- `@join/api`: typed Supabase client/RPC wrapper.

## Data Source

The Vite prototype uses localStorage by default. To opt into the Supabase adapter later, set:

```sh
VITE_JOIN_DATA_SOURCE=supabase
```

Supabase mode requires applied migrations, public Supabase env vars, and a real authenticated session.
For the current prototype, Supabase mode bootstraps that session with anonymous Supabase Auth during registration.
