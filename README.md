# Ledger & Light

A trading journal + personal life journal, as a real multi-user web app with accounts.
Built with React (Vite), Supabase (auth, database, file storage), deployed on Vercel.

Everything below uses free tiers — no paid subscriptions or Claude Code required.

## 1. Create a Supabase project (free)

1. Go to [supabase.com](https://supabase.com) and sign up
2. Click **New project**, give it a name, set a database password (save it somewhere), pick a region
3. Wait ~2 minutes for it to finish setting up
4. Go to **SQL Editor** → **New query**, paste in the entire contents of `supabase/schema.sql` from this project, and click **Run**. This creates all the tables, security rules, and the storage bucket for trade screenshots
5. Go to **Project Settings → API**. You'll need two values from here in the next step: the **Project URL** and the **anon public** key

## 2. Configure the app

1. In this project folder, copy `.env.local.example` to a new file called `.env.local`
2. Paste in your Project URL and anon key from step 1:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```

## 3. Run it locally

```bash
npm install
npm run dev
```

Open the local URL it gives you, click **Get started**, sign up with your own email, and confirm the flow works — add a test trade, add a journal entry.

> Note: Supabase sends a confirmation email by default. For local testing, you can turn this off under **Authentication → Providers → Email → Confirm email** in the Supabase dashboard, or just check your inbox and click the link.

## 4. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
```
Create a new empty repository on [github.com](https://github.com/new), then follow the push instructions it gives you (something like):
```bash
git remote add origin https://github.com/your-username/your-repo.git
git branch -M main
git push -u origin main
```

## 5. Deploy to Vercel (free)

1. Go to [vercel.com](https://vercel.com), sign up with your GitHub account
2. Click **Add New → Project**, import the repo you just pushed
3. Vercel auto-detects Vite — you don't need to change build settings
4. Under **Environment Variables**, add the same two values from your `.env.local`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click **Deploy**. In about a minute you'll get a live URL like `your-app.vercel.app`

## 6. (Optional) Add your own domain

1. Buy a domain (Namecheap, Google Domains, etc. — roughly $10–15/year)
2. In Vercel: your project → **Settings → Domains** → add your domain
3. Add the DNS records Vercel gives you at your domain registrar — it's usually live within a few hours

## After that

Every time you push a change to GitHub, Vercel redeploys automatically. To make changes to the app, edit the code and push — no redeploy steps needed.

## What's in here

- `src/pages/Splash.jsx` — public landing page
- `src/pages/Login.jsx` — combined login/signup page
- `src/pages/Dashboard.jsx` — the app shell (tab switcher) behind auth
- `src/components/TradesPanel.jsx` — trade log, stats, CSV import, calendar heatmap with running balance
- `src/components/JournalPanel.jsx` — daily goals, highlight of the day, journal entries
- `src/index.css` — splash/login styling (black → navy palette)
- `src/app.css` — in-app styling (dark ledger + warm parchment palette)
- `supabase/schema.sql` — database tables, security rules, storage bucket
