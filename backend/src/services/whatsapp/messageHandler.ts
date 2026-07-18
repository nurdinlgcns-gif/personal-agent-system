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
  formatWhatsAppBoundaryReply,
  formatWhatsAppRuntimeReply,
} from "./whatsappRuntimeGuardrails";
import { checkAgentCapabilityDynamic } from "../agents/agentCapabilityGuard";
import { resolveRuntimeMemoriesForAgent } from "../memory/memoryRuntimeScopeResolver";
import { buildRuntimeMemoryContextBlock } from "../memory/runtimeMemoryContextFormatter";

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
  /**
   * Untuk group chat, sender asli biasanya ada di participant.
   * Untuk personal chat, sender biasanya ada di remoteJid.
   */
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

function buildWhatsAppSystemPrompt(
  agentName: string,
  memoryContextBlock?: string
) {
  return [
    `You are ${agentName}.`,
    "You are replying to a WhatsApp message.",
    "Answer the user's request directly and clearly.",
    "Keep the response concise, practical, and easy to read on mobile.",
    "Return only the final answer.",
    "Do not expose internal reasoning.",
    "Do not include bullet-point analysis, constraints, self-checks, labels, or hidden planning.",
    "Do not include metadata, runtime details, provider details, model details, governance details, or memory details.",
    "Do not include labels such as Topic, Language, Constraint, Format, Analysis, Reasoning, Final, Output, Answer, Style, Tone, Target audience, or Content.",
    "Do not mention Memory Vault, retrieval, memory IDs, memory score, sourceRef, runtimeInjectable, or RAG.",
    "If the user asks for a short answer, keep it short.",
    "If the user asks for one sentence, return exactly one sentence and nothing else.",
    "If runtime memory context is provided, use it silently only when it improves relevance.",
    memoryContextBlock
      ? [
        "",
        "Scoped runtime memory:",
        memoryContextBlock,
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

  /**
   * PENTING:
   * Kalau PROCESS_FROM_ME=false, pesan dari bot sendiri langsung diabaikan.
   * Ini mencegah:
   * - bot memproses balasannya sendiri
   * - terminal penuh oleh text output panjang
   * - loop reply tanpa akhir
   */
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

  /**
   * Security gate:
   * Nomor / ID sender harus ada di ALLOWED_WA_NUMBERS.
   */
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

    /**
     * Capability boundary check.
     *
     * Jika request tidak sesuai contract agent:
     * - jangan panggil routeTask()
     * - jangan panggil LLM runtime
     * - tetap create task audit governance blocked
     * - balas refusal halus ke WhatsApp
     */
    const capabilityCheck = await checkAgentCapabilityDynamic({
      agentName,
      inputText: text,
    });

    if (!capabilityCheck.allowed) {
      const boundaryResponse = buildCapabilityBoundaryResponse({
        agentName,
        refusalMessage: capabilityCheck.refusalMessage,
      });

      const finalBoundaryReply = formatWhatsAppBoundaryReply(boundaryResponse);

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
        `WhatsApp capability guard denied keywords: ${capabilityCheck.matchedDeniedKeywords.length > 0
          ? capabilityCheck.matchedDeniedKeywords.join(", ")
          : "-"
        }`
      );

      return {
        shouldReply: true,
        chatId,
        text: finalBoundaryReply,
      };
    }

    /**
     * Phase 8.46.3
     * WhatsApp memory context injection.
     *
     * Important:
     * - shorter than manual/widget context
     * - injected only into system prompt
     * - never sent as metadata to WhatsApp user
     */
    const memoryContext = await resolveRuntimeMemoriesForAgent({
      agentName,
      inputText: text,
      source: "whatsapp",
      matchedSkillNames: capabilityCheck.matchedSkillNames,
      maxResults: 4,
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
     * Keep existing WhatsApp orchestration as safe fallback.
     * routeTask() tetap bikin task, update agent status, dan broadcast event.
     */
    const fallbackResult = await routeTask(text, {
      source: "whatsapp",
      senderId: senderNumber,
    });

    /**
     * Runtime adapter output:
     * - WhatsApp belum punya model selector, jadi pakai auto/default registry.
     * - Kalau provider real sukses, final reply pakai output adapter.
     * - Kalau provider mock/error, fallback ke routeTask lama.
     */
    const runtimeResult = await runLlmCompletion({
      agentName,
      systemPrompt: buildWhatsAppSystemPrompt(
        agentName,
        runtimeMemoryContext.contextBlock
      ),
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

    const finalReply = formatWhatsAppRuntimeReply(text, rawFinalReply);

    await storeLatestTaskRuntimeResult({
      inputText: text,
      agentName,
      source: "whatsapp",
      outputText: finalReply,
      runtimeResult,
      capabilityCheck,
      runtimeMemoryContext: runtimeMemoryContext.summary,
    });

    logger.wa(
      `WhatsApp runtime provider: ${runtimeResult.providerName || runtimeResult.provider
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

    return {
      shouldReply: true,
      chatId,
      text: "Terjadi error saat memproses request WhatsApp.",
    };
  }
}