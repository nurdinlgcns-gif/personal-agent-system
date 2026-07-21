# RAG Retrieval Evaluation QA Report

Generated: 2026-07-21T01:52:46.361Z
Base URL: `http://localhost:3000`
Dataset: `D:\Belajar Agentic Ai\personal-agent-system\backend\evaluation\rag-retrieval-evaluation-dataset.json`
Dataset version: **8.59**
Duration: 128 ms

## Summary

- Passed cases: **7**
- Failed cases: **0**
- Warnings: **0**
- Total cases: **7**

## Memory Vault Prerequisite Snapshot

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

## Evaluation Cases

### 1. ✅ Design brand tone for WhatsApp marketing

Status: **PASS**

- Case ID: `design-brand-tone-whatsapp`
- Agent: `design-agent`
- Query: `tone santai WhatsApp marketing CTA natural`
- Candidates: 40
- Eligible: 10
- Returned: 8

#### Checks

- ✅ **minimum returned count**: Expected at least 1 result(s), got 8.
- ✅ **expected agent relevance**: Expected at least one result from design-agent or only shared/explicitly allowed cross-agent results.
- ✅ **no private cross-agent leakage**: Expected no private/non-shared result from denied agents: code-agent, qa-agent.
- ✅ **expected memory type**: Expected at least one memoryType from: brand_tone, knowledge_source, skill_knowledge.
- ✅ **expected source type**: Expected at least one sourceType from: seed, knowledge_source, skill.
- ✅ **access reasons present**: Every returned result should include accessReasons for auditability.
- ✅ **valid retrieval scores**: Every returned result should include a numeric score.

<details>
<summary>Top results evidence</summary>

```json
[
  {
    "chunkId": "62bd07f0-01a6-48f9-8898-6524faf9cabb",
    "memoryId": "4262ffc0-6864-4afe-8f15-9c3e689adade",
    "agentName": "design-agent",
    "ownerAgentName": "design-agent",
    "memoryType": "brand_tone",
    "scope": "skill",
    "sourceType": "seed",
    "sourceRef": "memory-foundation/brand-tone",
    "score": 0.677892,
    "allowedAgents": [
      "design-agent",
      "writer-agent"
    ],
    "linkedSkillNames": [
      "generate_ad_copy",
      "brand_message",
      "social_caption"
    ],
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
    ],
    "preview": "Preferred creative tone: concise, practical, friendly, modern, clear, and suitable for Indonesian social media or WhatsApp marketing copy."
  },
  {
    "chunkId": "c9bd189a-61ed-4c74-94d4-86b533770c56",
    "memoryId": "85941b03-0567-4b4d-8f5b-b69f45393af5",
    "agentName": "design-agent",
    "ownerAgentName": "design-agent",
    "memoryType": "knowledge_source",
    "scope": "skill",
    "sourceType": "knowledge_source",
    "sourceRef": "knowledge-source/manual/brand-guide-kopi-susu",
    "score": 0.619273,
    "allowedAgents": [
      "design-agent",
      "writer-agent"
    ],
    "linkedSkillNames": [
      "generate_ad_copy",
      "social_caption"
    ],
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
    ],
    "preview": "Knowledge source title: Brand Guide Kopi Susu\nSource reference: knowledge-source/manual/brand-guide-kopi-susu\nGunakan tone santai, ramah, modern, dan cocok untuk WhatsApp marketing. CTA harus pendek dan natural."
  },
  {
    "chunkId": "52634a40-be60-481d-b70c-f5baaeb26370",
    "memoryId": "e7f29020-e64e-4b50-97a9-fa07c99f22c9",
    "agentName": "design-agent",
    "ownerAgentName": "design-agent",
    "memoryType": "knowledge_source",
    "scope": "skill",
    "sourceType": "knowledge_source",
    "sourceRef": "knowledge-source/manual/whatsapp-campaign-style-guide",
    "score": 0.613019,
    "allowedAgents": [
      "design-agent",
      "writer-agent"
    ],
    "linkedSkillNames": [
      "generate_ad_copy",
      "social_caption"
    ],
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
    ],
    "preview": "Knowledge source title: WhatsApp Campaign Style Guide\nSource reference: knowledge-source/manual/whatsapp-campaign-style-guide\nGunakan bahasa santai, ringkas, jelas, mobile-friendly, dan CTA natural untuk campaign WhatsAp"
  },
  {
    "chunkId": "ff48b76b-2550-4ac6-9543-96181c9a3993",
    "memoryId": "d72eb8de-5777-441c-915d-f96e51e3669f",
    "agentName": "design-agent",
    "ownerAgentName": "design-agent",
    "memoryType": "skill_knowledge",
    "scope": "skill",
    "sourceType": "skill",
    "sourceRef": "skill/53736c54-feb0-4764-8988-5293527751da",
    "score": 0.549894,
    "allowedAgents": [
      "design-agent"
    ],
    "linkedSkillNames": [
      "generate_ad_copy"
    ],
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
    ],
    "preview": "t 5 opsi CTA untuk landing page\"\n## Input Contract\nThe user should provide:\n- Product or service name\n- Desired tone, if\n\nany\n- Target audience, if any\n- Output format, if any\n## Output Contract\nThe output should be:\n- S"
  },
  {
    "chunkId": "9001345e-1882-4713-9d59-a7d3daf954c1",
    "memoryId": "02101c8c-8d2f-429e-b648-f16cc9ea398c",
    "agentName": "design-agent",
    "ownerAgentName": "design-agent",
    "memoryType": "knowledge_source",
    "scope": "project",
    "sourceType": "knowledge_source",
    "sourceRef": "knowledge-source/example-brand-guide.md",
    "score": 0.547991,
    "allowedAgents": [],
    "linkedSkillNames": [],
    "accessReasons": [
      "scope_allowed",
      "sensitivity_allowed",
      "chunk_agent_match",
      "owner_agent_match",
      "open_global_or_project_scope"
    ],
    "matchReasons": [
      "no_linked_skill_constraint",
      "lexical_overlap",
      "semantic_similarity"
    ],
    "preview": "Knowledge source title: example-brand-guide\nSource reference: knowledge-source/example-brand-guide.md\n# Brand Guide\nGunakan bahasa Indonesia yang santai, jelas, modern, dan cocok untuk WhatsApp marketing.\nCTA harus pende"
  }
]
```

</details>

### 2. ✅ Design ad copy skill knowledge

Status: **PASS**

- Case ID: `design-ad-copy-skill`
- Agent: `design-agent`
- Query: `cara menulis ad copy promosi dengan headline CTA singkat`
- Candidates: 40
- Eligible: 8
- Returned: 8

#### Checks

- ✅ **minimum returned count**: Expected at least 1 result(s), got 8.
- ✅ **expected agent relevance**: Expected at least one result from design-agent or only shared/explicitly allowed cross-agent results.
- ✅ **no private cross-agent leakage**: Expected no private/non-shared result from denied agents: code-agent, qa-agent.
- ✅ **expected memory type**: Expected at least one memoryType from: skill_knowledge, agent_scope, brand_tone, knowledge_source.
- ✅ **expected source type**: Expected at least one sourceType from: skill, seed, knowledge_source.
- ✅ **expected linked skill**: Expected at least one linked skill from: generate_ad_copy.
- ✅ **access reasons present**: Every returned result should include accessReasons for auditability.
- ✅ **valid retrieval scores**: Every returned result should include a numeric score.

<details>
<summary>Top results evidence</summary>

```json
[
  {
    "chunkId": "7137c09b-f7a1-4f28-a599-5a7af366fc3a",
    "memoryId": "d72eb8de-5777-441c-915d-f96e51e3669f",
    "agentName": "design-agent",
    "ownerAgentName": "design-agent",
    "memoryType": "skill_knowledge",
    "scope": "skill",
    "sourceType": "skill",
    "sourceRef": "skill/53736c54-feb0-4764-8988-5293527751da",
    "score": 0.557213,
    "allowedAgents": [
      "design-agent"
    ],
    "linkedSkillNames": [
      "generate_ad_copy"
    ],
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
    ],
    "preview": "Skill name: generate_ad_copy\nAssigned agent: design-agent\nSkill description: Creates short promotional copy, ad copy, product messaging, captions, headlines, slogans, and campaign wording.\nSkill file path: skills/design-"
  },
  {
    "chunkId": "ff48b76b-2550-4ac6-9543-96181c9a3993",
    "memoryId": "d72eb8de-5777-441c-915d-f96e51e3669f",
    "agentName": "design-agent",
    "ownerAgentName": "design-agent",
    "memoryType": "skill_knowledge",
    "scope": "skill",
    "sourceType": "skill",
    "sourceRef": "skill/53736c54-feb0-4764-8988-5293527751da",
    "score": 0.458897,
    "allowedAgents": [
      "design-agent"
    ],
    "linkedSkillNames": [
      "generate_ad_copy"
    ],
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
    ],
    "preview": "t 5 opsi CTA untuk landing page\"\n## Input Contract\nThe user should provide:\n- Product or service name\n- Desired tone, if\n\nany\n- Target audience, if any\n- Output format, if any\n## Output Contract\nThe output should be:\n- S"
  },
  {
    "chunkId": "0a5d13c2-d963-40be-8c14-fb722885a043",
    "memoryId": "24ef5ceb-597b-4405-9b76-5ad8bc0e009a",
    "agentName": "design-agent",
    "ownerAgentName": "design-agent",
    "memoryType": "agent_scope",
    "scope": "agent",
    "sourceType": "seed",
    "sourceRef": "memory-foundation/design-agent-agent-scope",
    "score": 0.387506,
    "allowedAgents": [
      "design-agent"
    ],
    "linkedSkillNames": [
      "generate_ad_copy",
      "brand_message",
      "social_caption"
    ],
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
    ],
    "preview": "design-agent focuses on copywriting, captions, promotional copy, branding, slogans, headlines, CTA copy, and campaign wording. design-agent should not handle coding, debugging, database tasks, or image generation."
  },
  {
    "chunkId": "52634a40-be60-481d-b70c-f5baaeb26370",
    "memoryId": "e7f29020-e64e-4b50-97a9-fa07c99f22c9",
    "agentName": "design-agent",
    "ownerAgentName": "design-agent",
    "memoryType": "knowledge_source",
    "scope": "skill",
    "sourceType": "knowledge_source",
    "sourceRef": "knowledge-source/manual/whatsapp-campaign-style-guide",
    "score": 0.333771,
    "allowedAgents": [
      "design-agent",
      "writer-agent"
    ],
    "linkedSkillNames": [
      "generate_ad_copy",
      "social_caption"
    ],
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
    ],
    "preview": "Knowledge source title: WhatsApp Campaign Style Guide\nSource reference: knowledge-source/manual/whatsapp-campaign-style-guide\nGunakan bahasa santai, ringkas, jelas, mobile-friendly, dan CTA natural untuk campaign WhatsAp"
  },
  {
    "chunkId": "c9bd189a-61ed-4c74-94d4-86b533770c56",
    "memoryId": "85941b03-0567-4b4d-8f5b-b69f45393af5",
    "agentName": "design-agent",
    "ownerAgentName": "design-agent",
    "memoryType": "knowledge_source",
    "scope": "skill",
    "sourceType": "knowledge_source",
    "sourceRef": "knowledge-source/manual/brand-guide-kopi-susu",
    "score": 0.315266,
    "allowedAgents": [
      "design-agent",
      "writer-agent"
    ],
    "linkedSkillNames": [
      "generate_ad_copy",
      "social_caption"
    ],
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
    ],
    "preview": "Knowledge source title: Brand Guide Kopi Susu\nSource reference: knowledge-source/manual/brand-guide-kopi-susu\nGunakan tone santai, ramah, modern, dan cocok untuk WhatsApp marketing. CTA harus pendek dan natural."
  }
]
```

</details>

### 3. ✅ Design social caption retrieval

Status: **PASS**

- Case ID: `design-caption-social`
- Agent: `design-agent`
- Query: `caption promosi kopi susu gaya santai untuk media sosial`
- Candidates: 40
- Eligible: 10
- Returned: 8

#### Checks

- ✅ **minimum returned count**: Expected at least 1 result(s), got 8.
- ✅ **expected agent relevance**: Expected at least one result from design-agent or only shared/explicitly allowed cross-agent results.
- ✅ **no private cross-agent leakage**: Expected no private/non-shared result from denied agents: code-agent, qa-agent.
- ✅ **expected memory type**: Expected at least one memoryType from: agent_scope, brand_tone, skill_knowledge, knowledge_source.
- ✅ **expected source type**: Expected at least one sourceType from: seed, skill, knowledge_source.
- ✅ **expected linked skill**: Expected at least one linked skill from: social_caption, generate_ad_copy.
- ✅ **access reasons present**: Every returned result should include accessReasons for auditability.
- ✅ **valid retrieval scores**: Every returned result should include a numeric score.

<details>
<summary>Top results evidence</summary>

```json
[
  {
    "chunkId": "7137c09b-f7a1-4f28-a599-5a7af366fc3a",
    "memoryId": "d72eb8de-5777-441c-915d-f96e51e3669f",
    "agentName": "design-agent",
    "ownerAgentName": "design-agent",
    "memoryType": "skill_knowledge",
    "scope": "skill",
    "sourceType": "skill",
    "sourceRef": "skill/53736c54-feb0-4764-8988-5293527751da",
    "score": 0.577024,
    "allowedAgents": [
      "design-agent"
    ],
    "linkedSkillNames": [
      "generate_ad_copy"
    ],
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
    ],
    "preview": "Skill name: generate_ad_copy\nAssigned agent: design-agent\nSkill description: Creates short promotional copy, ad copy, product messaging, captions, headlines, slogans, and campaign wording.\nSkill file path: skills/design-"
  },
  {
    "chunkId": "c9bd189a-61ed-4c74-94d4-86b533770c56",
    "memoryId": "85941b03-0567-4b4d-8f5b-b69f45393af5",
    "agentName": "design-agent",
    "ownerAgentName": "design-agent",
    "memoryType": "knowledge_source",
    "scope": "skill",
    "sourceType": "knowledge_source",
    "sourceRef": "knowledge-source/manual/brand-guide-kopi-susu",
    "score": 0.495657,
    "allowedAgents": [
      "design-agent",
      "writer-agent"
    ],
    "linkedSkillNames": [
      "generate_ad_copy",
      "social_caption"
    ],
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
    ],
    "preview": "Knowledge source title: Brand Guide Kopi Susu\nSource reference: knowledge-source/manual/brand-guide-kopi-susu\nGunakan tone santai, ramah, modern, dan cocok untuk WhatsApp marketing. CTA harus pendek dan natural."
  },
  {
    "chunkId": "82e85b2a-1dca-4c53-833d-3bb3cd7cff02",
    "memoryId": "f0055c60-93ff-42ec-8d4a-b8ea5f139200",
    "agentName": "design-agent",
    "ownerAgentName": "design-agent",
    "memoryType": "skill_knowledge",
    "scope": "skill",
    "sourceType": "skill",
    "sourceRef": "skill/9d8a2625-87d6-4fc3-82eb-dbec9edd20b0",
    "score": 0.462171,
    "allowedAgents": [
      "design-agent"
    ],
    "linkedSkillNames": [
      "social_caption"
    ],
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
    ],
    "preview": "Skill name: social_caption\nAssigned agent: design-agent\nSkill description: Creates social media captions and short content ideas for Instagram, TikTok, WhatsApp broadcast, and marketing posts.\nSkill file path: skills/des"
  },
  {
    "chunkId": "0fa696c9-98ad-4737-94f0-f3454eaf2a1c",
    "memoryId": "7b12b63e-a5df-4d21-8908-e3cc922eff1d",
    "agentName": "design-agent",
    "ownerAgentName": "design-agent",
    "memoryType": "knowledge_source",
    "scope": "project",
    "sourceType": "knowledge_source",
    "sourceRef": "knowledge-source/manual/brand-guide",
    "score": 0.409022,
    "allowedAgents": [],
    "linkedSkillNames": [],
    "accessReasons": [
      "scope_allowed",
      "sensitivity_allowed",
      "chunk_agent_match",
      "owner_agent_match",
      "open_global_or_project_scope"
    ],
    "matchReasons": [
      "no_linked_skill_constraint",
      "lexical_overlap",
      "semantic_similarity"
    ],
    "preview": "Knowledge source title: Brand Guide\nSource reference: knowledge-source/manual/brand-guide\nTitle:\nBrand Guide WhatsApp\nContent:\nGunakan bahasa yang santai, ringkas, jelas, dan cocok untuk WhatsApp marketing. CTA harus nat"
  },
  {
    "chunkId": "9001345e-1882-4713-9d59-a7d3daf954c1",
    "memoryId": "02101c8c-8d2f-429e-b648-f16cc9ea398c",
    "agentName": "design-agent",
    "ownerAgentName": "design-agent",
    "memoryType": "knowledge_source",
    "scope": "project",
    "sourceType": "knowledge_source",
    "sourceRef": "knowledge-source/example-brand-guide.md",
    "score": 0.398765,
    "allowedAgents": [],
    "linkedSkillNames": [],
    "accessReasons": [
      "scope_allowed",
      "sensitivity_allowed",
      "chunk_agent_match",
      "owner_agent_match",
      "open_global_or_project_scope"
    ],
    "matchReasons": [
      "no_linked_skill_constraint",
      "lexical_overlap",
      "semantic_similarity"
    ],
    "preview": "Knowledge source title: example-brand-guide\nSource reference: knowledge-source/example-brand-guide.md\n# Brand Guide\nGunakan bahasa Indonesia yang santai, jelas, modern, dan cocok untuk WhatsApp marketing.\nCTA harus pende"
  }
]
```

</details>

### 4. ✅ Code Prisma backend debugging

Status: **PASS**

- Case ID: `code-prisma-debug`
- Agent: `code-agent`
- Query: `debug prisma typescript migration backend error`
- Candidates: 40
- Eligible: 9
- Returned: 8

#### Checks

- ✅ **minimum returned count**: Expected at least 1 result(s), got 8.
- ✅ **expected agent relevance**: Expected at least one result from code-agent or only shared/explicitly allowed cross-agent results.
- ✅ **no private cross-agent leakage**: Expected no private/non-shared result from denied agents: design-agent, image-agent.
- ✅ **expected memory type**: Expected at least one memoryType from: agent_scope, project_context, skill_knowledge, knowledge_source.
- ✅ **expected source type**: Expected at least one sourceType from: seed, skill, knowledge_source.
- ✅ **access reasons present**: Every returned result should include accessReasons for auditability.
- ✅ **valid retrieval scores**: Every returned result should include a numeric score.

<details>
<summary>Top results evidence</summary>

```json
[
  {
    "chunkId": "40eee750-0c25-4b03-aa75-60c392fd9f50",
    "memoryId": "4d1a500a-ea25-4fe1-9ca7-0061ad31100f",
    "agentName": "code-agent",
    "ownerAgentName": "code-agent",
    "memoryType": "skill_knowledge",
    "scope": "skill",
    "sourceType": "skill",
    "sourceRef": "skill/45b1f7b1-ecbe-42a8-96b5-9b551a7e1fd4",
    "score": 0.537602,
    "allowedAgents": [
      "code-agent"
    ],
    "linkedSkillNames": [
      "technical_debugging"
    ],
    "accessReasons": [
      "scope_allowed",
      "sensitivity_allowed",
      "chunk_agent_match",
      "owner_agent_match",
      "allowed_agent_match"
    ],
    "matchReasons": [
      "no_matched_skill_filter",
      "lexical_overlap",
      "semantic_similarity"
    ],
    "preview": "Skill name: technical_debugging\nAssigned agent: code-agent\nSkill description: Investigates software errors, TypeScript issues, backend problems, Prisma problems, API issues, and runtime failures.\nSkill file path: skills/"
  },
  {
    "chunkId": "4882fff9-1fff-491c-8d08-983a1dcec571",
    "memoryId": "10f9a407-ea99-4231-9456-bb7309fa3dd9",
    "agentName": "code-agent",
    "ownerAgentName": "code-agent",
    "memoryType": "project_context",
    "scope": "project",
    "sourceType": "seed",
    "sourceRef": "memory-foundation/project-context",
    "score": 0.437792,
    "allowedAgents": [
      "code-agent",
      "research-agent",
      "qa-agent"
    ],
    "linkedSkillNames": [
      "technical_debugging",
      "implementation_planning",
      "source_research_summary",
      "qa_test_plan",
      "regression_checklist"
    ],
    "accessReasons": [
      "scope_allowed",
      "sensitivity_allowed",
      "chunk_agent_match",
      "owner_agent_match",
      "allowed_agent_match"
    ],
    "matchReasons": [
      "no_matched_skill_filter",
      "lexical_overlap",
      "semantic_similarity"
    ],
    "preview": "The Personal Multi-Agent System is a local-first AI agent platform with Express backend, Prisma SQLite database, React/Vite dashboard, Socket.io realtime events, WhatsApp runtime integration, dynamic LLM provider registr"
  },
  {
    "chunkId": "15282c5d-97d2-46b6-a986-5468960c9b56",
    "memoryId": "b009d281-e9e0-4715-9041-67a07623fd0a",
    "agentName": "code-agent",
    "ownerAgentName": "code-agent",
    "memoryType": "agent_scope",
    "scope": "agent",
    "sourceType": "seed",
    "sourceRef": "memory-foundation/code-agent-agent-scope",
    "score": 0.412813,
    "allowedAgents": [
      "code-agent"
    ],
    "linkedSkillNames": [
      "technical_debugging",
      "implementation_planning"
    ],
    "accessReasons": [
      "scope_allowed",
      "sensitivity_allowed",
      "chunk_agent_match",
      "owner_agent_match",
      "allowed_agent_match"
    ],
    "matchReasons": [
      "no_matched_skill_filter",
      "lexical_overlap",
      "semantic_similarity"
    ],
    "preview": "code-agent focuses on TypeScript, Node.js, Express, Prisma, React, Vite, API routes, debugging, implementation planning, refactoring, and technical architecture."
  },
  {
    "chunkId": "6809bd30-3af3-4718-94f3-e47b6ca64389",
    "memoryId": "4d1a500a-ea25-4fe1-9ca7-0061ad31100f",
    "agentName": "code-agent",
    "ownerAgentName": "code-agent",
    "memoryType": "skill_knowledge",
    "scope": "skill",
    "sourceType": "skill",
    "sourceRef": "skill/45b1f7b1-ecbe-42a8-96b5-9b551a7e1fd4",
    "score": 0.401479,
    "allowedAgents": [
      "code-agent"
    ],
    "linkedSkillNames": [
      "technical_debugging"
    ],
    "accessReasons": [
      "scope_allowed",
      "sensitivity_allowed",
      "chunk_agent_match",
      "owner_agent_match",
      "allowed_agent_match"
    ],
    "matchReasons": [
      "no_matched_skill_filter",
      "lexical_overlap",
      "semantic_similarity"
    ],
    "preview": "r message\n- Related file path\n- Current code snippet\n- Expected behavior\n## Output Contract\nThe output should include:\n-\n\nRoot cause\n- Step-by-step fix\n- Full code when requested\n- Safety notes if needed\n## Boundary Note"
  },
  {
    "chunkId": "c7c02cdc-0f6a-4be8-b491-9cb903e65406",
    "memoryId": "b05ae233-1754-459f-8fe2-4da8ad6bfd96",
    "agentName": "code-agent",
    "ownerAgentName": "code-agent",
    "memoryType": "skill_knowledge",
    "scope": "skill",
    "sourceType": "skill",
    "sourceRef": "skill/dbfec721-3ffb-4a8f-b5f0-dd20a5941364",
    "score": 0.290839,
    "allowedAgents": [
      "code-agent"
    ],
    "linkedSkillNames": [
      "implementation_planning"
    ],
    "accessReasons": [
      "scope_allowed",
      "sensitivity_allowed",
      "chunk_agent_match",
      "owner_agent_match",
      "allowed_agent_match"
    ],
    "matchReasons": [
      "no_matched_skill_filter",
      "lexical_overlap",
      "semantic_similarity"
    ],
    "preview": "Skill name: implementation_planning\nAssigned agent: code-agent\nSkill description: Plans implementation steps, file changes, architecture decisions, and refactoring strategy.\nSkill file path: skills/code-agent/implementat"
  }
]
```

</details>

### 5. ✅ QA regression policy retrieval

Status: **PASS**

- Case ID: `qa-regression-policy`
- Agent: `qa-agent`
- Query: `jalankan regression QA sweep dan pastikan failed warning nol`
- Candidates: 40
- Eligible: 10
- Returned: 8

#### Checks

- ✅ **minimum returned count**: Expected at least 1 result(s), got 8.
- ✅ **expected agent relevance**: Expected at least one result from qa-agent or only shared/explicitly allowed cross-agent results.
- ✅ **no private cross-agent leakage**: Expected no private/non-shared result from denied agents: design-agent, image-agent.
- ✅ **expected memory type**: Expected at least one memoryType from: regression_policy, agent_scope, skill_knowledge, knowledge_source.
- ✅ **expected source type**: Expected at least one sourceType from: seed, skill, knowledge_source.
- ✅ **access reasons present**: Every returned result should include accessReasons for auditability.
- ✅ **valid retrieval scores**: Every returned result should include a numeric score.

<details>
<summary>Top results evidence</summary>

```json
[
  {
    "chunkId": "344db6f4-0a7d-4100-af05-797516b107c9",
    "memoryId": "4d17958c-603f-43af-a9aa-a31556de4921",
    "agentName": "qa-agent",
    "ownerAgentName": "qa-agent",
    "memoryType": "skill_knowledge",
    "scope": "skill",
    "sourceType": "skill",
    "sourceRef": "skill/7d35cd89-1fed-438f-9f55-2f4771e9b13b",
    "score": 0.600556,
    "allowedAgents": [
      "qa-agent"
    ],
    "linkedSkillNames": [
      "regression_checklist"
    ],
    "accessReasons": [
      "scope_allowed",
      "sensitivity_allowed",
      "chunk_agent_match",
      "owner_agent_match",
      "allowed_agent_match"
    ],
    "matchReasons": [
      "no_matched_skill_filter",
      "lexical_overlap",
      "semantic_similarity"
    ],
    "preview": "Skill name: regression_checklist\nAssigned agent: qa-agent\nSkill description: Creates regression checklist to ensure existing stable flows do not break after changes.\nSkill file path: skills/qa-agent/regression_checklist."
  },
  {
    "chunkId": "e3627a2c-0e0b-495c-a1af-1606b0bdee4e",
    "memoryId": "4d17958c-603f-43af-a9aa-a31556de4921",
    "agentName": "qa-agent",
    "ownerAgentName": "qa-agent",
    "memoryType": "skill_knowledge",
    "scope": "skill",
    "sourceType": "skill",
    "sourceRef": "skill/7d35cd89-1fed-438f-9f55-2f4771e9b13b",
    "score": 0.508426,
    "allowedAgents": [
      "qa-agent"
    ],
    "linkedSkillNames": [
      "regression_checklist"
    ],
    "accessReasons": [
      "scope_allowed",
      "sensitivity_allowed",
      "chunk_agent_match",
      "owner_agent_match",
      "allowed_agent_match"
    ],
    "matchReasons": [
      "no_matched_skill_filter",
      "lexical_overlap",
      "semantic_similarity"
    ],
    "preview": "Boundary Notes\nThis skill does not replace code-agent for debugging implementation errors.\n## Future RAG Use\nThis skill\n\ncan retrieve previous QA reports, passed/failed test history, and stable flow documentation."
  },
  {
    "chunkId": "e78bc8c2-2927-4a79-892a-6c1230cdda8c",
    "memoryId": "83855e9d-c77c-4d7b-b1c4-e39c4656bedb",
    "agentName": "qa-agent",
    "ownerAgentName": "qa-agent",
    "memoryType": "skill_knowledge",
    "scope": "skill",
    "sourceType": "skill",
    "sourceRef": "skill/d13b80b6-3545-4804-bbfe-35cca7d55dbf",
    "score": 0.500884,
    "allowedAgents": [
      "qa-agent"
    ],
    "linkedSkillNames": [
      "qa_test_plan"
    ],
    "accessReasons": [
      "scope_allowed",
      "sensitivity_allowed",
      "chunk_agent_match",
      "owner_agent_match",
      "allowed_agent_match"
    ],
    "matchReasons": [
      "no_matched_skill_filter",
      "lexical_overlap",
      "semantic_similarity"
    ],
    "preview": "clude:\n- Test cases\n- Expected results\n- Edge cases\n- Regression notes\n## Boundary Notes\nThis skill plans and validates.\n\nIt does not implement features directly.\n## Future RAG Use\nThis skill can retrieve previous QA rep"
  },
  {
    "chunkId": "1d792634-e075-4e56-8829-ea60a91d5f84",
    "memoryId": "83855e9d-c77c-4d7b-b1c4-e39c4656bedb",
    "agentName": "qa-agent",
    "ownerAgentName": "qa-agent",
    "memoryType": "skill_knowledge",
    "scope": "skill",
    "sourceType": "skill",
    "sourceRef": "skill/d13b80b6-3545-4804-bbfe-35cca7d55dbf",
    "score": 0.484555,
    "allowedAgents": [
      "qa-agent"
    ],
    "linkedSkillNames": [
      "qa_test_plan"
    ],
    "accessReasons": [
      "scope_allowed",
      "sensitivity_allowed",
      "chunk_agent_match",
      "owner_agent_match",
      "allowed_agent_match"
    ],
    "matchReasons": [
      "no_matched_skill_filter",
      "lexical_overlap",
      "semantic_similarity"
    ],
    "preview": "Skill name: qa_test_plan\nAssigned agent: qa-agent\nSkill description: Creates QA test plans, validation scenarios, acceptance criteria, and manual test steps.\nSkill file path: skills/qa-agent/qa_test_plan.md\nSkill content"
  },
  {
    "chunkId": "8f1303a1-4e27-41c9-939b-633b59fd9814",
    "memoryId": "af0ec2e2-aef9-47fc-9dd1-0c36c4361de0",
    "agentName": "qa-agent",
    "ownerAgentName": "qa-agent",
    "memoryType": "agent_scope",
    "scope": "agent",
    "sourceType": "seed",
    "sourceRef": "memory-foundation/qa-agent-agent-scope",
    "score": 0.442446,
    "allowedAgents": [
      "qa-agent"
    ],
    "linkedSkillNames": [
      "qa_test_plan",
      "regression_checklist"
    ],
    "accessReasons": [
      "scope_allowed",
      "sensitivity_allowed",
      "chunk_agent_match",
      "owner_agent_match",
      "allowed_agent_match"
    ],
    "matchReasons": [
      "no_matched_skill_filter",
      "lexical_overlap",
      "semantic_similarity"
    ],
    "preview": "qa-agent focuses on QA checklist, regression testing, smoke testing, acceptance criteria, validation, test scenarios, and bug reproduction steps."
  }
]
```

</details>

### 6. ✅ Research agent retrieval

Status: **PASS**

- Case ID: `research-agent-scope`
- Agent: `research-agent`
- Query: `ringkas hasil riset dan susun insight yang jelas`
- Candidates: 40
- Eligible: 8
- Returned: 8

#### Checks

- ✅ **minimum returned count**: Expected at least 1 result(s), got 8.
- ✅ **expected agent relevance**: Expected at least one result from research-agent or only shared/explicitly allowed cross-agent results.
- ✅ **no private cross-agent leakage**: Expected no private/non-shared result from denied agents: design-agent, code-agent.
- ✅ **expected memory type**: Expected at least one memoryType from: agent_scope, skill_knowledge, knowledge_source, project_context.
- ✅ **expected source type**: Expected at least one sourceType from: seed, skill, knowledge_source.
- ✅ **access reasons present**: Every returned result should include accessReasons for auditability.
- ✅ **valid retrieval scores**: Every returned result should include a numeric score.

<details>
<summary>Top results evidence</summary>

```json
[
  {
    "chunkId": "ed14076f-0121-4bc6-a125-f1c9f51cb3ab",
    "memoryId": "68a29b7e-9d76-421d-a912-7869a014c4f0",
    "agentName": "research-agent",
    "ownerAgentName": "research-agent",
    "memoryType": "skill_knowledge",
    "scope": "skill",
    "sourceType": "skill",
    "sourceRef": "skill/0aa63c49-c605-444f-82b3-dfbc1f401af4",
    "score": 0.37158,
    "allowedAgents": [
      "research-agent"
    ],
    "linkedSkillNames": [
      "source_research_summary"
    ],
    "accessReasons": [
      "scope_allowed",
      "sensitivity_allowed",
      "chunk_agent_match",
      "owner_agent_match",
      "allowed_agent_match"
    ],
    "matchReasons": [
      "no_matched_skill_filter",
      "lexical_overlap",
      "semantic_similarity"
    ],
    "preview": "Skill name: source_research_summary\nAssigned agent: research-agent\nSkill description: Gathers, compares, and summarizes information into structured findings.\nSkill file path: skills/research-agent/source_research_summary"
  },
  {
    "chunkId": "b45a729d-5d31-4a5e-ad92-ecb5bb134cd1",
    "memoryId": "cdecfe6b-ff48-4c4a-9263-cd72ecff573a",
    "agentName": "research-agent",
    "ownerAgentName": "research-agent",
    "memoryType": "skill_knowledge",
    "scope": "skill",
    "sourceType": "skill",
    "sourceRef": "skill/bf7da94b-b9b4-4d11-bf47-d84c724398f9",
    "score": 0.358715,
    "allowedAgents": [
      "research-agent"
    ],
    "linkedSkillNames": [
      "comparison_brief"
    ],
    "accessReasons": [
      "scope_allowed",
      "sensitivity_allowed",
      "chunk_agent_match",
      "owner_agent_match",
      "allowed_agent_match"
    ],
    "matchReasons": [
      "no_matched_skill_filter",
      "semantic_similarity"
    ],
    "preview": "Skill name: comparison_brief\nAssigned agent: research-agent\nSkill description: Creates comparison briefs, pros/cons, tradeoff analysis, and decision support notes.\nSkill file path: skills/research-agent/comparison_brief."
  },
  {
    "chunkId": "f44c6ead-6c79-4239-9541-0bc83ca3b520",
    "memoryId": "68a29b7e-9d76-421d-a912-7869a014c4f0",
    "agentName": "research-agent",
    "ownerAgentName": "research-agent",
    "memoryType": "skill_knowledge",
    "scope": "skill",
    "sourceType": "skill",
    "sourceRef": "skill/0aa63c49-c605-444f-82b3-dfbc1f401af4",
    "score": 0.286075,
    "allowedAgents": [
      "research-agent"
    ],
    "linkedSkillNames": [
      "source_research_summary"
    ],
    "accessReasons": [
      "scope_allowed",
      "sensitivity_allowed",
      "chunk_agent_match",
      "owner_agent_match",
      "allowed_agent_match"
    ],
    "matchReasons": [
      "no_matched_skill_filter",
      "semantic_similarity"
    ],
    "preview": "ndations\n- Sources if web research is used\n## Boundary Notes\nThis skill should not implement code directly unless paired\n\nwith code-agent.\n## Future RAG Use\nThis skill can retrieve saved research notes, source summaries,"
  },
  {
    "chunkId": "0fa696c9-98ad-4737-94f0-f3454eaf2a1c",
    "memoryId": "7b12b63e-a5df-4d21-8908-e3cc922eff1d",
    "agentName": "design-agent",
    "ownerAgentName": "design-agent",
    "memoryType": "knowledge_source",
    "scope": "project",
    "sourceType": "knowledge_source",
    "sourceRef": "knowledge-source/manual/brand-guide",
    "score": 0.265399,
    "allowedAgents": [],
    "linkedSkillNames": [],
    "accessReasons": [
      "scope_allowed",
      "sensitivity_allowed",
      "open_global_or_project_scope"
    ],
    "matchReasons": [
      "no_linked_skill_constraint",
      "no_matched_skill_filter",
      "lexical_overlap",
      "semantic_similarity"
    ],
    "preview": "Knowledge source title: Brand Guide\nSource reference: knowledge-source/manual/brand-guide\nTitle:\nBrand Guide WhatsApp\nContent:\nGunakan bahasa yang santai, ringkas, jelas, dan cocok untuk WhatsApp marketing. CTA harus nat"
  },
  {
    "chunkId": "f0745275-aec1-40d7-85a7-8c07595bd395",
    "memoryId": "4237fd03-04e2-439f-9ac9-894e1da469c3",
    "agentName": "research-agent",
    "ownerAgentName": "research-agent",
    "memoryType": "agent_scope",
    "scope": "agent",
    "sourceType": "seed",
    "sourceRef": "memory-foundation/research-agent-agent-scope",
    "score": 0.253874,
    "allowedAgents": [
      "research-agent"
    ],
    "linkedSkillNames": [
      "source_research_summary",
      "comparison_brief"
    ],
    "accessReasons": [
      "scope_allowed",
      "sensitivity_allowed",
      "chunk_agent_match",
      "owner_agent_match",
      "allowed_agent_match"
    ],
    "matchReasons": [
      "no_matched_skill_filter",
      "semantic_similarity"
    ],
    "preview": "research-agent focuses on source gathering, comparison, trend analysis, technical research, structured findings, and decision support. research-agent should not directly implement code unless paired with code-agent."
  }
]
```

</details>

### 7. ✅ Project context RAG runtime retrieval

Status: **PASS**

- Case ID: `project-context-rag-runtime`
- Agent: `code-agent`
- Query: `runtime rag manual widget whatsapp memory vault semantic retrieval`
- Candidates: 40
- Eligible: 9
- Returned: 8

#### Checks

- ✅ **minimum returned count**: Expected at least 1 result(s), got 8.
- ✅ **expected agent relevance**: Expected at least one result from code-agent or only shared/explicitly allowed cross-agent results.
- ✅ **no private cross-agent leakage**: Expected no private/non-shared result from denied agents: design-agent, image-agent.
- ✅ **expected memory type**: Expected at least one memoryType from: project_context, agent_scope, knowledge_source, skill_knowledge.
- ✅ **expected source type**: Expected at least one sourceType from: seed, knowledge_source, skill.
- ✅ **access reasons present**: Every returned result should include accessReasons for auditability.
- ✅ **valid retrieval scores**: Every returned result should include a numeric score.

<details>
<summary>Top results evidence</summary>

```json
[
  {
    "chunkId": "df8de7fe-325b-49ac-b472-f8c873170980",
    "memoryId": "80ea6695-8ec7-4489-a6d8-ca08b80d1440",
    "agentName": "qa-agent",
    "ownerAgentName": "qa-agent",
    "memoryType": "regression_policy",
    "scope": "project",
    "sourceType": "seed",
    "sourceRef": "memory-foundation/regression-policy",
    "score": 0.500329,
    "allowedAgents": [
      "qa-agent",
      "code-agent"
    ],
    "linkedSkillNames": [
      "qa_test_plan",
      "regression_checklist",
      "implementation_planning"
    ],
    "accessReasons": [
      "scope_allowed",
      "sensitivity_allowed",
      "allowed_agent_match"
    ],
    "matchReasons": [
      "no_matched_skill_filter",
      "lexical_overlap",
      "semantic_similarity"
    ],
    "preview": "When adding or modifying features, stable flows must be protected: Overview, Agent Office, Settings, provider registry, runtime adapter, Widget, WhatsApp, governance guard, Skills page, and Memory Vault should not regres"
  },
  {
    "chunkId": "15282c5d-97d2-46b6-a986-5468960c9b56",
    "memoryId": "b009d281-e9e0-4715-9041-67a07623fd0a",
    "agentName": "code-agent",
    "ownerAgentName": "code-agent",
    "memoryType": "agent_scope",
    "scope": "agent",
    "sourceType": "seed",
    "sourceRef": "memory-foundation/code-agent-agent-scope",
    "score": 0.488666,
    "allowedAgents": [
      "code-agent"
    ],
    "linkedSkillNames": [
      "technical_debugging",
      "implementation_planning"
    ],
    "accessReasons": [
      "scope_allowed",
      "sensitivity_allowed",
      "chunk_agent_match",
      "owner_agent_match",
      "allowed_agent_match"
    ],
    "matchReasons": [
      "no_matched_skill_filter",
      "semantic_similarity"
    ],
    "preview": "code-agent focuses on TypeScript, Node.js, Express, Prisma, React, Vite, API routes, debugging, implementation planning, refactoring, and technical architecture."
  },
  {
    "chunkId": "4882fff9-1fff-491c-8d08-983a1dcec571",
    "memoryId": "10f9a407-ea99-4231-9456-bb7309fa3dd9",
    "agentName": "code-agent",
    "ownerAgentName": "code-agent",
    "memoryType": "project_context",
    "scope": "project",
    "sourceType": "seed",
    "sourceRef": "memory-foundation/project-context",
    "score": 0.438537,
    "allowedAgents": [
      "code-agent",
      "research-agent",
      "qa-agent"
    ],
    "linkedSkillNames": [
      "technical_debugging",
      "implementation_planning",
      "source_research_summary",
      "qa_test_plan",
      "regression_checklist"
    ],
    "accessReasons": [
      "scope_allowed",
      "sensitivity_allowed",
      "chunk_agent_match",
      "owner_agent_match",
      "allowed_agent_match"
    ],
    "matchReasons": [
      "no_matched_skill_filter",
      "lexical_overlap",
      "semantic_similarity"
    ],
    "preview": "The Personal Multi-Agent System is a local-first AI agent platform with Express backend, Prisma SQLite database, React/Vite dashboard, Socket.io realtime events, WhatsApp runtime integration, dynamic LLM provider registr"
  },
  {
    "chunkId": "c7c02cdc-0f6a-4be8-b491-9cb903e65406",
    "memoryId": "b05ae233-1754-459f-8fe2-4da8ad6bfd96",
    "agentName": "code-agent",
    "ownerAgentName": "code-agent",
    "memoryType": "skill_knowledge",
    "scope": "skill",
    "sourceType": "skill",
    "sourceRef": "skill/dbfec721-3ffb-4a8f-b5f0-dd20a5941364",
    "score": 0.414663,
    "allowedAgents": [
      "code-agent"
    ],
    "linkedSkillNames": [
      "implementation_planning"
    ],
    "accessReasons": [
      "scope_allowed",
      "sensitivity_allowed",
      "chunk_agent_match",
      "owner_agent_match",
      "allowed_agent_match"
    ],
    "matchReasons": [
      "no_matched_skill_filter",
      "lexical_overlap",
      "semantic_similarity"
    ],
    "preview": "Skill name: implementation_planning\nAssigned agent: code-agent\nSkill description: Plans implementation steps, file changes, architecture decisions, and refactoring strategy.\nSkill file path: skills/code-agent/implementat"
  },
  {
    "chunkId": "9001345e-1882-4713-9d59-a7d3daf954c1",
    "memoryId": "02101c8c-8d2f-429e-b648-f16cc9ea398c",
    "agentName": "design-agent",
    "ownerAgentName": "design-agent",
    "memoryType": "knowledge_source",
    "scope": "project",
    "sourceType": "knowledge_source",
    "sourceRef": "knowledge-source/example-brand-guide.md",
    "score": 0.379518,
    "allowedAgents": [],
    "linkedSkillNames": [],
    "accessReasons": [
      "scope_allowed",
      "sensitivity_allowed",
      "open_global_or_project_scope"
    ],
    "matchReasons": [
      "no_linked_skill_constraint",
      "no_matched_skill_filter",
      "lexical_overlap",
      "semantic_similarity"
    ],
    "preview": "Knowledge source title: example-brand-guide\nSource reference: knowledge-source/example-brand-guide.md\n# Brand Guide\nGunakan bahasa Indonesia yang santai, jelas, modern, dan cocok untuk WhatsApp marketing.\nCTA harus pende"
  }
]
```

</details>

## Final Status

✅ Retrieval evaluation completed without failed cases.
