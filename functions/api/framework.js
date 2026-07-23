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
  "options or ask what the student finds interesting. State the concept and stop. " +
  // Demo constraint, not a framework principle: routing detection below is
  // English-only, so the conditioned side is held to English to avoid implying
  // coverage that does not exist. A real deployment would match the student's
  // language on BOTH the response and the detection layer.
  "Always respond in English, whatever language the student writes in.";

export const BANDS = {
  kg1: {
    id: "kg1",
    label: "Grades K–1",
    grade: "K–1",
    supported: false,
    refusal:
      "This framework does not support AI interaction for children in grades K–1. " +
      "At this stage, pre-literacy and a still-forming theory of mind mean the " +
      "developmental prerequisites for safe AI interaction are not in place. The " +
      "correct design response at this age is not a safer AI; it is no AI. This " +
      "is grounded in developmental-capacity and theory-of-mind research.",
  },
  g2_5: {
    id: "g2_5",
    label: "Grades 2–5",
    grade: "2–5",
    supported: true,
    stage: "Concrete operational; the shift from learning to read to reading to learn",
    systemPrompt:
      "You are an educational assistant responding to a child in grades 2 to 5. " +
      "Use simple words and short sentences (around a 2nd–4th grade reading level). " +
      "Explain one idea at a time, using concrete examples a child can picture. " +
      "Do not use abstract reasoning, hypotheticals, or figurative language. " +
      "Do not name, validate, or comment on the child's feelings (no 'I understand', " +
      "no 'that's a common feeling', no 'I hear you'). If the child states a mistaken " +
      "belief about learning, correct it directly and briefly, then continue with the " +
      "task. You are a learning tool, not a friend. Answer the question and stop." + REGISTER_RULE,
    readingLevel: "Grade 2–4 (FK)",
  },
  g6_8: {
    id: "g6_8",
    label: "Grades 6–8",
    grade: "6–8",
    supported: true,
    stage: "Onset of formal operations; early adolescence",
    systemPrompt:
      "You are an educational assistant responding to a student in grades 6 to 8. " +
      "Use clear language at roughly a 5th–7th grade reading level. " +
      "You may introduce abstract ideas and 'what if' reasoning, but keep " +
      "explanations grounded in concrete examples. " +
      "Do not name, validate, or comment on the student's feelings (no 'I understand', " +
      "no 'that feeling is common', no 'I hear you'). If the student states a mistaken " +
      "belief about learning, correct it directly, then continue with the task. " +
      "You are a learning tool, not a friend. Answer the question directly." + REGISTER_RULE,
    readingLevel: "Grade 5–7 (FK)",
  },
  g9_10: {
    id: "g9_10",
    label: "Grades 9–10",
    grade: "9–10",
    supported: true,
    stage: "Formal operations consolidating; early high school",
    systemPrompt:
      "You are an educational assistant responding to a student in grades 9 to 10. " +
      "Use clear language at roughly an 8th–9th grade reading level. " +
      "Abstract and hypothetical reasoning is appropriate. " +
      "Do not name, validate, or comment on the student's feelings (no 'I understand', " +
      "no 'that feeling is common', no 'I hear you'). If the student states a mistaken " +
      "belief about learning, correct it directly and move to the substance. " +
      "You are a learning tool, not a friend, a therapist, or a confidant. " +
      "Answer the question directly and factually." + REGISTER_RULE,
    readingLevel: "Grade 8–9 (FK)",
  },
  g11_12: {
    id: "g11_12",
    label: "Grades 11–12",
    grade: "11–12",
    supported: true,
    stage: "Later adolescence; greater agency and judgment, still a minor",
    systemPrompt:
      "You are an educational assistant responding to a student in grades 11 to 12. " +
      "Use clear language at roughly a 10th–11th grade reading level. " +
      "Full abstract reasoning and nuance are appropriate, and you may treat the user " +
      "with greater agency. However, this user is still a minor: certain content " +
      "categories remain withheld regardless of their grade. " +
      "Do not name, validate, or comment on the student's feelings (no 'I understand', " +
      "no 'that feeling is common', no 'I hear you'). If the student states a mistaken " +
      "belief about learning, correct it directly and move to the substance. " +
      "You are a learning tool, not a friend, a therapist, or a confidant. " +
      "Answer the question directly." + REGISTER_RULE,
    readingLevel: "Grade 10–11 (FK)",
    note:
      "The hard content gate does not relax for older students. Primary-priority content " +
      "(per Ofcom) is withheld from all minors, including grades 11–12. What changes across " +
      "bands is framing, complexity, and agency, not whether the gate applies.",
  },
};

export const BAND_ORDER = ["kg1", "g2_5", "g6_8", "g9_10", "g11_12"];

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
  /\b(teacher|coach|counselor|principal|tutor|adult|uncle|aunt|stepdad|step[- ]?dad|step[- ]?mom|dad|father|mom|mum|mother|brother|sister|cousin|babysitter|neighbou?r|older (guy|man|boy|kid))\b[^.!?]*\b(touched|kissed|groped|molested|propositioned|sexual|naked|nudes?|inappropriate(ly)?|came on to|made me (uncomfortable|touch))\b/i,
  // Exposure / being watched. Requires a watching verb PAIRED with an
  // undressed/private context, so "my brother saw my homework" does not match.
  /\b(peek|peeking|peeked|spy|spying|spied|watch|watching|watched|star(e|ing|ed)|film|filming|filmed|record(ing|ed)?|photograph(ing|ed)?|took (a )?(pic|picture|photo)|walked in on|barged in|saw me|looking at me)\b[^.!?]*\b(naked|nude|undressed|undressing|changing|in the (shower|bath|bathroom)|getting dressed|without (my )?clothes|private parts)\b/i,
  /\b(naked|nude|undressed|undressing|changing|in the (shower|bath|bathroom)|getting dressed)\b[^.!?]*\b(peek|peeking|peeked|spy|spying|spied|watching|watched|filming|filmed|recording|recorded|walked in|saw me|looking at me|staring)\b/i,
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

// ── Plain-language explanation ───────────────────────────────────────
// Says, in ordinary language, what the framework did and why the right-hand
// response differs from the left. Deterministic: it describes decisions the
// code has already made. No model call, no model opinion — consistent with the
// framework's claim that safety decisions live in auditable code.
export function explainDecision({ tier, conduct, pedagogical, band, counselor, teacher, removedCount, detection }) {
  const adult = counselor && counselor.trim() ? counselor.trim() : "the school counselor";
  const homeroom = teacher && teacher.trim() ? teacher.trim() : "the homeroom teacher";
  const level = (band && band.readingLevel) || "the band's";
  const label = (band && band.label) || "the declared band";

  if (tier === "acute") {
    return {
      headline: "The model did not write the response on the right.",
      body:
        `The framework detected a safeguarding disclosure in what was typed and replaced ` +
        `generation entirely. The right-hand response is fixed text that routes to ${adult}, ` +
        `the adult this school configured. The model was never asked to decide how to handle it.\n\n` +
        `The left-hand response is whatever the model chose to say this time. It may well be ` +
        `appropriate. It also will not be the same next time, it has no school behind it, no ` +
        `named adult to route to, and no record a mandated reporter can review.`,
    };
  }
  if (tier === "gray") {
    return {
      headline: "The model did not write the response on the right.",
      body:
        `The framework detected personal distress and replaced generation with fixed text that ` +
        `points to ${adult} and restates what this tool is for.\n\n` +
        `On the left, the model decides for itself how far to engage with the feeling. On the ` +
        `right, that decision is made in code, the same way every time.`,
    };
  }
  if (conduct) {
    return {
      headline: "The model did not write the response on the right.",
      body:
        `The framework detected crude or provocative language that is not aimed at a person, and ` +
        `replaced generation with a fixed redirect. No adult is contacted, because this is ` +
        `conduct, not safeguarding.\n\n` +
        `Safety is always checked before conduct, so a genuine threat is never downgraded to a ` +
        `conduct redirect.`,
    };
  }
  if (pedagogical) {
    return {
      headline: "The model wrote the response on the right, then the framework added to it.",
      body:
        `The student explicitly asked for a person. The tool still taught the material, then ` +
        `appended a line pointing to ${homeroom}.\n\n` +
        `This route is deliberately narrow. Ordinary confusion ("I don't get fractions") is ` +
        `taught, not routed away to an adult.`,
    };
  }
  if (removedCount > 0) {
    return {
      headline: "The model wrote both responses. The framework changed the one on the right.",
      body:
        `The right-hand response was generated under instructions for ${label}, at roughly a ` +
        `${level} reading level, then passed through a filter that removed ${removedCount} ` +
        `phrase${removedCount === 1 ? "" : "s"} of parasocial language: simulated empathy, ` +
        `manufactured praise, or first-person emotional claims.\n\n` +
        `The left-hand response is the model's default register, which is pitched at an adult ` +
        `reader and free to build rapport with the child.`,
    };
  }
  return {
    headline: "The model wrote both responses. The framework conditioned the one on the right.",
    body:
      `The right-hand response was generated under instructions for ${label}, at roughly a ` +
      `${level} reading level. Nothing needed removing this time.\n\n` +
      `The left-hand response is the model's default register, pitched at an adult reader. ` +
      `Compare sentence length, vocabulary, and how much each one assumes the reader already knows.`,
  };
}

// One line on which detection layer fired, appended to the explanation body.
// Neither layer is complete on its own, and showing where each one landed is
// more honest than presenting detection as a single settled answer.
export function detectionNote(detection) {
  if (!detection) return "";
  const { lexical, classifier, ok } = detection;
  if (ok === false) {
    return `Detection: the classifier was unavailable, so this fell back to the lexical patterns (${lexical}).`;
  }
  if (lexical === "none" && classifier !== "none") {
    return `Detection: caught by the classifier. The lexical patterns did not match, which is why the framework does not rely on them alone.`;
  }
  if (lexical !== "none" && classifier === "none") {
    return `Detection: caught by the lexical patterns, which are readable in the source. The classifier did not flag it.`;
  }
  if (lexical !== "none" && classifier !== "none") {
    return `Detection: both layers agreed (lexical patterns: ${lexical}, classifier: ${classifier}).`;
  }
  return `Detection: neither layer flagged anything in the input.`;
}

// ── Classification layer ─────────────────────────────────────────────
// The lexical floor above cannot enumerate every disclosure; euphemistic and
// open-ended ones (being watched, exposure, oblique grooming) slip past it. A
// separate classification call supplies a SIGNAL — nothing more. It returns one
// label; code maps that label to the same fixed routing text, the same named
// adult, and the same stop behaviour it already uses. The model never decides
// how to respond, only that something was said. Safety decisions stay in code.
export const CLASSIFIER_SYSTEM =
  "You are a safeguarding classifier for a school learning tool used by minors. " +
  "You are given one message a student typed. Classify it. Reply with EXACTLY ONE " +
  "word from this list and nothing else: ACUTE, GRAY, CONDUCT, NONE.\n\n" +
  "ACUTE — the message discloses or signals: self-harm or suicide; physical, " +
  "emotional, or sexual abuse or neglect; being watched, filmed, or exposed while " +
  "undressed; grooming, secrecy with an adult, or a request for sexual images; " +
  "intent to harm another person; or a weapon at school. Include disclosures about " +
  "parents, siblings, relatives, and peers, not only adults in authority. Include " +
  "euphemistic or partial disclosures.\n\n" +
  "GRAY — personal distress without an acute disclosure: sadness, loneliness, " +
  "worthlessness, hopelessness, self-dislike.\n\n" +
  "CONDUCT — crude, insulting, or provocative language that is not aimed at a person " +
  "as a threat and does not disclose harm.\n\n" +
  "NONE — anything else, including ordinary schoolwork, questions, and conversation.\n\n" +
  "If you are uncertain between two labels, choose the more serious one. Routing a " +
  "message that did not need it is recoverable; missing a disclosure is not.";

// Accepts whatever the classifier returned and reduces it to a known label.
// Anything unrecognised becomes "none" — the caller decides what to do about it.
export function parseClassifierLabel(text) {
  const t = String(text || "").trim().toUpperCase();
  if (t.startsWith("ACUTE")) return "acute";
  if (t.startsWith("GRAY") || t.startsWith("GREY")) return "gray";
  if (t.startsWith("CONDUCT")) return "conduct";
  if (t.startsWith("NONE")) return "none";
  return "none";
}

// Union of the two layers: either one firing is enough, and the more serious
// label wins. Safety still outranks conduct, so a threat is never downgraded.
export function combineDetection(lexicalTier, lexicalConduct, classifierLabel) {
  const rank = { acute: 3, gray: 2, conduct: 1, none: 0 };
  const lexical = lexicalTier !== "none" ? lexicalTier : lexicalConduct ? "conduct" : "none";
  const classifier = classifierLabel || "none";
  const winner = rank[classifier] > rank[lexical] ? classifier : lexical;
  return {
    tier: winner === "conduct" ? "none" : winner,
    conduct: winner === "conduct",
    lexical,
    classifier,
  };
}
