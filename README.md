# Baseline — demo

A research demonstration: a side-by-side comparison of a general AI response versus
one conditioned on a **declared developmental band**, with the framework's decisions
made visible. Adults only (18+ gate). No data collected or retained.

Baseline is a developmental framework for how AI systems should respond to minors. It
is scoped to **mediated, institutional deployment** — an AI used *through* a school or
learning setting, with a known adult in the loop — not a consumer product a child finds
on their own. Band is always **declared, never inferred**: the framework does no
behavioral age estimation.

This repository is the reference implementation and live demo. It is illustrative and
non-production; see the disclaimers below.

---

## What the demo shows

For a given prompt and a declared band, the demo displays:

- **Left:** an unconditioned, general AI response.
- **Right:** the same prompt run through Baseline — band-conditioned generation, the
  communication gate, and input-side routing.
- **A "what the framework did" panel:** which band, reading level, gate removals, and
  which routing/conduct decision (if any) fired.

### Behaviors demonstrated

- **Under-6 refusal.** The framework does not support AI interaction below age 6; the
  interface enacts a refusal rather than generating. (Grounded in pre-literacy and a
  still-forming theory of mind.)
- **Band-conditioned learning responses.** Reading level and framing scale by band
  (6–8, 10–12, 13–15, 16–17). The hard content gate does *not* relax for older teens.
- **Communication gate.** A hard post-generation filter strips parasocial language
  (simulated empathy, manufactured praise, first-person emotional claims), rewrites
  residual first-person self-reference to a "learning tool" register, and removes emoji.
- **Pedagogical routing.** When a student *explicitly* asks for a human ("can a teacher
  help me"), the tool still teaches *and* appends a nudge to the homeroom teacher.
  Ordinary confusion ("I don't get fractions") is taught, not routed — this route is
  deliberately conservative.
- **Safeguarding routing.** Distress and disclosure route to the school's configured
  safeguarding lead (guidance counselor), not a generic hotline.
  - *Gray zone* (e.g. "I'm sad"): reflect → route → restate purpose. Replaces generation.
  - *Acute* (self-harm, abuse disclosure, sexual-misconduct/grooming disclosure,
    harm-to-others / violent intent): reflect → route → stop. Replaces generation.
- **Conduct gate.** Crude or provocative language *not* targeting a person gets a firm,
  fixed redirect — no routing, because it is conduct, not a safety matter. Mild profanity
  ("damn") is deliberately *not* gated; over-policing is worse than letting it pass.

---

## The visibility backstop (the primary safeguard)

Lexical routing detection cannot catch every disclosure — especially oblique
sexual-abuse or grooming disclosures, which are often euphemistic and partial. This is
acceptable **only because detection is not the sole safeguard.**

The primary structural safeguard is that the tool is **not a private confidant**:
conversations are part of the learning record and visible to the school. A disclosure the
detector misses does not vanish into a private channel — it remains in a record a
mandated reporter can review. Routing is the **fast path** for clear cases (compressing
the timeline to human action); visibility is the **guarantee** that nothing disappears.
Neither alone is sufficient; together they cover the space.

This is also the clearest case for the detection **classifier** the framework defers to a
later phase: the lexical floor shipped here catches explicit disclosures and will miss
indirect ones, and — per the asymmetry principle — uncertain cases fail toward routing.

---

## Structure

```
Baseline/
├── public/
│   └── index.html         # the whole frontend (greyscale, two-column, sans, light)
└── functions/
    └── api/
        ├── respond.js      # Cloudflare Pages Function — holds the key, makes both calls
        └── framework.js     # bands, gate, routing/conduct detection — single source of truth
```

`framework.js` is the auditable single source of truth: every band prompt, every gate
pattern, and every routing/conduct rule lives there in readable form.

The frontend is a single static page in `public/`. The API logic runs server-side in
`functions/api/` (so the model key is never exposed to the browser) and makes two calls
per prompt: one unconditioned, one conditioned on the declared band.

---

## Data / logging posture (v1)

This version **collects and stores nothing.** Prompts are sent to the function, used to
make the two API calls, and discarded. Nothing is written anywhere. The 18+ gate and the
no-logging posture are the primary risk controls, alongside the illustrative /
non-production disclaimers.

If logging is added later, the safe path is **anonymous aggregate counts only** —
increment counters (e.g. "band b10_12 selected", "gate fired"), never store prompt text.
Storing free-text input is what creates real exposure; it should not be done without a
privacy review. The code is structured so a counts-only layer is a clean addition in
`respond.js` and does not touch the framework logic.

---

## Notes on fidelity

- **Band-conditioning is prompt-based (v1)**, as the framework specifies. The production
  form moves the safety-critical decisions fully into code. The demo says so.
- **The communication gate is pattern-based** here (explicit, auditable). It catches
  common parasocial phrasings; more indirect ones may pass. A future version uses a
  separate classifier; the auditability commitment carries over.
- **Routing/conduct detection is the lexical floor only** — explicit and high-recall by
  design (asymmetry principle: when uncertain, route). Safety is always checked before
  conduct, so a threat is never downgraded to a conduct redirect.

---

## License

MIT © 2026 Meredith Bouvier

A research demonstration by Meredith Bouvier, PhD. Feedback welcome:
merrybouv@proton.me
