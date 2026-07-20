# Runtime RAG Stability + Regression QA Report

Generated: 2026-07-20T02:49:03.354Z
Base URL: `http://localhost:3000`
Duration: 8639 ms

## Summary

- Passed: **8**
- Failed: **0**
- Warnings: **0**

## Automated Checks

### 1. ✅ Backend health

Status: **PASS**

Backend /health returned status ok.

<details>
<summary>Evidence</summary>

```json
{
  "app": "personal-agent-system",
  "status": "ok",
  "uptime": 147.5323602,
  "timestamp": "2026-07-20T02:48:54.805Z"
}
```

</details>

### 2. ✅ LLM provider endpoint

Status: **PASS**

LLM provider endpoint is reachable.

<details>
<summary>Evidence</summary>

```json
{
  "defaultProvider": "auto",
  "defaultModel": "auto",
  "providers": [
    {
      "provider": "anthropic",
      "displayName": "Anthropic Claude",
      "configured": true,
      "defaultModel": "claude-default",
      "availableModels": [
        {
          "id": "claude-default",
          "label": "Claude Default",
          "mode": "auto",
          "provider": "anthropic"
        },
        {
          "id": "claude-fast",
          "label": "Claude Fast",
          "mode": "fast",
          "provider": "anthropic"
        },
        {
          "id": "claude-deep",
          "label": "Claude Deep",
          "mode": "deep",
          "provider": "anthropic"
        },
        {
          "id": "claude-creative",
          "label": "Claude Creative",
          "mode": "creative",
          "provider": "anthropic"
        }
      ]
    },
    {
      "provider": "google",
      "displayName": "Google AI Studio / Gemini",
      "configured": true,
      "defaultModel": "gemini-default",
      "availableModels": [
        {
          "id": "gemini-default",
          "label": "Gemini Default",
          "mode": "auto",
          "provider": "google"
        },
        {
          "id": "gemini-fast",
          "label": "Gemini Fast",
          "mode": "fast",
          "provider": "google"
        },
        {
          "id": "gemini-deep",
          "label": "Gemini Deep",
          "mode": "deep",
          "provider": "google"
        },
        {
          "id": "gemini-creative",
          "label": "Gemini Creative",
          "mode": "creative",
          "provider": "google"
        }
      ]
    }
  ],
  "secrets": {
    "anthropicConfigured": true,
    "googleConfigured": true,
    "anthropicKeyPreview": "sk-a...-QAA",
    "googleKeyPreview": "AQ.A...HcOA"
  }
}
```

</details>

### 3. ✅ Memory Vault summary

Status: **PASS**

Memory Vault has 10 memories, 10 chunks, 10 embedded chunks.

<details>
<summary>Evidence</summary>

```json
{
  "totalMemories": 10,
  "agentCount": 6,
  "byAgent": {
    "qa-agent": 3,
    "image-agent": 1,
    "writer-agent": 1,
    "research-agent": 1,
    "code-agent": 2,
    "design-agent": 2
  },
  "byType": {
    "regression_policy": 2,
    "agent_scope": 6,
    "project_context": 1,
    "brand_tone": 1
  },
  "byScope": {
    "project": 2,
    "agent": 7,
    "skill": 1
  },
  "ragReadyCount": 0,
  "runtimeInjectableCount": 9,
  "totalChunks": 10,
  "chunkedMemoryCount": 10,
  "pendingEmbeddings": 0,
  "embeddedChunks": 10,
  "failedEmbeddings": 0,
  "totalChunkChars": 1860,
  "totalChunkTokenEstimate": 469,
  "chunksByAgent": {
    "qa-agent": 3,
    "image-agent": 1,
    "writer-agent": 1,
    "research-agent": 1,
    "code-agent": 2,
    "design-agent": 2
  },
  "chunksByType": {
    "regression_policy": 2,
    "agent_scope": 6,
    "project_context": 1,
    "brand_tone": 1
  },
  "chunksByScope": {
    "project": 2,
    "agent": 7,
    "skill": 1
  }
}
```

</details>

### 4. ✅ Semantic search guarded retrieval

Status: **PASS**

Semantic search returned 2 results from 2 eligible candidates.

<details>
<summary>Evidence</summary>

```json
{
  "provider": {
    "id": "local-hash",
    "type": "local-hash",
    "model": "local-hash-v1",
    "dimensions": 96,
    "enabled": true,
    "description": "Local deterministic hash embedding provider for RAG foundation testing. No external API call is required."
  },
  "topResult": {
    "agentName": "design-agent",
    "memoryType": "agent_scope",
    "scope": "agent",
    "score": 0.304149,
    "accessReasons": [
      "scope_allowed",
      "sensitivity_allowed",
      "chunk_agent_match",
      "owner_agent_match",
      "allowed_agent_match"
    ],
    "matchReasons": [
      "linked_skill_match",
      "semantic_similarity"
    ]
  }
}
```

</details>

### 5. ✅ Manual runtime provider

Status: **PASS**

runtimeProvider metadata returned.

<details>
<summary>Evidence</summary>

```json
{
  "providerId": "cmrk1lnct0001ix48skmjfn9r",
  "providerName": "Gemini Built-in ENV",
  "providerType": "google",
  "model": "gemma-4-26b-a4b-it",
  "mode": "auto",
  "resolvedFrom": "registry",
  "isMock": false
}
```

</details>

### 6. ✅ Manual allowed task end-to-end

Status: **PASS**

Manual task returned clean result with runtime memory and runtime RAG metadata.

<details>
<summary>Evidence</summary>

```json
{
  "result": "Lagi butuh mood booster? Segelas kopi susu creamy ini siap nemenin hari kamu biar makin asik. Yuk, pesan sekarang sebelum kehabisan! ☕️✨",
  "runtimeMemoryContext": {
    "injected": true,
    "itemCount": 2,
    "totalChars": 937,
    "usedMemoryIds": [
      "24ef5ceb-597b-4405-9b76-5ad8bc0e009a",
      "4262ffc0-6864-4afe-8f15-9c3e689adade"
    ],
    "usedMemoryTypes": [
      "agent_scope",
      "brand_tone"
    ],
    "usedMemoryScopes": [
      "agent",
      "skill"
    ],
    "usedMemorySources": [
      "memory-foundation/design-agent-agent-scope",
      "memory-foundation/brand-tone"
    ]
  },
  "runtimeRagContext": {
    "previewOnly": false,
    "retrieved": true,
    "query": "buat caption promosi kopi susu dengan gaya santai",
    "itemCount": 2,
    "totalChars": 945,
    "usedChunkIds": [
      "64c979bf-d6bb-4cb4-b1e1-1f96f4b280cb",
      "b5094d0a-c8ee-4330-8f02-aa34a6136f2f"
    ],
    "usedMemoryIds": [
      "24ef5ceb-597b-4405-9b76-5ad8bc0e009a",
      "4262ffc0-6864-4afe-8f15-9c3e689adade"
    ],
    "usedMemoryTypes": [
      "agent_scope",
      "brand_tone"
    ],
    "usedMemoryScopes": [
      "agent",
      "skill"
    ],
    "usedMemorySources": [
      "memory-foundation/design-agent-agent-scope",
      "memory-foundation/brand-tone"
    ],
    "scores": [
      0.304149,
      0.289186
    ],
    "topResults": [
      {
        "chunkId": "64c979bf-d6bb-4cb4-b1e1-1f96f4b280cb",
        "memoryId": "24ef5ceb-597b-4405-9b76-5ad8bc0e009a",
        "agentName": "design-agent",
        "memoryType": "agent_scope",
        "scope": "agent",
        "score": 0.304149,
        "contentPreview": "design-agent focuses on copywriting, captions, promotional copy, branding, slogans, headlines, CTA copy, and campaign wording."
      },
      {
        "chunkId": "b5094d0a-c8ee-4330-8f02-aa34a6136f2f",
        "memoryId": "4262ffc0-6864-4afe-8f15-9c3e689adade",
        "agentName": "design-agent",
        "memoryType": "brand_tone",
        "scope": "skill",
        "score": 0.289186,
        "contentPreview": "Preferred creative tone: concise, practical, friendly, modern, clear, and suitable for Indonesian social media or WhatsApp marketing copy."
      }
    ]
  },
  "taskId": "613c70fb-135d-4d51-ab02-6aeadc594ba6"
}
```

</details>

### 7. ✅ Manual denied task boundary

Status: **PASS**

Denied task correctly blocked by governance and did not run runtime memory/RAG.

<details>
<summary>Evidence</summary>

```json
{
  "result": "Maaf, @design-agent belum punya capability untuk membuat atau menghasilkan gambar/visual. Saya bisa bantu untuk copywriting, caption, slogan, headline, CTA, atau kata-kata promosi. Untuk gambar/visual, coba arahkan ke @image-agent. Request ini terdeteksi mengarah ke area di luar scope: gambar, generate gambar, isometric, vehicle. Coba arahkan ke @writer-agent, @code-agent, @research-agent.",
  "capabilityBoundary": {
    "allowed": false,
    "agentName": "design-agent",
    "reason": "Request matched denied keywords. For strict agents, denied domains take precedence over allowed keywords and skill matches.",
    "confidence": "medium",
    "matchedAllowedKeywords": [],
    "matchedDeniedKeywords": [
      "gambar",
      "generate gambar",
      "isometric",
      "vehicle"
    ],
    "matchedSoftAllowedKeywords": [
      "generate"
    ],
    "matchedSmallTalkKeywords": [],
    "matchedSkillNames": [
      "generate_ad_copy"
    ],
    "matchedSkillSignals": [
      "generate"
    ],
    "suggestedAgents": [
      "writer-agent",
      "code-agent",
      "research-agent"
    ]
  }
}
```

</details>

### 8. ✅ Recent tasks runtime metadata

Status: **PASS**

Recent tasks include runtime memory and runtime RAG metadata.

<details>
<summary>Evidence</summary>

```json
{
  "ragTask": {
    "id": "c7db41e4-bc12-47fc-a240-9bad6a74ee61",
    "source": "manual",
    "runtimeRagRetrieved": false,
    "runtimeRagItemCount": 0
  },
  "memoryTask": {
    "id": "c7db41e4-bc12-47fc-a240-9bad6a74ee61",
    "source": "manual",
    "runtimeMemoryInjected": false,
    "runtimeMemoryItemCount": 0
  }
}
```

</details>

## Manual QA Checklist

### Dashboard / Floating Assistant

- [ ] Open `http://localhost:5173`.
- [ ] Send `@design-agent buat caption promosi kopi susu dengan gaya santai`.
- [ ] Confirm final answer is clean.
- [ ] Confirm Runtime Provider is visible.
- [ ] Confirm Runtime Memory is visible.
- [ ] Confirm RAG Preview is visible.
- [ ] Confirm no metadata leak: chunk IDs, scores, embeddings, vector search, Memory Vault internals.

### WhatsApp Allowed

- [ ] Send from authorized WhatsApp number: `@design-agent buat caption promosi kopi susu dengan gaya santai`.
- [ ] Confirm WhatsApp reply is clean and mobile-friendly.
- [ ] Confirm backend log shows `WhatsApp runtime RAG context: injected=true`.
- [ ] Confirm `/tasks/recent?limit=5` shows latest WhatsApp task with `runtimeRagRetrieved=true`.

### WhatsApp Denied

- [ ] Send `@design-agent generate gambar isometric vehicle`.
- [ ] Confirm polite refusal.
- [ ] Confirm no LLM runtime metadata leak.
- [ ] Confirm blocked task is stored as governance audit.

### Office Scene

- [ ] Open `/office`.
- [ ] Click Mini Activity Log latest task.
- [ ] Confirm Runtime Memory is visible.
- [ ] Confirm Runtime RAG is visible.
- [ ] Click Output Board.
- [ ] Confirm Runtime RAG appears if latest task has RAG metadata.
- [ ] Click WhatsApp Source and Manual Console.
- [ ] Confirm old/null task compatibility remains safe.

## Regression Focus

- Runtime provider metadata must remain visible and stored.
- Governance boundary must block denied requests before LLM/RAG runtime.
- Runtime memory metadata must remain visible in widget, Recent Tasks, and Office Detail.
- Runtime RAG metadata must remain visible in widget, Recent Tasks, and Office Detail.
- WhatsApp output must remain clean, concise, and metadata-free.
- Old/null tasks must not break dashboard or Office scene.

## Final Status

✅ Automated QA completed without failures.
