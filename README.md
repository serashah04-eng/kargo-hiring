# Kargo Hiring Dashboard

Rubric-based decision support for Arjun. **The system recommends. Arjun decides. The system handles the work after his decision.**

Flow: Arjun adds CV (PDF/DOCX/TXT or paste) + role → Gemini extracts profile and rates each rubric criterion 1–5 with verbatim CV evidence → server computes weighted score `Σ(rating ÷ 5 × weight)` → ranked shortlist → Arjun shortlists / declines → Gemini drafts invite or courtesy email → Arjun edits → clicks **Send** → Resend sends → status, timestamp, email and audit history stored in Neon.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in values
npm run dev
```

| Variable | Where to get it |
| --- | --- |
| `DATABASE_URL` | [console.neon.tech](https://console.neon.tech) → New project → **Connect** → copy the connection string (`postgresql://…?sslmode=require`) |
| `GEMINI_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `RESEND_API_KEY` | [resend.com/api-keys](https://resend.com/api-keys). With the default `onboarding@resend.dev` sender, Resend only delivers to your own Resend account email until you verify a domain and set `EMAIL_FROM`. |
| `EMAIL_DRY_RUN` | `true` records emails as sent without calling Resend (local testing only; shown as DRY-RUN in the UI). |

Tables are created automatically on first request from `db/schema.sql` (candidates, evaluations, emails, actions).

## Source of truth

- `data/rubric.txt` — the provided rubric (included verbatim in every evaluation prompt)
- `src/lib/rubric.ts` — structured criteria + weights mirroring the rubric (weights asserted to total 100)
- `data/jd_pm.txt`, `data/jd_spm.txt` — job descriptions

JD requirements that aren't rubric criteria (years of experience, location) are shown as unscored notes.
