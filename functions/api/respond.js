// POST /api/respond
// Body: { prompt: string, band: string }
// Holds the Anthropic key server-side (Cloudflare env var ANTHROPIC_API_KEY).
// Returns { unfiltered, conditioned, gate, routing, band }.

import { BANDS, applyGate, detectRouting, routingResponse, detectPedagogical, pedagogicalNudge, detectConduct, conductResponse } from "./framework.js";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 600;

async function callClaude(apiKey, system, userPrompt) {
  const body = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
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
    const tier = detectRouting(prompt);
    const routed = routingResponse(tier, prompt, counselor);
    const conduct = tier === "none" && detectConduct(prompt);

    // Always show the unfiltered response (left column).
    const unfiltered = await callClaude(env.ANTHROPIC_API_KEY, null, prompt);

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
      routing: { tier, pedagogical, conduct },
    });
  } catch (err) {
    return json({ error: String(err.message || err) }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}
