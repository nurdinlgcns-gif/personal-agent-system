import { routeTask } from "../../orchestrator";
import {
  checkRateLimit,
  isAuthorized,
  normalizeWaNumber,
} from "../../orchestrator/security";
import { env } from "../../config/env";
import { logger } from "../../utils/logger";
import { runLlmCompletion } from "../llm/llmClient";
import {
  storeGovernanceBlockedTask,
  storeLatestTaskRuntimeResult,
} from "../llm/taskRuntimeMetadataService";
import {
  ensureWhatsAppSendableText,
  formatWhatsAppBoundaryReply,
  formatWhatsAppRuntimeReply,
} from "./whatsappRuntimeGuardrails";
import { checkAgentCapabilityDynamic } from "../agents/agentCapabilityGuard";
import { resolveRuntimeMemoriesForAgent } from "../memory/memoryRuntimeScopeResolver";
import { buildRuntimeMemoryContextBlock } from "../memory/runtimeMemoryContextFormatter";
import { buildRuntimeRagContextBlock } from "../memory/runtimeRagContextFormatter";
import { searchSemanticMemoryChunks } from "../embeddings/semanticMemorySearchService";
import {
  buildRuntimeRagQuery,
  getRuntimeRagQualityConfig,
} from "../memory/runtimeRagQualityTuning";

type WhatsAppHandleResult = {
  shouldReply: boolean;
  chatId?: string;
  text?: string;
};

function extractText(msg: any): string {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    ""
  ).trim();
}

function getChatId(msg: any): string {
  return msg.key.remoteJid || "";
}

function getSenderJid(msg: any): string {
  return msg.key.participant || msg.key.remoteJid || "";
}

function isStatusBroadcast(msg: any): boolean {
  return msg.key.remoteJid === "status@broadcast";
}

function getMessageId(msg: any): string {
  return msg.key.id || "-";
}

function extractAgentNameFromMessage(message: string) {
  const agentMentionMatch = message.match(/@([\w-]+)/);

  return agentMentionMatch?.[1] || "design-agent";
}

function buildWhatsAppSystemPrompt(input: {
  agentName: string;
  memoryContextBlock?: string;
  ragContextBlock?: string;
}) {
  return [
    `You are ${input.agentName}.`,
    "You are replying to a WhatsApp message.",
    "Answer the user's request directly and clearly.",
    "Keep the response concise, practical, and easy to read on mobile.",
    "Return only the final answer.",
    "Do not expose internal reasoning.",
    "Do not include bullet-point analysis, constraints, self-checks, labels, or hidden planning.",
    "Do not include metadata, runtime details, provider details, model details, governance details, memory details, RAG details, chunk IDs, scores, embeddings, vector search, or source references.",
    "Do not include labels such as Topic, Language, Constraint, Format, Analysis, Reasoning, Final, Output, Answer, Style, Tone, Target audience, Platform, Direct answer, or Content.",
    "Do not mention Memory Vault, retrieval, semantic search, chunks, embeddings, vectors, memory IDs, memory score, sourceRef, runtimeInjectable, or RAG.",
    "Do not include provider limitation messages, conversation limit messages, new topic requests, unresolved placeholders, draft labels, or template placeholders.",
    "Never output unresolved placeholders such as [Link Order/WhatsApp], [CTA], [Product Name], [Nama Produk], or {{variable}}.",
    "If the user asks for a short answer, keep it short.",
    "If the user asks for one sentence, return exactly one sentence and nothing else.",
    "If runtime memory context is provided, use it silently only when it improves relevance.",
    "If runtime RAG context is provided, use it silently only when it improves relevance.",
    "If any context is unrelated to the user's request, ignore that context.",
    "Make sure the final answer is complete and does not stop mid-sentence.",
    input.memoryContextBlock
      ? [
          "",
          "Scoped runtime memory:",
          input.memoryContextBlock,
          "",
          "Important memory handling rules:",
          "1. Use memory only as background context.",
          "2. Do not quote memory metadata.",
          "3. Do not say that memory was retrieved.",
          "4. Do not reveal Memory Vault internals.",
          "5. If memory is unrelated, ignore it.",
          "6. The WhatsApp reply must remain short and user-facing only.",
        ].join("\n")
      : "",
    input.ragContextBlock
      ? [
          "",
          "Scoped runtime RAG context:",
          input.ragContextBlock,
          "",
          "Important RAG handling rules:",
          "1. Use RAG chunks only as background context.",
          "2. Do not mention chunk IDs, scores, embeddings, vector search, retrieval, semantic search, or RAG internals.",
          "3. Do not quote RAG metadata.",
          "4. Do not say that chunks were retrieved.",
          "5. If RAG context is unrelated, ignore it.",
          "6. The WhatsApp reply must remain short and user-facing only.",
        ].join("\n")
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildCapabilityBoundaryResponse(input: {
  agentName: string;
  refusalMessage?: string;
}) {
  return (
    input.refusalMessage ||
    `Maaf, @${input.agentName} belum punya capability yang sesuai untuk request ini. Coba arahkan ke agent yang lebih tepat.`
  );
}

function buildSafeReply(inputText: string, outputText: string) {
  const formattedReply = formatWhatsAppRuntimeReply(inputText, outputText);

  return ensureWhatsAppSendableText(formattedReply, inputText);
}

function buildSafeBoundaryReply(inputText: string, outputText: string) {
  const formattedBoundaryReply = formatWhatsAppBoundaryReply(outputText);

  return ensureWhatsAppSendableText(formattedBoundaryReply, inputText);
}

export async function handleIncomingWhatsAppMessage(
  msg: any
): Promise<WhatsAppHandleResult> {
  if (!msg) {
    return { shouldReply: false };
  }

  if (!msg.message) {
    return { shouldReply: false };
  }

  if (isStatusBroadcast(msg)) {
    logger.wa("Status broadcast ignored");
    return { shouldReply: false };
  }

  const fromMe = Boolean(msg.key.fromMe);
  const messageId = getMessageId(msg);
  const chatId = getChatId(msg);
  const senderJid = getSenderJid(msg);
  const senderNumber = normalizeWaNumber(senderJid);

  if (fromMe && !env.PROCESS_FROM_ME) {
    logger.wa(`Outgoing/self message ignored. Message ID: ${messageId}`);
    return { shouldReply: false };
  }

  const text = extractText(msg);

  logger.wa("Incoming message detected");
  logger.wa(`Message ID: ${messageId}`);
  logger.wa(`Raw remoteJid: ${msg.key.remoteJid || "-"}`);
  logger.wa(`Raw participant: ${msg.key.participant || "-"}`);
  logger.wa(`Sender JID: ${senderJid || "-"}`);
  logger.wa(`Sender normalized: ${senderNumber || "unknown"}`);
  logger.wa(`From me: ${fromMe}`);
  logger.wa(`Text: ${text || "[empty]"}`);

  if (!text) {
    logger.wa("Empty message ignored");
    return { shouldReply: false };
  }

  if (!text.includes("@")) {
    logger.wa("Message ignored, no agent mention found");
    return { shouldReply: false };
  }

  if (!isAuthorized(senderNumber)) {
    logger.security(`Unauthorized WhatsApp access: ${senderNumber}`);

    return {
      shouldReply: true,
      chatId,
      text: "Maaf, nomor ini belum diizinkan menggunakan agent.",
    };
  }

  if (!checkRateLimit(senderNumber)) {
    logger.security(`Rate limit blocked: ${senderNumber}`);

    return {
      shouldReply: true,
      chatId,
      text: "Request terlalu banyak. Coba lagi sebentar.",
    };
  }

  logger.wa("Agent request detected");

  try {
    const agentName = extractAgentNameFromMessage(text);

    const capabilityCheck = await checkAgentCapabilityDynamic({
      agentName,
      inputText: text,
    });

    if (!capabilityCheck.allowed) {
      const boundaryResponse = buildCapabilityBoundaryResponse({
        agentName,
        refusalMessage: capabilityCheck.refusalMessage,
      });

      const finalBoundaryReply = buildSafeBoundaryReply(text, boundaryResponse);

      await storeGovernanceBlockedTask({
        inputText: text,
        agentName,
        source: "whatsapp",
        outputText: finalBoundaryReply,
        capabilityCheck,
      });

      logger.wa(
        `WhatsApp task blocked by capability guard: ${agentName} | ${capabilityCheck.reason}`
      );

      logger.wa(
        `WhatsApp capability guard denied keywords: ${
          capabilityCheck.matchedDeniedKeywords.length > 0
            ? capabilityCheck.matchedDeniedKeywords.join(", ")
            : "-"
        }`
      );

      logger.wa(`WhatsApp boundary reply length: ${finalBoundaryReply.length}`);

      return {
        shouldReply: true,
        chatId,
        text: finalBoundaryReply,
      };
    }

    const memoryContext = await resolveRuntimeMemoriesForAgent({
      agentName,
      inputText: text,
      source: "whatsapp",
      matchedSkillNames: capabilityCheck.matchedSkillNames,
      maxResults: 5,
    });

    const runtimeMemoryContext = buildRuntimeMemoryContextBlock(memoryContext, {
      maxItems: 2,
      maxTotalChars: 900,
      maxCharsPerMemory: 320,
    });

    logger.wa(
      `WhatsApp memory resolver preview: eligible=${memoryContext.eligibleCount} returned=${memoryContext.returnedCount}`
    );

    logger.wa(
      `WhatsApp runtime memory context: injected=${runtimeMemoryContext.summary.injected} items=${runtimeMemoryContext.summary.itemCount} chars=${runtimeMemoryContext.summary.totalChars}`
    );

    if (memoryContext.memories.length > 0) {
      logger.wa(
        `WhatsApp memory resolver items: ${memoryContext.memories
          .map((memory) => `${memory.type}:${memory.scope}`)
          .join(", ")}`
      );
    }

    /**
     * Phase 8.50.5
     * WhatsApp Runtime RAG context injection.
     *
     * Important:
     * - Smaller than manual runtime context.
     * - Uses same semantic retrieval guard.
     * - Injected only into WhatsApp system prompt.
     * - Never exposed to WhatsApp user.
     */
    const ragQualityConfig = getRuntimeRagQualityConfig("whatsapp");
    const runtimeRagQuery = buildRuntimeRagQuery(text);

    const semanticRagSearch = await searchSemanticMemoryChunks({
      query: runtimeRagQuery,
      agentName,
      matchedSkillNames: capabilityCheck.matchedSkillNames,
      allowedScopes: ragQualityConfig.allowedScopes,
      allowedSensitivityLevels: ragQualityConfig.allowedSensitivityLevels,
      topK: ragQualityConfig.topK,
      minScore: ragQualityConfig.minScore,
    });

    const runtimeRagContext = buildRuntimeRagContextBlock(semanticRagSearch, {
      maxItems: ragQualityConfig.maxItems,
      maxTotalChars: ragQualityConfig.maxTotalChars,
      maxCharsPerChunk: ragQualityConfig.maxCharsPerChunk,
      minScore: ragQualityConfig.minScore,
      excludedMemoryIds: runtimeMemoryContext.summary.usedMemoryIds,
      previewOnly: false,
    });

    logger.wa(
      `WhatsApp runtime RAG context: injected=${runtimeRagContext.summary.retrieved} items=${runtimeRagContext.summary.itemCount} chars=${runtimeRagContext.summary.totalChars}`
    );

    if (runtimeRagContext.summary.topResults.length > 0) {
      logger.wa(
        `WhatsApp RAG top results: ${runtimeRagContext.summary.topResults
          .map(
            (item) =>
              `${item.agentName}:${item.memoryType}:${item.scope}:${item.score}`
          )
          .join(", ")}`
      );
    }

    const fallbackResult = await routeTask(text, {
      source: "whatsapp",
      senderId: senderNumber,
    });

    const runtimeResult = await runLlmCompletion({
      agentName,
      systemPrompt: buildWhatsAppSystemPrompt({
        agentName,
        memoryContextBlock: runtimeMemoryContext.contextBlock,
        ragContextBlock: runtimeRagContext.contextBlock,
      }),
      inputText: text,
      preference: {
        provider: "auto",
        model: "auto",
        mode: "auto",
      },
    });

    const rawFinalReply = runtimeResult.isMock
      ? fallbackResult
      : runtimeResult.outputText;

    const finalReply = buildSafeReply(text, rawFinalReply);

    await storeLatestTaskRuntimeResult({
      inputText: text,
      agentName,
      source: "whatsapp",
      outputText: finalReply,
      runtimeResult,
      capabilityCheck,
      runtimeMemoryContext: runtimeMemoryContext.summary,
      runtimeRagContext: runtimeRagContext.summary,
    });

    logger.wa(
      `WhatsApp runtime provider: ${
        runtimeResult.providerName || runtimeResult.provider
      } / ${runtimeResult.model} / mock=${runtimeResult.isMock}`
    );

    logger.wa(
      `WhatsApp capability guard: allowed=${capabilityCheck.allowed} confidence=${capabilityCheck.confidence}`
    );

    logger.wa(`WhatsApp final reply length: ${finalReply.length}`);

    return {
      shouldReply: true,
      chatId,
      text: finalReply,
    };
  } catch (error) {
    logger.error("Failed to process WhatsApp message", error);

    const errorReply = ensureWhatsAppSendableText(
      "Terjadi error saat memproses request WhatsApp.",
      text
    );

    return {
      shouldReply: true,
      chatId,
      text: errorReply,
    };
  }
}