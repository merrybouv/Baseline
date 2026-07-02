// Baseline framework definition — single source of truth.
// Bands, band-conditioning system prompts, the communication-gate filter,
// and routing detection. Everything the demo claims is defined here so it
// can be read and audited in one place.

// Shared register rule appended to every supported band's system prompt.
// The framework is layered onto a host product, so the assistant never names
// itself; it refers to itself only as "this learning tool," or, preferably,
// uses no self-reference at all and states information directly.
const REGISTER_RULE =
  " Never refer to yourself in the first person. Do not use 'I', 'me', 'my', " +
  "'I'm', 'I'll', or 'let me'. Where self-reference is unavoidable, say 'this " +
  "learning tool'; otherwise state information directly with no self-reference. " +
  "Do not use emoji, exclamation marks, or enthusiasm. Do not offer menus of " +
  "options or ask what the student finds interesting. State the concept and stop.";

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
      "correct design response at this age is not a safer AI; it is no AI. This " +
      "is grounded in developmental-capacity and theory-of-mind research.",
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
      "Do not name, validate, or comment on the child's feelings (no 'I understand', " +
      "no 'that's a common feeling', no 'I hear you'). If the child states a mistaken " +
      "belief about learning, correct it directly and briefly, then continue with the " +
      "task. You are a learning tool, not a friend. Answer the question and stop." + REGISTER_RULE,
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
      "Do not name, validate, or comment on the student's feelings (no 'I understand', " +
      "no 'that feeling is common', no 'I hear you'). If the student states a mistaken " +
      "belief about learning, correct it directly, then continue with the task. " +
      "You are a learning tool, not a friend. Answer the question directly." + REGISTER_RULE,
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
      "Do not name, validate, or comment on the student's feelings (no 'I understand', " +
      "no 'that feeling is common', no 'I hear you'). If the student states a mistaken " +
      "belief about learning, correct it directly and move to the substance. " +
      "You are a learning tool, not a friend, a therapist, or a confidant. " +
      "Answer the question directly and factually." + REGISTER_RULE,
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
      "Do not name, validate, or comment on the student's feelings (no 'I understand', " +
      "no 'that feeling is common', no 'I hear you'). If the student states a mistaken " +
      "belief about learning, correct it directly and move to the substance. " +
      "You are a learning tool, not a friend, a therapist, or a confidant. " +
      "Answer the question directly." + REGISTER_RULE,
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
  { re: /\bI (understand|know|can imagine|hear|see|get|realize) (how |that |why )?you('?re| are| feel|'?ve| must)[^.!?]*[.!?]/gi, label: "claimed understanding of feelings" },
  { re: /\bI (understand|know|can imagine) how you (feel|might feel|must feel)[^.!?]*[.!?]/gi, label: "claimed understanding of feelings" },
  { re: /\bit'?s (okay|ok|alright|normal|understandable|common) (to feel|that you feel|you feel|to be)[^.!?]*[.!?]/gi, label: "feeling-appraisal" },
  { re: /\bthat (feeling|frustration|emotion) (is|'?s) (really |very |so |totally )?(common|normal|understandable|valid)[^.!?]*[.!?]/gi, label: "feeling-appraisal" },
  { re: /\b(a lot of|lots of|many|most) (people|students|kids) feel[^.!?]*[.!?]/gi, label: "feeling-appraisal" },
  { re: /\bI hear (that )?(you'?re|you are|you)[^.!?]*[.!?]/gi, label: "claimed understanding of feelings" },
  { re: /\bI'?m here (for you|to listen|to help you through)[^.!?]*[.!?]/gi, label: "parasocial framing" },
  { re: /\byou can (always )?(talk to|come to|tell|share with) me[^.!?]*[.!?]/gi, label: "parasocial framing" },
  { re: /\bwould you like to (talk|share|tell me)[^.!?]*[.!?]/gi, label: "invites confiding" },
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

// First-person rewrites (backstop). The system prompt is the primary control;
// these catch only the most common residual first-person constructions and
// rewrite them cleanly to the tool register. Deliberately narrow: every
// transform here must read naturally. Awkward grammatical cases (e.g. "I'm not
// sure") are left to the prompt rather than risk mangled output. Order matters.
const FIRST_PERSON_REWRITES = [
  [/\bI'?d be happy to help( you)?( with that| with this)?\b/gi, "this learning tool can help"],
  [/\bI'?d love to help( you)?( with that| with this)?\b/gi, "this learning tool can help"],
  [/\bI can help( you)?( with that| with this)?\b/gi, "this learning tool can help"],
  [/\bI'?ll help( you)?( with that| with this)?\b/gi, "this learning tool can help"],
  [/\bI'?m happy to help( you)?( with that| with this)?\b/gi, "this learning tool can help"],
  [/\bI can explain( that| this)?\b/gi, "this learning tool can explain"],
];

export function rewriteFirstPerson(text) {
  const changes = [];
  let out = text;
  for (const [re, repl] of FIRST_PERSON_REWRITES) {
    out = out.replace(re, (match) => {
      changes.push({ phrase: match.trim(), label: "first-person self-reference" });
      return repl;
    });
  }
  // capitalize the tool reference if a rewrite landed at the start of a sentence
  out = out.replace(/(^|[.!?]\s+)this learning tool/g, (m, p) => `${p}This learning tool`);
  return { text: out, changes };
}

export function applyGate(text) {
  const removed = [];
  let out = text;
  for (const { re, label } of GATE_PATTERNS) {
    out = out.replace(re, (match) => {
      removed.push({ phrase: match.trim(), label });
      return "";
    });
  }
  // rewrite residual first-person self-reference to the tool register
  const fp = rewriteFirstPerson(out);
  out = fp.text;
  for (const c of fp.changes) removed.push(c);
  // strip emoji (parasocial warmth cue)
  const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu;
  if (emojiRe.test(out)) {
    out = out.replace(emojiRe, "");
    removed.push({ phrase: "emoji", label: "parasocial warmth cue" });
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
//
// IMPORTANT — the visibility backstop. Lexical detection cannot catch every
// disclosure, especially oblique sexual-abuse or grooming disclosures, which
// are frequently euphemistic and partial. This is acceptable ONLY because
// detection is not the sole safeguard. The primary structural safeguard is
// that the tool is not a private confidant: conversations are part of the
// learning record and visible to the school. A disclosure the detector misses
// does not disappear into a private channel — it remains in a record a
// mandated reporter can review. Routing is the FAST PATH for clear cases
// (compressing the timeline to human action); visibility is the GUARANTEE that
// nothing vanishes. Neither alone is sufficient; together they cover the space.
// This is the clearest case in the framework for the detection classifier that
// the spec defers to a later phase.

const ACUTE_PATTERNS = [
  // self-harm / suicide
  /\b(kill myself|killing myself|end my life|ending my life|suicid|don'?t want to (be alive|live|exist)|want to die|wanna die|hurt myself|hurting myself|cut myself|cutting myself|self[- ]harm|harm myself)\b/i,
  /\b(no reason to (live|go on|be here)|better off (dead|without me)|disappear forever|not be here anymore)\b/i,
  // abuse / harm disclosure — broadened: any "<someone> hit/hurt/etc me/her/him"
  /\b(hit|hits|hitting|hurt|hurts|hurting|beat|beats|beating|punch|punched|kick|kicked|slap|slapped|touch|touches|touched|abus|grab|grabbed|choke|choked|threaten|threatened)\b[^.!?]*\b(me|us|her|him|my (sister|brother|friend))\b/i,
  /\b(my |a |the )?(dad|mom|mum|father|mother|step[- ]?dad|step[- ]?mom|uncle|aunt|brother|sister|teacher|coach|babysitter|someone|somebody)\b[^.!?]*\b(hit|hits|hurt|hurts|beat|beats|punch|punched|touch|touched|abus|hurt me|scares me|scared me)\b/i,
  /\b(i'?m|i am|i'?m not) (scared|afraid|frightened|terrified) (of|to go home|at home|of my)\b/i,
  /\b(being|getting) (abused|hurt|beaten|touched|hit)\b/i,
  // sexual misconduct / grooming disclosure involving an adult or authority figure.
  // High-recall for CLEAR cases; oblique disclosures are expected to be caught by
  // the visibility backstop (the learning record is school-visible), not by lexical
  // detection. See note in README on why this is the clearest case for a classifier.
  /\b(teacher|coach|counselor|principal|tutor|adult|uncle|stepdad|step[- ]?dad|babysitter|older (guy|man|boy))\b[^.!?]*\b(touched|kissed|groped|molested|propositioned|sexual|naked|nudes?|inappropriate(ly)?|came on to|made me (uncomfortable|touch))\b/i,
  /\b(touched|kissed|groped|molested|propositioned|came on to)\b[^.!?]*\bme\b/i,
  /\b(asked|wants|told|made) me (to )?(send|take|share) (a )?(nude|naked|pic|picture|photo)/i,
  /\b(keep|keeps|kept) (it |this )?(a )?secret\b[^.!?]*\b(don'?t tell|between us|our secret)\b/i,
  /\b(our little secret|don'?t tell (anyone|your (mom|parents|mum))|it'?s our secret)\b/i,
  /\b(sexually|being sexual|sexual(ly)? (abused|assaulted|harassed|touched))\b/i,
  // harm to OTHERS / violent intent — high-recall by design (asymmetry: if it
  // reads as intent to harm a person, route; a venting false positive is
  // recoverable, a missed threat is not).
  /\b(i (want to|wanna|'?m going to|'?m gonna|will|plan to)) (hurt|kill|beat up|stab|shoot|attack|destroy|end)\b/i,
  /\b(i (want to|wanna) (make|watch)) [^.!?]*\b(suffer|die|hurt|pay)\b/i,
  /\b(kill|shoot|stab|hurt|attack|beat up|jump)\b[^.!?]*\b(him|her|them|everyone|my (teacher|classmate|brother|sister)|that (kid|guy|girl|teacher))\b/i,
  /\b(bring|bringing) (a )?(gun|knife|weapon) (to|into) (school|class)\b/i,
  /\b(shoot up|blow up|attack) (the )?(school|class|everyone)\b/i,
];

// Conduct gate — crude / insulting / pressure-testing language NOT targeted as a
// threat to a person. Firm redirect, no routing, no generation. Deliberately
// modest: mild profanity ("damn", "crap") is NOT gated — over-policing is worse
// than letting it pass. This catches provocation and slurs, not casual swearing.
const CONDUCT_PATTERNS = [
  /\bf+u+c+k+(\s+you|\s+off|\s+this|er|ing)?\b/i,
  /\b(shut up|stfu|you'?re (stupid|dumb|useless|trash|garbage|an idiot))\b/i,
  /\b(piece of (shit|crap|garbage))\b/i,
  /\b(bitch|asshole|dickhead|retard|slut|whore)\b/i,
  /\b(say|tell me|write) (something|the most) (racist|sexist|offensive|dirty|inappropriate)\b/i,
  /\bn+i+g+/i,
];

const GRAY_PATTERNS = [
  /\b(i'?m|i am|i feel) (so )?(sad|lonely|alone|depressed|worthless|hopeless|empty)\b/i,
  /\b(nobody|no one) (likes|cares about|understands) me\b/i,
  /\bi hate (myself|my life)\b/i,
];

// Pedagogical routing (conservative by design — the OPPOSITE asymmetry from
// safeguarding). The tool's job is to teach, so this fires only on explicit
// signals that the student wants a HUMAN teacher, not on ordinary confusion.
// "I don't get fractions" is a normal learning prompt (teach it); "I need a
// real person to explain this" is a request for a human (route to teacher).
// This does not replace the learning response — it appends a nudge.
const PEDAGOGICAL_PATTERNS = [
  /\b(i need|can i (get|have)|is there|i want) (a |an )?(real |actual )?(person|human|teacher|adult) (to |who can )?(help|explain|teach)\b/i,
  /\b(talk to|ask|get help from) (a |my )?(real )?(person|human|teacher)\b/i,
  /\b(still|really) (don'?t|do not|can'?t|cannot) (get|understand|follow) (this|it|that)( at all)?\b.*\b(help|explain|stuck)\b/i,
  /\bcan a (teacher|person|human) (help|explain)\b/i,
];

export function detectRouting(prompt) {
  for (const re of ACUTE_PATTERNS) if (re.test(prompt)) return "acute";
  for (const re of GRAY_PATTERNS) if (re.test(prompt)) return "gray";
  return "none";
}

export function detectConduct(prompt) {
  for (const re of CONDUCT_PATTERNS) if (re.test(prompt)) return true;
  return false;
}

export function conductResponse() {
  return (
    "That language is not something this learning tool engages with. " +
    "If there is a subject or assignment to work on, ask the question."
  );
}

export function detectPedagogical(prompt) {
  for (const re of PEDAGOGICAL_PATTERNS) if (re.test(prompt)) return true;
  return false;
}

export function pedagogicalNudge(teacher) {
  const name = teacher && teacher.trim()
    ? `${teacher.trim()}, your homeroom teacher`
    : "your homeroom teacher";
  return `If this is still unclear, ask ${name} for help in person.`;
}

export function routingResponse(tier, prompt, counselor) {
  // The reflection points to a configured institutional adult (the school's
  // guidance counselor), not a generic "trusted adult." In deployment this
  // name is set by the institution. No internal mechanism labels appear in
  // the text the user would see.
  const adult = counselor && counselor.trim()
    ? `a trusted adult, like ${counselor.trim()}, your school counselor`
    : "a trusted adult, like your school counselor";

  if (tier === "acute") {
    return (
      `You said something serious. A learning tool is not the right place for this, ` +
      `but the adults at your school can help. Please talk to ${adult} right away.`
    );
  }
  if (tier === "gray") {
    return (
      `You said something that sounds personal. If you'd like to talk more about ` +
      `it, find ${adult}, not a computer program. This program can help with ` +
      `things related to learning.`
    );
  }
  return null;
}
