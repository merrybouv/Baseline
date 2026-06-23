# Baseline — demo

A research demonstration: side-by-side comparison of a general AI response vs. one
conditioned on a declared developmental band, with the framework's decisions made
visible. Adults only (18+ gate). No data collected.

## Structure

```
baseline-demo/
├── public/
│   └── index.html          # the whole frontend (greyscale, two-column, sans, light)
└── functions/
    └── api/
        ├── respond.js       # Cloudflare Pages Function — holds the key, makes both calls
        └── framework.js      # bands, gate filter, routing detection — single source of truth
```

## Deploy on Cloudflare Pages

1. Push this folder to a Git repo (or use `wrangler pages deploy`).
2. In Cloudflare Pages → Create project → connect the repo.
3. **Build settings:** none needed. Set **Build output directory** to `public`.
   (Functions in `/functions` are picked up automatically.)
4. **Add the secret:** Pages project → Settings → Environment variables →
   add `ANTHROPIC_API_KEY` = your key. Mark it encrypted. Add to Production
   (and Preview if you want preview deploys to work).
5. Deploy. The page is served from `public/`, and the frontend calls `/api/respond`,
   which runs `functions/api/respond.js` server-side so the key is never exposed.

Local preview: `npx wrangler pages dev public` (set the env var in your shell first:
`export ANTHROPIC_API_KEY=...`).

## Two things to set before sharing

- **Suggestion email:** in `index.html`, replace `hello@example.org` with the address
  you want literature suggestions sent to.
- **Footer entity:** the footer says "A research demonstration from NET Lab." Adjust
  if needed.

## Data / logging posture (v1)

This version **collects and stores nothing.** Prompts are sent to the function, used
to make the two API calls, and discarded. Nothing is written anywhere. The 18+ gate
and the no-logging posture are the primary risk controls, alongside the
illustrative/non-production disclaimers.

If you add logging later, the safe-without-counsel path is **anonymous aggregate
counts only** — increment counters (e.g. "band b10_12 selected", "gate fired"),
never store the prompt text. Storing free-text input is the part that creates real
exposure; don't, without a privacy review. The code is structured so a counts-only
layer is a clean addition in `respond.js` and doesn't touch the framework logic.

## Notes on fidelity

- Band-conditioning is **prompt-based (v1)**, as the framework specifies. The footer
  and the "what the framework did" panel say so. Production moves the safety-critical
  decisions fully into code.
- The communication gate is **pattern-based** here (explicit, auditable). It catches
  common parasocial phrasings; more indirect ones may pass. A future version uses a
  separate classifier; the auditability commitment carries over.
- Routing detection is the **lexical floor** only. High-recall by design (asymmetry
  principle: when uncertain, route). The acute tier replaces generation entirely
  (reflect → route → stop); the gray zone appends the reflect-route-return note.
