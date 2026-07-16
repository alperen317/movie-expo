# Previously

![CI](https://github.com/alperen317/movie-expo/actions/workflows/ci.yml/badge.svg)

**Previously** is a mobile-first movie & TV tracker: track what you've watched, mark episodes as you go, build watchlists, and share lists with friends in real time. Built with Expo/React Native and a Supabase backend, with all catalog data sourced from [TMDB](https://www.themoviedb.org/).

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
lib/tmdb      -> typed TMDB API client (catalog data: movies, shows, search, people)
lib/supabase  -> typed Supabase queries/RPCs (auth, saved media, shared lists, watch log, episode progress)
stores        -> Zustand stores; the only layer allowed to call lib/* and hold app state
app           -> expo-router screens; read from stores, never call lib/* directly
```

Supporting modules: `lib/importers` (TV Time/Letterboxd CSV parsing + TMDB re-matching), `lib/notifications` (local episode reminders), `lib/avatar` (deterministic avatar generation), `components` (shared UI, organized by feature area).

Auth and data live in Supabase (Postgres + Row Level Security); see `supabase/migrations/` for the schema, applied in order.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment variables** — copy `.env.example` to `.env` and fill in:

   | Variable                        | Description                                                                                         |
   | ------------------------------- | --------------------------------------------------------------------------------------------------- |
   | `EXPO_PUBLIC_TMDB_ACCESS_TOKEN` | TMDB API Read Access Token ([themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)) |
   | `EXPO_PUBLIC_SUPABASE_URL`      | Your Supabase project URL                                                                           |
   | `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase project's anon/public key                                                             |
   | `EXPO_PUBLIC_SENTRY_DSN`        | Optional — crash reporting is a no-op until this is set (see `lib/telemetry/sentry.ts`)             |

3. **Install the Supabase CLI as a dev dependency** — don't use `npm install -g supabase`; Supabase no longer supports installing it as a global npm module (it produces a broken shim on some platforms). Install it locally and invoke it via `npx` instead:

   ```bash
   npm install supabase --save-dev
   ```

4. **Apply Supabase migrations** — run the files in `supabase/migrations/` in order (`0001_...sql` through the latest) against your Supabase project, e.g. via the SQL editor or the [Supabase CLI](https://supabase.com/docs/guides/cli):

   ```bash
   npx supabase db push
   ```

5. **Set up the auth email Edge Function** — signup confirmation and password reset codes are sent by a custom Supabase Edge Function (`supabase/functions/send-auth-email`) via [Brevo](https://www.brevo.com/), not Supabase's built-in email provider:

   ```bash
   cp supabase/functions/.env.example supabase/functions/.env   # fill in Brevo + hook secret values
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase secrets set --env-file supabase/functions/.env
   npx supabase functions deploy send-auth-email
   ```

   Then in the Supabase Dashboard: **Authentication → Hooks** → add a "Send Email" hook pointing at the deployed function URL, copy the generated `v1,whsec_...` secret back into `SEND_EMAIL_HOOK_SECRET` and re-run `npx supabase secrets set --env-file supabase/functions/.env`, and confirm "Enforce JWT Verification" is off for the function (Edge Functions → send-auth-email → Settings).

6. **Run the app**

   ```bash
   npm run start   # Expo dev server; press i / a / w, or scan the QR code
   npm run web     # web only
   ```

7. **(Store builds only)** `eas.json` defines `development`/`preview`/`production` build profiles, but isn't yet linked to an Expo account/project. Run `npx eas login` then `eas init` once to link one — this writes `extra.eas.projectId` into `app.json`.

## Development

```bash
npx tsc --noEmit   # type check
npm test           # jest
npm run lint       # eslint
npm run format     # prettier --write
```

CI runs type check, lint, format check, and tests on every push/PR to `master` (`.github/workflows/ci.yml`).

## Tech Stack

Expo SDK 54 (React Native 0.81, React 19) · expo-router · TypeScript · NativeWind (Tailwind for RN) · Zustand · Supabase (Postgres, Auth, Realtime, RLS) · TMDB API · Jest

## Design Decisions

**RLS recursion avoided via `SECURITY DEFINER` helpers.** A naive "select where I'm a member of this list" policy on `list_members` would subquery `list_members` from inside its own policy — Postgres flags that as infinite recursion. `supabase/migrations/0003_shared_lists.sql` instead pushes membership checks into small `SECURITY DEFINER` functions (`is_list_member`, `is_list_owner`, `can_view_list`) that execute as their owner, bypassing RLS internally instead of recursing into it — the pattern Supabase's own docs recommend.

**Privilege-escalation triggers alongside RLS `UPDATE` policies.** RLS `USING`/`WITH CHECK` clauses constrain which _rows_ an `UPDATE` can touch, not which _columns_ change. On `lists`, the update policy only checks `created_by = auth.uid()`, so without an extra guard any member could rename a list _and_ silently rewrite `created_by` to themselves in the same statement — hijacking ownership. Same class of bug on `list_members`: a user could flip an unrelated row's `status` to `'accepted'`, manufacturing membership in a list they were never invited to. Both tables carry a `BEFORE UPDATE` trigger (`prevent_list_reassignment`, `prevent_list_member_tampering`) that rejects any column change RLS itself can't express — a good reminder that Postgres RLS is row-scoped, not column-scoped.

**Realtime DELETE payloads need `REPLICA IDENTITY FULL`.** Postgres tables default to `REPLICA IDENTITY DEFAULT`, which writes only the primary key to the WAL on `DELETE`. Supabase Realtime relays that as-is, so a `DELETE` event's `payload.old` normally contains just the row's `id` — not `media_id`/`media_type`, which is what the client needs to locate the item to remove (`stores/sharedLists.store.ts` → `onItemsChange`). This meant adding an item synced live to other members but removing one silently didn't. `supabase/migrations/0005_replica_identity_full.sql` sets `REPLICA IDENTITY FULL` on the shared-list tables so `payload.old` carries the full row on delete too.

**Auth emails route through a custom Edge Function, not Supabase's built-in provider.** Supabase's default email provider is capped at 2 emails/hour and offers little control over content or deliverability. `supabase/functions/send-auth-email` is registered as the project's [Send Email Hook](https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook), so GoTrue calls it (over a signed webhook, verified with `standardwebhooks`) instead of sending mail itself, and it forwards the message to Brevo's transactional email API. The UX is OTP-code-based rather than link-based on purpose — `lib/supabase/client.ts` sets `detectSessionInUrl: false`, so a magic-link/deep-link flow would need extra plumbing (universal links, an in-app URL handler) that a 6-digit code typed into `app/verify-otp.tsx` avoids entirely.

**TV Time import matches by title + year, not by ID.** TV Time's GDPR self-service export has no TMDB/TVDB id on any row — only title and (sometimes) a release date. `lib/importers/match.ts` re-resolves every imported title against the TMDB search API, normalizing titles (lowercase, strip a leading "the", collapse punctuation) and preferring a result within one year of the export's year over a same-title/different-year one. Unmatched or ambiguous titles are surfaced to the user for manual disambiguation rather than silently guessing.

## License

Private project, no license granted.
