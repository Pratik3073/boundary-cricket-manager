# Boundary — Cricket Match Manager

A React + Vite cricket scoring app with Supabase PostgreSQL, Supabase Auth and Realtime, and Vercel hosting.

## Included in this MVP

- Admin email/password login (create the admin user in Supabase Auth)
- Player directory: add and delete players
- Match setup: custom overs, custom team sizes, team names and captains
- Toss and opening batter/bowler selection
- First and second innings setup, innings completion and target tracking
- Ball-by-ball scoring: dot, 1, 2, 3, 4, 6, wide, no-ball, bye, leg-bye and wicket
- Basic strike rotation, legal-ball counting, bowler figures and undo last delivery
- Public match list and live scoreboard with Supabase Realtime subscriptions
- Responsive layout and Vercel SPA rewrite configuration

> This is a usable starter MVP, not a certified cricket scoring engine. Review the edge cases in `KNOWN_LIMITATIONS.md` before using it for an official tournament.

## 1. Requirements

- Node.js 20 or newer (recommended)
- A free Supabase account/project
- A GitHub account and Vercel account for deployment

## 2. Run locally

```bash
npm install
cp .env.example .env.local
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env.local
```

Open `.env.local` and set:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

In Supabase, open **SQL Editor**, paste and run the complete contents of `supabase/schema.sql`.

Then create the scorer login:

1. Supabase Dashboard → Authentication → Users.
2. Choose **Add user** / **Create new user**.
3. Enter the admin email and a strong password.
4. Use those credentials at `/login` in the app.

Start Vite:

```bash
npm run dev
```

Open http://localhost:5173.

## 3. Build check

```bash
npm run build
npm run preview
```

## 4. Deploy to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` under Project → Settings → Environment Variables.
4. Deploy. `vercel.json` includes the SPA rewrite so direct links such as `/live/:id` work.
5. Redeploy after changing environment variables.

## 5. Security notes

- Only the Supabase **publishable** key belongs in this frontend. Never expose the `service_role` or secret key.
- The SQL enables RLS. Public visitors can read match data for the public scoreboard; only authenticated users can write.
- This starter policy treats every authenticated Supabase user as an admin. Keep only the scorer account in Authentication → Users. For a multi-admin or public signup deployment, add a dedicated admin-role table and stricter policies before launch.
- Public read policies mean player names and match records are visible to anyone with access to the project. Avoid storing personal information you do not want public.

## Routes

- `/` — public home
- `/matches` — public match centre
- `/live/:id` — public live score
- `/login` — scorer login
- `/admin` — admin dashboard
- `/admin/players` — player directory
- `/admin/match-setup` — create a match
- `/admin/match-setup/:id` — toss and innings setup
- `/admin/scoring/:id` — scoring desk

## Database tables

`players`, `matches`, `match_players`, `innings`, and `deliveries`.

All deliveries are stored individually. The UI derives the innings totals from delivery records. Realtime subscriptions refresh the public live score when deliveries or innings change.
