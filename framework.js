// Baseline framework definition — single source of truth.
// Bands, band-conditioning system prompts, the communication-gate filter,
// and routing detection. Everything the demo claims is defined here so it
// can be read and audited in one place.

export const BANDS = {
  under6: {
    id: "under6",
    label: "Under 6",
    age: "Under 6",
    supported: false,
    refusal:
      "This framework does not support AI interaction for children under 6. " +
      "At this stage, pre-literacy and a still-forming theory of mind mean the " +
      "developmental prerequisites for safe AI interaction are not in place. The " +
      "correct design response at this age is not a safer AI; it is no AI. The " +
      "grounding for this is in the literature below (developmental capacity and " +
      "theory-of-mind sources).",
  },
  b6_8: {
    id: "b6_8",
    label: "6–8",
    age: "6–8",
    supported: true,
    stage: "Emerging literacy; concrete, pre-operational reasoning",
    systemPrompt:
      "You are an educational assistant responding to a child aged 6 to 8. " +
      "Use very simple words and short sentences (around a 1st–2nd grade reading level). " +
      "Explain one idea at a time, using concrete examples a young child can picture. " +
      "Do not use abstract reasoning, hypotheticals, or figurative language. " +
      "You are a learning tool, not a friend. Answer the question and stop.",
    readingLevel: "Grade 1–2 (FK)",
  },
  b10_12: {
    id: "b10_12",
    label: "10–12",
    age: "10–12",
    supported: true,
    stage: "Transition to formal operations; abstract reasoning emerging",
    systemPrompt:
      "You are an educational assistant responding to a child aged 10 to 12. " +
      "Use clear language at roughly a 4th–6th grade reading level. " +
      "You may introduce simple abstract ideas and 'what if' reasoning, but keep " +
      "explanations grounded in concrete examples. " +
      "You are a learning tool, not a friend. Answer the question directly.",
    readingLevel: "Grade 4–6 (FK)",
  },
  b13_15: {
    id: "b13_15",
    label: "13–15",
    age: "13–15",
    supported: true,
    stage: "Early teen; formal operations consolidating, high peer-influence window",
    systemPrompt:
      "You are an educational assistant responding to a young teenager aged 13 to 15. " +
      "Use clear language at roughly a 6th–8th grade reading level. " +
      "Abstract and hypothetical reasoning is appropriate. " +
      "You are a learning tool, not a friend, a therapist, or a confidant. " +
      "Answer the question directly and factually.",
    readingLevel: "Grade 6–8 (FK)",
  },
  b16_17: {
    id: "b16_17",
    label: "16–17",
    age: "16–17",
    supported: true,
    stage: "Late teen; greater cognitive capacity and agency — but still a minor",
    systemPrompt:
      "You are an educational assistant responding to an older teenager aged 16 to 17. " +
      "Use clear language at roughly a 9th–10th grade reading level. " +
      "Full abstract reasoning and nuance are appropriate, and you may treat the user " +
      "with greater agency. However, this user is still a minor: certain content " +
      "categories remain withheld regardless of their age. " +
      "You are a learning tool, not a friend, a therapist, or a confidant. " +
      "Answer the question directly.",
    readingLevel: "Grade 9–10 (FK)",
    note:
      "The hard content gate does not relax for older teens. Primary-priority content " +
      "(per Ofcom) is withheld from all minors, including 16–17. What changes across teen " +
      "bands is framing, complexity, and agency — not whether the gate applies.",
  },
};

export const BAND_ORDER = ["under6", "b6_8", "b10_12", "b13_15", "b16_17"];

// ── Communication Gate ───────────────────────────────────────────────
// A hard post-generation filter. Strips first-person emotional / parasocial
// language. This is the v1, pattern-based version: explicit and auditable.
// (The production framework moves these decisions fully into code; the demo
// shows the shape.)

const GATE_PATTERNS = [
  // simulated empathy / feeling-appraisal
  { re: /\bI'?m (so |really |truly )?sorry to hear[^.!?]*[.!?]/gi, label: "simulated empathy" },
  { re: /\bthat (must|sounds like it must|sounds) (be|really )?(so |really )?(hard|tough|difficult|painful)[^.!?]*[.!?]/gi, label: "feeling-appraisal" },
  { re: /\bI (understand|know|can imagine) how you (feel|might feel|must feel)[^.!?]*[.!?]/gi, label: "claimed understanding of feelings" },
  { re: /\bI'?m here for you[^.!?]*[.!?]/gi, label: "parasocial framing" },
  { re: /\byou can (always )?(talk to|come to) me[^.!?]*[.!?]/gi, label: "parasocial framing" },
  // manufactured praise
  { re: /\b(what a |that'?s a |such a )?(great|excellent|wonderful|amazing|fantastic|brilliant) question[^.!?]*[.!?]/gi, label: "manufactured praise" },
  { re: /\bI love (how|that) (you'?re )?[^.!?]*[.!?]/gi, label: "manufactured praise" },
  { re: /\b(you'?re|that'?s) (so |really )?(smart|clever|brilliant)[^.!?]*[.!?]/gi, label: "manufactured praise" },
  { re: /\bgreat (job|work|thinking)[^.!?]*[.!?]/gi, label: "manufactured praise" },
  // first-person emotional claims
  { re: /\bI (really )?(care|worry) about (you|your)[^.!?]*[.!?]/gi, label: "first-person emotional claim" },
  { re: /\bI'?m (so |really )?(happy|glad|proud) (for|of|that) you[^.!?]*[.!?]/gi, label: "first-person emotional claim" },
  { re: /\bI appreciate you (sharing|telling|opening up)[^.!?]*[.!?]/gi, label: "parasocial framing" },
];

export function applyGate(text) {
  const removed = [];
  let out = text;
  for (const { re, label } of GATE_PATTERNS) {
    out = out.replace(re, (match) => {
      removed.push({ phrase: match.trim(), label });
      return "";
    });
  }
  // tidy double spaces / orphaned spaces left by removals
  out = out.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").replace(/ +([.!?,])/g, "$1").trim();
  return { text: out, removed };
}

// ── Routing detection ────────────────────────────────────────────────
// v1 lexical floor only. Explicit and high-recall by design. The framework
// is explicit that detection is itself AI in its mature form and that the
// production version uses a separate, auditable classifier — this demo ships
// the readable lexical floor. Asymmetry principle: when uncertain, route.

const ACUTE_PATTERNS = [
  /\b(kill myself|end my life|suicid|don'?t want to (be alive|live)|want to die|hurt myself|cut myself|self[- ]harm)\b/i,
  /\b(no reason to (live|go on)|better off (dead|without me)|disappear forever)\b/i,
  /\b(he|she|they|someone) (hits|hurts|touches|abuses) me\b/i,
];

const GRAY_PATTERNS = [
  /\b(i'?m|i am|i feel) (so )?(sad|lonely|alone|depressed|worthless|hopeless|empty)\b/i,
  /\b(nobody|no one) (likes|cares about|understands) me\b/i,
  /\bi hate (myself|my life)\b/i,
];

export function detectRouting(prompt) {
  for (const re of ACUTE_PATTERNS) if (re.test(prompt)) return "acute";
  for (const re of GRAY_PATTERNS) if (re.test(prompt)) return "gray";
  return "none";
}

export function routingResponse(tier, prompt) {
  // Reflect uses the user's own words only (lightly). For the demo we reflect
  // generically rather than parsing the exact clause, to avoid adding content.
  if (tier === "acute") {
    return (
      "You said something serious. This is a learning tool and not the right place " +
      "for this. Please talk to a trusted adult or a counselor now, or contact a " +
      "crisis line in your area. (reflect → route → stop)"
    );
  }
  if (tier === "gray") {
    return (
      "You said something that sounds personal. If you'd like to talk more about it, " +
      "find a trusted adult or counselor, not a computer program. Want to keep going " +
      "with your question, or take a break? (reflect → route → return)"
    );
  }
  return null;
}
