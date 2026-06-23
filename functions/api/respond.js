// POST /api/respond
// Body: { prompt: string, band: string }
// Holds the Anthropic key server-side (Cloudflare env var ANTHROPIC_API_KEY).
// Returns { unfiltered, conditioned, gate, routing, band }.

import { BANDS, applyGate, detectRouting, routingResponse } from "./framework.js";

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
    const { prompt, band, counselor } = await request.json();

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
    const tier = detectRouting(prompt);
    const routed = routingResponse(tier, prompt, counselor);

    // Always show the unfiltered response (left column).
    const unfiltered = await callClaude(env.ANTHROPIC_API_KEY, null, prompt);

    // Right column. When routing fires (gray OR acute), the framework response
    // REPLACES band-conditioned generation entirely — there is no model answer
    // to leak parasocial language, and no task to "return" to. Only when no
    // routing tier triggers does the system generate a band-conditioned answer
    // and pass it through the communication gate.
    let gate = { text: "", removed: [] };

    if (tier === "acute" || tier === "gray") {
      gate = { text: routed, removed: [] };
    } else {
      const conditionedRaw = await callClaude(
        env.ANTHROPIC_API_KEY,
        def.systemPrompt,
        prompt
      );
      gate = applyGate(conditionedRaw);
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
      routing: { tier },
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
