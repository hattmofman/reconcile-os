# ReconcileOS

3PL Invoice Reconciliation Platform. Upload warehouse billing and parcel files, get instant discrepancy reports with rate card 3-way matching.

## Quick Start

### 1. Create a Supabase Project (free)

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, go to **Settings → API** and copy:
   - Project URL
   - `anon` public key
3. Go to **SQL Editor** and paste the contents of `supabase/schema.sql`, then click **Run**
4. Go to **Authentication → Providers** and make sure **Email** is enabled (it is by default)

### 2. Set Up the Project

```bash
# Clone or unzip the project
cd reconcile-os

# Install dependencies
npm install

# Create your environment file
cp .env.local.example .env.local

# Edit .env.local with your Supabase credentials
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Deploy to Vercel

1. Push to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

Your app will be live at `your-project.vercel.app`. You can add a custom domain in Vercel settings.

## Project Structure

```
reconcile-os/
├── src/
│   ├── app/
│   │   ├── page.js              # Landing page
│   │   ├── login/page.js        # Login
│   │   ├── signup/page.js       # Signup
│   │   └── dashboard/
│   │       ├── layout.js        # Auth-protected sidebar layout
│   │       ├── page.js          # Dashboard overview
│   │       ├── new/page.js      # New reconciliation (core tool)
│   │       └── history/page.js  # Past reports with detail view
│   ├── components/
│   │   └── AuthForm.jsx         # Shared login/signup form
│   └── lib/
│       ├── supabase.js          # Supabase client
│       └── reconciler.js        # Core parsing + finding engine
├── supabase/
│   └── schema.sql               # Database schema (run in SQL editor)
└── package.json
```

## What It Catches

**Billing Errors (Red)**
- Quantity mismatches (billed vs actual received)
- Rate card math errors (rate × qty ≠ billed)
- Phantom charges (parcel bills for orders not in OB)
- Post-billing cost increases

**Optimization Opportunities (Amber)**
- Delivery area surcharges (DAS/EDAS/RDAS)
- Peak surcharges
- Dimensional weight opportunities

**Informational (Blue)**
- Inbound receipt discrepancies
- CPO tracking (shipping + all-in)

## Supported 3PL Formats

Currently optimized for **Stord** EOM files:
- Warehouse EOM (Summary, OB Summary, IB Lines, IB Report, VAS-Labor, Materials, Returns)
- Parcel Transaction Reports (Summary, Parcel Txns, Parcel Backup Report)

The parser auto-detects file types by sheet names.

## Tech Stack

- **Next.js 14** (App Router)
- **Supabase** (Postgres + Auth + Row Level Security)
- **Tailwind CSS**
- **SheetJS** (XLSX parsing)
- **Lodash** (data aggregation)
- **Vercel** (hosting)
