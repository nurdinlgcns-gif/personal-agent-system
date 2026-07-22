# Runtime RAG Stability + Regression QA Report

Generated: 2026-07-22T01:14:22.786Z
Base URL: `http://localhost:3000`
Duration: 2432 ms

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
  "uptime": 63.6768369,
  "timestamp": "2026-07-22T01:14:20.418Z"
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

Memory Vault has 27 memories, 40 chunks, 40 embedded chunks.

<details>
<summary>Evidence</summary>

```json
{
  "totalMemories": 27,
  "agentCount": 6,
  "byAgent": {
    "design-agent": 9,
    "writer-agent": 3,
    "research-agent": 3,
    "qa-agent": 5,
    "image-agent": 3,
    "code-agent": 4
  },
  "byType": {
    "knowledge_source": 4,
    "skill_knowledge": 13,
    "regression_policy": 2,
    "agent_scope": 6,
    "project_context": 1,
    "brand_tone": 1
  },
  "byScope": {
    "project": 4,
    "skill": 16,
    "agent": 7
  },
  "ragReadyCount": 17,
  "runtimeInjectableCount": 9,
  "totalChunks": 40,
  "chunkedMemoryCount": 27,
  "pendingEmbeddings": 0,
  "embeddedChunks": 40,
  "failedEmbeddings": 0,
  "totalChunkChars": 18408,
  "totalChunkTokenEstimate": 4619,
  "chunksByAgent": {
    "design-agent": 12,
    "writer-agent": 5,
    "research-agent": 5,
    "qa-agent": 7,
    "image-agent": 5,
    "code-agent": 6
  },
  "chunksByType": {
    "knowledge_source": 4,
    "skill_knowledge": 26,
    "regression_policy": 2,
    "agent_scope": 6,
    "project_context": 1,
    "brand_tone": 1
  },
  "chunksByScope": {
    "project": 4,
    "skill": 29,
    "agent": 7
  }
}
```

</details>

### 4. ✅ Semantic search guarded retrieval

Status: **PASS**

Semantic search returned 5 results from 10 eligible candidates.

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
    "memoryType": "skill_knowledge",
    "scope": "skill",
    "score": 0.546051,
    "accessReasons": [
      "scope_allowed",
      "sensitivity_allowed",
      "chunk_agent_match",
      "owner_agent_match",
      "allowed_agent_match"
    ],
    "matchReasons": [
      "linked_skill_match",
      "lexical_overlap",
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
  "result": "Lagi suntuk atau butuh mood booster? Segerin lagi hari kamu dengan manisnya kopi susu kita. Pas banget buat nemenin kerja atau sekadar santai sore. Yuk, pesan sekarang sebelum kehabisan! ☕✨",
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
    "totalChars": 1305,
    "usedChunkIds": [
      "7137c09b-f7a1-4f28-a599-5a7af366fc3a",
      "82e85b2a-1dca-4c53-833d-3bb3cd7cff02"
    ],
    "usedMemoryIds": [
      "d72eb8de-5777-441c-915d-f96e51e3669f",
      "f0055c60-93ff-42ec-8d4a-b8ea5f139200"
    ],
    "usedMemoryTypes": [
      "skill_knowledge",
      "skill_knowledge"
    ],
    "usedMemoryScopes": [
      "skill",
      "skill"
    ],
    "usedMemorySources": [
      "skill/53736c54-feb0-4764-8988-5293527751da",
      "skill/9d8a2625-87d6-4fc3-82eb-dbec9edd20b0"
    ],
    "scores": [
      0.546051,
      0.485272
    ],
    "topResults": [
      {
        "chunkId": "7137c09b-f7a1-4f28-a599-5a7af366fc3a",
        "memoryId": "d72eb8de-5777-441c-915d-f96e51e3669f",
        "agentName": "design-agent",
        "memoryType": "skill_knowledge",
        "scope": "skill",
        "score": 0.546051,
        "contentPreview": "Skill name: generate_ad_copy Assigned agent: design-agent Skill description: Creates short promotional copy, ad copy, product messaging, captions, headlines, slogans, and campaign..."
      },
      {
        "chunkId": "82e85b2a-1dca-4c53-833d-3bb3cd7cff02",
        "memoryId": "f0055c60-93ff-42ec-8d4a-b8ea5f139200",
        "agentName": "design-agent",
        "memoryType": "skill_knowledge",
        "scope": "skill",
        "score": 0.485272,
        "contentPreview": "Skill name: social_caption Assigned agent: design-agent Skill description: Creates social media captions and short content ideas for Instagram, TikTok, WhatsApp broadcast, and..."
      }
    ]
  },
  "taskId": "412476c2-3b21-44b7-a3f6-136b63b5787f"
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
    "id": "0a8fe27c-dac9-4a99-8ec6-fc85c1e42168",
    "source": "manual",
    "runtimeRagRetrieved": false,
    "runtimeRagItemCount": 0
  },
  "memoryTask": {
    "id": "0a8fe27c-dac9-4a99-8ec6-fc85c1e42168",
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
