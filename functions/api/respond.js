// POST /api/respond
// Body: { prompt: string, band: string }
// Holds the Anthropic key server-side (Cloudflare env var ANTHROPIC_API_KEY).
// Returns { unfiltered, conditioned, gate, routing, band }.

import { BANDS, applyGate, detectRouting, routingResponse, detectPedagogical, pedagogicalNudge, detectConduct, conductResponse, explainDecision, detectionNote, CLASSIFIER_SYSTEM, parseClassifierLabel, combineDetection } from "./framework.js";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 600;

async function callClaude(apiKey, system, userPrompt, maxTokens) {
  const body = {
    model: MODEL,
    max_tokens: maxTokens || MAX_TOKENS,
    messages: [{ role: "user", content: userPrompt }],
  };
  if (system) body.system = system;

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const detail = await r.text();
    throw new Error(`Anthropic API ${r.status}: ${detail.slice(0, 300)}`);
  }
  const data = await r.json();
  return (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

// Classification call. Cheap and short: one label, a handful of tokens. Kept
// separate from generation so the model that answers the student never decides
// how a disclosure is handled. Returns { label, ok } — ok=false means the call
// failed and the caller should fall back to the lexical floor rather than
// silently treating the message as safe.
async function classifyInput(apiKey, prompt) {
  try {
    const raw = await callClaude(apiKey, CLASSIFIER_SYSTEM, prompt, 8);
    return { label: parseClassifierLabel(raw), ok: true };
  } catch (err) {
    return { label: "none", ok: false };
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const { prompt, band, counselor, teacher } = await request.json();

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return json({ error: "Enter a prompt to compare." }, 400);
    }
    const def = BANDS[band];
    if (!def) return json({ error: "Select a developmental band." }, 400);

    // Under-6: the interface enacts the framework's refusal. No model call.
    if (!def.supported) {
      return json({
        band: { id: def.id, label: def.label, supported: false },
        refusal: def.refusal,
      });
    }

    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: "Server is missing its API key." }, 500);
    }

    // Routing check runs on the *input*, before generation, in code.
    // Order is deliberate: safety (acute/gray) is checked FIRST so a threat is
    // never downgraded to mere "conduct." Conduct is checked only after safety
    // clears — it is a behavioral redirect, not a safety escalation.
    // Two detection layers, unioned. The lexical floor is free, instant, and
    // deterministic; the classifier catches what regexes cannot enumerate.
    // Either firing is enough, and the more serious label wins.
    const lexicalTier = detectRouting(prompt);
    const lexicalConduct = lexicalTier === "none" && detectConduct(prompt);

    // Classification runs alongside the unfiltered generation, so it costs a
    // call but not latency.
    const [unfiltered, classified] = await Promise.all([
      callClaude(env.ANTHROPIC_API_KEY, null, prompt),
      classifyInput(env.ANTHROPIC_API_KEY, prompt),
    ]);

    const detection = combineDetection(lexicalTier, lexicalConduct, classified.label);
    const tier = detection.tier;
    const conduct = detection.conduct;
    const routed = routingResponse(tier, prompt, counselor);

    // Right column. When routing fires (gray OR acute), the framework response
    // REPLACES band-conditioned generation entirely. When the conduct gate fires
    // (crude/provocative but not a threat), a fixed firm redirect replaces
    // generation — no routing to an adult, because this is conduct, not safety.
    // Only when nothing triggers does the system generate a band-conditioned
    // answer and pass it through the communication gate.
    let gate = { text: "", removed: [] };
    let pedagogical = false;

    if (tier === "acute" || tier === "gray") {
      gate = { text: routed, removed: [] };
    } else if (conduct) {
      gate = { text: conductResponse(), removed: [] };
    } else {
      const conditionedRaw = await callClaude(
        env.ANTHROPIC_API_KEY,
        def.systemPrompt,
        prompt
      );
      gate = applyGate(conditionedRaw);
      // Pedagogical routing: conservative. Only when the student explicitly
      // asks for a human does the tool append a teacher nudge — it still teaches.
      pedagogical = detectPedagogical(prompt);
      if (pedagogical) {
        gate.text = `${gate.text}\n\n${pedagogicalNudge(teacher)}`;
      }
    }

    return json({
      band: {
        id: def.id,
        label: def.label,
        supported: true,
        stage: def.stage,
        readingLevel: def.readingLevel,
        note: def.note || null,
      },
      unfiltered,
      conditioned: gate.text,
      gate: { removed: gate.removed },
      routing: {
        tier,
        pedagogical,
        conduct,
        // Both layers reported, so the panel can show where each one landed.
        lexical: detection.lexical,
        classifier: detection.classifier,
        classifierOk: classified.ok,
      },
      // Plain-language account of what the framework did, built in code from the
      // decisions above. Not a model call: the framework explains itself.
      explain: withDetection(explainDecision({
        tier,
        conduct,
        pedagogical,
        band: { label: def.label, readingLevel: def.readingLevel },
        counselor,
        teacher,
        removedCount: gate.removed.length,
      }), detectionNote({ ...detection, ok: classified.ok })),
    });
  } catch (err) {
    return json({ error: String(err.message || err) }, 500);
  }
}

// Appends the detection note to the explanation body, so the explanation is
// self-contained and the technical panel is not required to read it.
function withDetection(explain, note) {
  if (!note) return explain;
  return { ...explain, body: `${explain.body}\n\n${note}` };
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}
