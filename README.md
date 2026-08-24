# Previously

![CI](https://github.com/alperen317/movie-expo/actions/workflows/ci.yml/badge.svg)

**Previously** is a mobile-first movie & TV tracker: track what you've watched, mark episodes as you go, build watchlists, and share lists with friends in real time. Built with Expo/React Native, backed by a custom .NET API (`previously-api`) over REST and SignalR, with all catalog data sourced from [TMDB](https://www.themoviedb.org/).

## Features

- Track movies and TV shows as watched, favorited, or on your watchlist
- Per-episode progress tracking with batch "mark season as watched"
- Shared lists: collaborate with friends via email invite or a join code, with live realtime sync
- Calendar of upcoming episodes for shows you're tracking, with optional local reminders
- Import your watch history from TV Time or Letterboxd
- Shareable stats card for your yearly recap

## Architecture

The app is layered bottom-up:

```
lib/tmdb  -> typed TMDB API client (catalog data: movies, shows, search, people)
lib/api   -> typed REST + SignalR client for previously-api (auth, saved media, shared lists, watch log, episode progress)
stores    -> Zustand stores; the only layer allowed to call lib/* and hold app state
app       -> expo-router screens; read from stores, never call lib/* directly
```

Supporting modules: `lib/importers` (TV Time/Letterboxd CSV parsing + TMDB re-matching), `lib/notifications` (local episode reminders), `lib/avatar` (deterministic avatar generation), `components` (shared UI, organized by feature area).

Auth and data live in `previously-api` (.NET 10, PostgreSQL) over a REST API; shared-list changes (items, members, polls) also arrive live over a SignalR connection (`lib/api/realtime.ts`), one connection for the app's lifetime, joining/leaving a group per open list. See that project's own README for the schema and API contract.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment variables** — copy `.env.example` to `.env` and fill in:

   | Variable                        | Description                                                                                          |
   | -------------------------------- | ----------------------------------------------------------------------------------------------------- |
   | `EXPO_PUBLIC_TMDB_ACCESS_TOKEN`  | TMDB API Read Access Token ([themoviedb.org/settings/api](https://www.themoviedb.org/settings/api))  |
   | `EXPO_PUBLIC_API_BASE_URL`       | Base URL of a running `previously-api` instance, e.g. `http://localhost:5080` for its local `docker compose up` |
   | `EXPO_PUBLIC_SENTRY_DSN`         | Optional — crash reporting is a no-op until this is set (see `lib/telemetry/sentry.ts`)              |

3. **Start `previously-api`** — this app has no backend of its own; point it at a running instance of the sibling `previously-api` project (`docker compose up` there is the fastest path — see that project's own README) and confirm `EXPO_PUBLIC_API_BASE_URL` matches.

4. **Run the app**

   ```bash
   npm run start   # Expo dev server; press i / a / w, or scan the QR code
   npm run web     # web only
   ```

5. **(Store builds only)** `eas.json` defines `development`/`preview`/`production` build profiles. The project is already linked to an Expo account (`extra.eas.projectId` in `app.json`); run `npx eas login` to authenticate before building. If you're forking this into your own Expo project, run `eas init` once to relink `extra.eas.projectId` to your own project.

## Development

Use the Node version in `.nvmrc` (`nvm use`). CI reads the same file, and matching it matters: npm majors write `package-lock.json` differently, so installing with a different one produces a lock that fails CI's `npm ci` with `Missing: ... from lock file` even though no dependency changed. `engines` in `package.json` warns if you're on another version.

```bash
npx tsc --noEmit   # type check
npm test           # jest
npm run lint       # eslint
npm run format     # prettier --write
```

CI runs type check, lint, format check, and tests on every push/PR to `master` (`.github/workflows/ci.yml`).

Tests run on the `jest-expo` preset (React Native Testing Library underneath), so `*.test.ts`/`*.test.tsx` anywhere in the tree are picked up -- not just `lib/` and `stores/` as before. `supabase/functions/` is the one carve-out: those tests run on Deno (`Deno.test`, `https://` imports), not Jest.

## Releases and OTA updates

Builds carry `expo-updates`, so a JS-only fix ships without a store review:

```bash
npx eas update --branch production --message "fix: ..."
```

Each build profile in `eas.json` is bound to a channel of the same name (`development`/`preview`/`production`); point an update branch at a channel with `eas channel:edit`. Installed apps check for an update on launch and apply it on the next one.

`runtimeVersion` uses the `fingerprint` policy: it is derived from the project's native dependencies and config, so adding or upgrading a native module automatically changes it and an update meant for the new binary can never land on an old one. Anything that touches native code still needs a fresh build, not an update.

Source maps for release builds are uploaded by the `@sentry/react-native/expo` config plugin (paired with `getSentryExpoConfig` in `metro.config.js`), which needs three values in the EAS build environment — set them once with `eas env:create`, `SENTRY_AUTH_TOKEN` as a secret:

| Variable            | Value                                                       |
| ------------------- | ----------------------------------------------------------- |
| `SENTRY_ORG`        | Sentry organization slug                                     |
| `SENTRY_PROJECT`    | Sentry project slug                                          |
| `SENTRY_AUTH_TOKEN` | Sentry auth token with `project:releases` scope (secret)     |

**A `production` build fails without them.** sentry-cli exits non-zero when it can't authenticate, and neither the Xcode build phase nor the Gradle upload task tolerates a failing upload. That is the right default for `production` — shipping a release whose crashes can't be symbolicated defeats the point of uploading maps at all. `development` and `preview` set `SENTRY_ALLOW_FAILURE=true` in `eas.json`, so a missing token there degrades to a logged warning instead of a red build.

To produce a production binary before Sentry is set up, run that build with `SENTRY_DISABLE_AUTO_UPLOAD=true`.

## Tech Stack

Expo SDK 54 (React Native 0.81, React 19) · expo-router · TypeScript · NativeWind (Tailwind for RN) · Zustand · `previously-api` (.NET 10, PostgreSQL, SignalR) · TMDB API · Jest

## Design Decisions

**This app used to run on Supabase.** Auth, personal content, and shared lists — with Postgres RLS enforcing ownership and Supabase Realtime powering live updates — were migrated onto a custom .NET backend (`previously-api`) across that project's own phased migration plan. The `supabase/` directory (migrations, Edge Functions, `config.toml`) is kept in this repo purely as historical reference; nothing in the app reads from it anymore. The mechanisms those old migrations solved (RLS recursion via `SECURITY DEFINER` helpers, privilege-escalation triggers guarding columns RLS itself can't constrain, `REPLICA IDENTITY FULL` for realtime `DELETE` payloads, auth emails routed through a custom Edge Function) are documented in `previously-api`'s own `MIGRATION.md`, alongside the decisions made porting each one to the new backend.

**TV Time import matches by title + year, not by ID.** TV Time's GDPR self-service export has no TMDB/TVDB id on any row — only title and (sometimes) a release date. `lib/importers/match.ts` re-resolves every imported title against the TMDB search API, normalizing titles (lowercase, strip a leading "the", collapse punctuation) and preferring a result within one year of the export's year over a same-title/different-year one. Unmatched or ambiguous titles are surfaced to the user for manual disambiguation rather than silently guessing.

## License

Private project, no license granted.
