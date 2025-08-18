# ML\_INTEGRATION.md

> **Authoritative wiring plan** for integrating a lightweight AI validator into Ghost Job Detector. This document removes ambiguity—every choice below is **final** unless superseded in a later versioned doc.
>
> **Status:** Ready to implement on current prod stack (Vercel Serverless + Neon Postgres + Upstash Redis KV + Vercel Blob). **Target branch:** `main`.

---

## 0) Final decisions (single source of truth)

**Execution model**

* **Agent location:** **Client-first** via WebLLM (WebGPU) in a **Web Worker**. If unavailable/slow, call **server fallback**.
* **Fallback provider:** **Groq (OpenAI-compatible)** with **Structured Outputs** (JSON Schema enforced).
* **Model (client):** **`"Llama-3.1-8B-Instruct"`**.
* **Feature flags (env):** `AGENT_ENABLED=true`, `AGENT_USE_SERVER_FALLBACK=true`.

**When to run the agent** (parser-driven triggers)

* Run **Validator** when any parsed field is weak or content is too short:

  * `title.confidence < 0.85`
  * `company.confidence < 0.80`
  * `location.confidence < 0.75`
  * OR normalized description text length `< 140` chars.

**Evidence sent to the agent**

* Always pass **parser output** + **trimmed HTML slice** of the job content **container** (site-specific selector; never whole page).

**Persistence & audit**

* Persist every agent run as an **`events`** row: `kind = "agent.validate"`, `refTable = "job_listings"`, `refId = <job_listing.id>`, `meta = AgentOutput`.
* Do **not** change canonical fields automatically; apply updates only via **ParsingLearningService** promotions (daily).

**Scheduling**

* **On‑demand**: Agent runs synchronously during a single job submission.
* **Daily**: Promotions (mining verified corrections → runtime data rules) execute inside existing **`/api/analysis/tick`**.

**Rate limits & idempotency**

* **Fallback calls:** Upstash key `agent:fallback:{sourceId}:{YYYY-MM-DD}` **max 1/day** per source.
* **Idempotency:** hash payload as `contentSha256`; skip duplicate writes.

---

## 1) Architecture fit

The AI Validator sits **beside** the existing ParserRegistry. It does not replace parsing; it **confirms/repairs** low‑confidence fields and records evidence + suggestions for learning.

```
Client (React/Vite)
  ├─► Parse (ParserRegistry)
  │      └─► If thresholds fail → run WebLLM Validator (Worker)
  │               └─► POST /api/agent/ingest (AgentOutput + evidence)
  └─► If WebGPU absent/slow → POST /api/agent/fallback → JSON schema output

Server (Vercel functions)
  ├─► /api/agent/ingest   ──► Prisma: events (audit) + link to analyses
  ├─► /api/agent/fallback ──► Groq JSON-schema response → same ingest path
  └─► /api/analysis/tick  ──► ParsingLearningService: mine verified corrections → ship rules (data-only)

Datastores
  ├─ Neon Postgres: sources, job_listings, analyses, events, companies
  ├─ Upstash Redis KV: rate limits, idempotency guards
  └─ Vercel Blob: snapshots (HTML/pdf)
```

---

## 2) Client integration (WebLLM in a Worker)

**Files**

* `app/lib/webllm.ts` — Worker bootstrap & engine init.
* `app/agents/validator.ts` — Pure function that accepts `{url, html, parserOutput}` and returns `AgentOutput` using WebLLM.
* Call site: where ParserRegistry returns a result & confidences, evaluate thresholds and invoke validator.

**`app/lib/webllm.ts`**

```ts
// webllm.ts
import { CreateMLCEngine, MLCEngine } from "@mlc-ai/web-llm";

export async function initWebLLM(model = "Llama-3.1-8B-Instruct") {
  const engine: MLCEngine = await CreateMLCEngine(model, {
    initProgressCallback: (p) => console.log("webllm:init", p),
  });
  return engine;
}
```

**`app/agents/validator.ts`** (Worker-friendly)

```ts
import { initWebLLM } from "@/app/lib/webllm";

export type AgentField = { value: string; conf: number; spans?: Array<[number, number]> };
export type AgentOutput = {
  validated: boolean;
  fields: {
    title?: AgentField;
    company?: AgentField;
    location?: AgentField;
  };
  notes?: string;
};

export async function validateWithWebLLM(input: {
  url: string;
  htmlSnippet: string; // trimmed container
  parserOutput: { title?: string; company?: string; location?: string; description?: string };
}): Promise<AgentOutput> {
  const engine = await initWebLLM();
  const sys = `You are a strict job-posting field validator. Return ONLY JSON matching the schema.`;
  const user = JSON.stringify(input);

  const resp = await engine.chat.completions.create({
    messages: [
      { role: "system", content: sys },
      { role: "user", content: user }
    ],
    temperature: 0.2,
    max_tokens: 512
  });

  // WebLLM returns text; parse defensively.
  const text = resp?.choices?.[0]?.message?.content ?? "{}";
  const out = JSON.parse(text) as AgentOutput;
  return out;
}
```

**Threshold gate (example)**

```ts
const needsValidation = (
  r: { title?: {confidence:number}; company?:{confidence:number}; location?:{confidence:number}; description?:string }
) => (
  (r.title?.confidence ?? 0) < 0.85 ||
  (r.company?.confidence ?? 0) < 0.80 ||
  (r.location?.confidence ?? 0) < 0.75 ||
  (r.description?.length ?? 0) < 140
);
```

**Posting to server**

```ts
async function postAgentResult(payload: {
  url: string;
  htmlSnippet: string;
  parserOutput: any;
  agent: "webllm" | "server";
  out: AgentOutput;
}) {
  await fetch("/api/agent/ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}
```

---

## 3) HTML evidence slicing (strict)

* Each parser must expose **one selector** that scopes the main posting content, e.g. `div.jobs-box__html-content` (LinkedIn), or site-equivalent.
* Use `element.outerHTML.slice(0, 40_000)` **max** (avoid whole pages; keeps latency and token usage bounded).
* Strip tracking scripts and ads. Normalize whitespace.

---

## 4) Server APIs

### 4.1 `/api/agent/ingest` — persist + link

**Responsibility**: Validate payload shape, write an `events` audit row, link to latest `analyses` row if present, and return `{ok:true, eventId}`.

**Env required**: `DATABASE_URL` (Neon), optional `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (for idempotency/rate tracking).

```ts
// app/api/agent/ingest/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/server/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const body = await req.json(); // { url, htmlSnippet, parserOutput, agent, out }

  // Basic shape hard-check
  if (!body?.url || !body?.out) {
    return new Response(JSON.stringify({ ok:false, error:"bad_request" }), { status: 400 });
  }

  const contentSha256 = crypto.createHash("sha256").update(JSON.stringify(body)).digest("hex");

  // Idempotency: skip if we already saw this exact result
  const existing = await prisma.events.findFirst({
    where: { kind: "agent.validate", contentSha256 }
  });
  if (existing) return Response.json({ ok:true, eventId: existing.id, dedup:true });

  // Resolve job listing by URL
  const source = await prisma.sources.findFirst({ where: { original_url: body.url } });
  const job = source ? await prisma.job_listings.findFirst({ where: { source_id: source.id } }) : null;

  const evt = await prisma.events.create({
    data: {
      kind: "agent.validate",
      refTable: job ? "job_listings" : null,
      refId: job?.id ?? null,
      meta: body.out,
      contentSha256,
    }
  });

  // Optionally annotate the latest analysis for visibility
  if (job) {
    const last = await prisma.analyses.findFirst({
      where: { job_listing_id: job.id },
      orderBy: { created_at: "desc" },
    });
    if (last) {
      await prisma.analyses.update({
        where: { id: last.id },
        data: { agent_event_id: evt.id },
      });
    }
  }

  return Response.json({ ok:true, eventId: evt.id });
}
```

### 4.2 `/api/agent/fallback` — Groq structured JSON

**Responsibility**: Enforce JSON Schema output and apply **per-source daily rate limit**.

**Env required**: `GROQ_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

```ts
// app/api/agent/fallback/route.ts
import { NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL!, token: process.env.UPSTASH_REDIS_REST_TOKEN! });
const limiter = new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(1, "24 h") });

const AgentJsonSchema = {
  type: "object",
  required: ["validated", "fields"],
  properties: {
    validated: { type: "boolean" },
    fields: {
      type: "object",
      properties: {
        title: { type: "object", properties: { value: {type:"string"}, conf: {type:"number"} }, required:["value","conf"] },
        company: { type: "object", properties: { value: {type:"string"}, conf: {type:"number"} }, required:["value","conf"] },
        location: { type: "object", properties: { value: {type:"string"}, conf: {type:"number"} }, required:["value","conf"] },
      },
      additionalProperties: false
    },
    notes: { type: "string" }
  },
  additionalProperties: false
};

export async function POST(req: NextRequest) {
  if (process.env.AGENT_ENABLED !== "true" || process.env.AGENT_USE_SERVER_FALLBACK !== "true") {
    return new Response(JSON.stringify({ ok:false, error:"fallback_disabled" }), { status: 403 });
  }

  const { url, htmlSnippet, parserOutput } = await req.json();
  if (!url || !htmlSnippet || !parserOutput) {
    return new Response(JSON.stringify({ ok:false, error:"bad_request" }), { status: 400 });
  }

  // per-source daily limit
  const key = `agent:fallback:${Buffer.from(url).toString("base64").slice(0,24)}:${new Date().toISOString().slice(0,10)}`;
  const { success } = await limiter.limit(key);
  if (!success) return new Response(JSON.stringify({ ok:false, error:"rate_limited" }), { status: 429 });

  // Call Groq (OpenAI-compatible) with JSON Schema enforcement
  const payload = {
    model: "mixtral-8x7b-32768", // Groq-supported; interchangeable if you later choose another
    response_format: { type: "json_schema", json_schema: { name: "AgentOutput", schema: AgentJsonSchema }},
    temperature: 0.2,
    max_tokens: 512,
    messages: [
      { role: "system", content: "You are a strict job-posting field validator. Only emit JSON matching the schema." },
      { role: "user", content: JSON.stringify({ url, htmlSnippet, parserOutput }) }
    ]
  };

  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!r.ok) {
    return new Response(JSON.stringify({ ok:false, error:"upstream", status:r.status }), { status: 502 });
  }

  const data = await r.json();
  const out = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");

  // Reuse ingest to persist
  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/agent/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, htmlSnippet, parserOutput, agent: "server", out })
  });

  return Response.json({ ok:true, out });
}
```

> **Note:** We pin one Groq model above for stability; you can revise later via env (`GROQ_MODEL`) without code changes.

---

## 5) Promotion to runtime rules (daily)

* Attach a **final step** to `/api/analysis/tick` that invokes `ParsingLearningService.promote()`.
* **Promotion logic** (data-driven): mine **reviewed/verified** agent suggestions from `events.meta` and serialize them into the **domain rules dataset** (JSON file or table) that parsers read on startup—**never** write code at runtime.
* Keep a simple review queue UI (admin-only) that marks an `events` row as `verified=true` before promotion.

**Pseudocode**

```ts
// inside /api/analysis/tick at the end
const pending = await prisma.events.findMany({
  where: { kind: "agent.validate", verified: true, promotedAt: null },
  take: 200,
});

const rulesDelta = buildDomainRulesFromEvents(pending);
await saveRulesDataset(rulesDelta); // file/table consumed by BaseParser

await prisma.events.updateMany({
  where: { id: { in: pending.map(p=>p.id) } },
  data: { promotedAt: new Date() }
});
```

---

## 6) Environment variables (required)

```
# Core
DATABASE_URL=postgres://...
NEXT_PUBLIC_BASE_URL=https://ghost-job-detector-lilac.vercel.app

# Feature flags
AGENT_ENABLED=true
AGENT_USE_SERVER_FALLBACK=true

# Upstash (rate limit + idempotency)
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# Groq fallback
GROQ_API_KEY=...
GROQ_MODEL=mixtral-8x7b-32768
```

> All secrets must be set as **Sensitive** in Vercel Project Settings.

---

## 7) Data contracts

**TypeScript interface** used across client and server:

```ts
export type AgentField = { value: string; conf: number; spans?: Array<[number, number]> };
export type AgentOutput = {
  validated: boolean;
  fields: { title?: AgentField; company?: AgentField; location?: AgentField };
  notes?: string;
};
```

**JSON Schema** used by fallback (identical shape):

```json
{
  "type": "object",
  "required": ["validated","fields"],
  "additionalProperties": false,
  "properties": {
    "validated": { "type": "boolean" },
    "fields": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "title":    { "type": "object", "required":["value","conf"], "properties": {"value":{"type":"string"}, "conf":{"type":"number"}} },
        "company":  { "type": "object", "required":["value","conf"], "properties": {"value":{"type":"string"}, "conf":{"type":"number"}} },
        "location": { "type": "object", "required":["value","conf"], "properties": {"value":{"type":"string"}, "conf":{"type":"number"}} }
      }
    },
    "notes": { "type": "string" }
  }
}
```

---

## 8) Observability & QA

**Event logging** (required fields)

* `events.kind = "agent.validate"`
* `events.contentSha256`
* `events.duration_ms`
* `events.meta = AgentOutput`
* `events.verified` (boolean; defaults false)
* `events.promotedAt` (nullable datetime)

**Dashboards (v0.2)**

* Agent acceptance rate (%) by site
* Avg delta of confidence (before → after)
* Fallback invocation rate (% of submissions)
* Time-to-first-token (client) & total duration (client/server)

**Kill switches**

* Set `AGENT_ENABLED=false` to bypass all agent work (client and server must honor).

---

## 9) End-to-end test plan

1. **Client GPU path**

   * On a WebGPU browser, submit a LinkedIn URL with weak parser confidences.
   * Expect: Worker loads WebLLM, returns `AgentOutput`, POST to ingest, `events` row written.

2. **No-GPU → fallback**

   * Use Firefox or disable WebGPU.
   * Expect: `/api/agent/fallback` enforces schema, rate limit key hits 1/day, persists via ingest.

3. **Idempotency**

   * Re-submit identical URL + snapshot; expect: ingest returns `{dedup:true}` and **no new** event row.

4. **Promotion**

   * Mark several events `verified=true`; hit `/api/analysis/tick`.
   * Expect: `promotedAt` filled; rules dataset updated; subsequent parses benefit without model calls.

---

## 10) Security & privacy posture

* **Client-first** inference keeps raw page content on-device.
* **Server fallback** only receives **trimmed containers** and redacted strings; never full page or PII beyond job post text.
* All keys stored as **Sensitive** env vars. No keys shipped to client.

---

## 11) FAQ (operational)

**Q: How do we change the browser model later?**
A: Swap `initWebLLM("…")` string or set a config var consumed by the client.

**Q: Can we disable server fallback temporarily?**
A: Yes. Set `AGENT_USE_SERVER_FALLBACK=false` (client still runs when GPU is present).

**Q: Where do we see what changed?**
A: Check the latest `analyses.agent_event_id` and the corresponding `events.meta` JSON for side-by-side field values and confidences. The promotion UI should show the diff prior to verifying.

---

## 12) Definition of done

* ✅ Threshold gates wired in ParserRegistry call site
* ✅ Worker-based WebLLM validator returns `AgentOutput`
* ✅ `/api/agent/ingest` persists event + links to analyses
* ✅ `/api/agent/fallback` enforces JSON Schema + rate limit + persists via ingest
* ✅ Daily promotion step inside `/api/analysis/tick`
* ✅ Feature flags + env secrets set in Vercel
* ✅ Basic metrics visible (SQL or dashboard)

---

**Owner:** Backend/Platform
