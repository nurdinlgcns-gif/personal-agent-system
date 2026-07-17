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

function buildWhatsAppSystemPrompt(agentName: string) {
  return [
    `You are ${agentName}.`,
    "You are replying to a WhatsApp message.",
    "Answer the user's request directly and clearly.",
    "Keep the response concise, practical, and easy to read on mobile.",
    "Do not expose internal reasoning.",
    "Do not include metadata, runtime details, provider details, model details, or memory details.",
    "Do not include labels such as Topic, Language, Constraint, Format, Analysis, Reasoning, Final, Output, or Answer.",
    "If the user asks for a short answer, keep it short.",
    "If the user asks for one sentence, return exactly one sentence and nothing else.",
  ].join(" ");
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
        `WhatsApp capability guard denied keywords: ${
          capabilityCheck.matchedDeniedKeywords.length > 0
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

    const memoryContext = await resolveRuntimeMemoriesForAgent({
      agentName,
      inputText: text,
      source: "whatsapp",
      matchedSkillNames: capabilityCheck.matchedSkillNames,
      maxResults: 5,
    });

    logger.wa(
      `WhatsApp memory resolver preview: eligible=${memoryContext.eligibleCount} returned=${memoryContext.returnedCount}`
    );

    if (memoryContext.memories.length > 0) {
      logger.wa(
        `WhatsApp memory resolver items: ${memoryContext.memories
          .map((memory) => `${memory.type}:${memory.scope}`)
          .join(", ")}`
      );
    }

    const fallbackResult = await routeTask(text, {
      source: "whatsapp",
      senderId: senderNumber,
    });

    const runtimeResult = await runLlmCompletion({
      agentName,
      systemPrompt: buildWhatsAppSystemPrompt(agentName),
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

    return {
      shouldReply: true,
      chatId,
      text: "Terjadi error saat memproses request WhatsApp.",
    };
  }
}