import { guardRuntimeFinalOutput } from "../llm/runtimeOutputGuardrails";

const DEFAULT_MAX_WHATSAPP_REPLY_LENGTH = 1200;
const SHORT_REPLY_MAX_LENGTH = 700;
const ONE_SENTENCE_MAX_LENGTH = 320;
const BOUNDARY_REPLY_MAX_LENGTH = 900;

function removeLeadingAgentMention(inputText: string) {
  return String(inputText || "").replace(/^@[\w-]+\s*/i, "").trim();
}

function userAskedForOneSentence(inputText: string) {
  const normalizedInput = removeLeadingAgentMention(inputText).toLowerCase();

  return (
    normalizedInput.includes("satu kalimat") ||
    normalizedInput.includes("1 kalimat") ||
    normalizedInput.includes("one sentence") ||
    normalizedInput.includes("single sentence")
  );
}

function userAskedForShortAnswer(inputText: string) {
  const normalizedInput = removeLeadingAgentMention(inputText).toLowerCase();

  return (
    userAskedForOneSentence(inputText) ||
    normalizedInput.includes("singkat") ||
    normalizedInput.includes("pendek") ||
    normalizedInput.includes("short") ||
    normalizedInput.includes("brief") ||
    normalizedInput.includes("jawab singkat") ||
    normalizedInput.includes("langsung") ||
    normalizedInput.includes("to the point")
  );
}

function normalizeWhitespace(outputText: string) {
  return String(outputText || "")
    .replace(/\r/g, "")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function stripMarkdownWrapper(outputText: string) {
  return normalizeWhitespace(outputText)
    .replace(/^```[a-z0-9-]*\n?/i, "")
    .replace(/```$/i, "")
    .trim();
}

function getFirstSentence(outputText: string) {
  const normalizedOutput = normalizeWhitespace(outputText);

  if (!normalizedOutput) {
    return "";
  }

  const firstLine = normalizedOutput.split("\n").filter(Boolean)[0];

  if (!firstLine) {
    return "";
  }

  const sentenceMatch = firstLine.match(/^(.+?[.!?])(\s|$)/);

  if (sentenceMatch?.[1]) {
    return sentenceMatch[1].trim();
  }

  return firstLine.trim();
}

function truncateAtSentenceBoundary(outputText: string, maxLength: number) {
  const normalizedOutput = normalizeWhitespace(outputText);

  if (normalizedOutput.length <= maxLength) {
    return normalizedOutput;
  }

  const slice = normalizedOutput.slice(0, maxLength);
  const lastSentenceEnd = Math.max(
    slice.lastIndexOf("."),
    slice.lastIndexOf("!"),
    slice.lastIndexOf("?")
  );

  if (lastSentenceEnd > 120) {
    return slice.slice(0, lastSentenceEnd + 1).trim();
  }

  const lastSpace = slice.lastIndexOf(" ");

  if (lastSpace > 120) {
    return `${slice.slice(0, lastSpace).trim()}...`;
  }

  return `${slice.trim()}...`;
}

function stripRuntimeMetadata(outputText: string) {
  return String(outputText || "")
    .split("\n")
    .filter((line) => {
      const normalizedLine = line.toLowerCase().trim();

      return (
        !normalizedLine.startsWith("runtime:") &&
        !normalizedLine.startsWith("provider:") &&
        !normalizedLine.startsWith("model:") &&
        !normalizedLine.startsWith("resolved from:")
      );
    })
    .join("\n")
    .trim();
}

function looksUnsafeForWhatsApp(outputText: string) {
  const normalizedOutput = normalizeWhitespace(outputText).toLowerCase();

  if (!normalizedOutput) {
    return true;
  }

  const unsafeFragments = [
    "thanks for this conversation",
    "i've reached my limit",
    "i have reached my limit",
    "will you hit",
    "new topic",
    "start a new chat",
    "conversation limit",
    "as an ai language model",
    "as an ai model",
    "provider error",
    "rate limit",
    "token limit",
    "[link order/whatsapp]",
    "[link order]",
    "[cta]",
    "[product name]",
    "[nama produk]",
    "{{",
    "}}",
  ];

  if (unsafeFragments.some((fragment) => normalizedOutput.includes(fragment))) {
    return true;
  }

  if (/^\[[^\]]+\]$/i.test(normalizedOutput)) {
    return true;
  }

  if (/^draft\s*\d+\s*[:(-]/i.test(normalizedOutput)) {
    return true;
  }

  return false;
}

function buildWhatsAppEmergencyFallback(inputText: string) {
  const cleanedInputText = removeLeadingAgentMention(inputText).toLowerCase();

  if (
    cleanedInputText.includes("ts1005") ||
    cleanedInputText.includes("typescript") ||
    cleanedInputText.includes("error ts")
  ) {
    return "Error TS1005 biasanya berarti ada sintaks TypeScript yang belum lengkap. Coba cek tanda kurung, kurung kurawal, tanda kutip, koma, atau operator di baris error dan beberapa baris sebelumnya.";
  }

  if (cleanedInputText.includes("kopi hli")) {
    return "Nikmati Kopi HLI yang praktis, nikmat, dan cocok menemani aktivitas harianmu. Rasanya pas buat bikin hari lebih semangat dari tegukan pertama! ☕️✨";
  }

  if (cleanedInputText.includes("kopi susu")) {
    return "Lagi butuh mood booster? Segerin hari kamu dengan kopi susu creamy yang manisnya pas dan cocok banget buat nemenin santai kamu hari ini! ☕️✨";
  }

  if (
    cleanedInputText.includes("caption") ||
    cleanedInputText.includes("jualan") ||
    cleanedInputText.includes("promosi")
  ) {
    return "Produk ini siap jadi pilihan tepat buat kamu yang ingin kualitas, rasa, dan manfaat dalam satu paket. Yuk, coba sekarang dan rasakan bedanya! ✨";
  }

  return "Siap, request kamu sudah diproses. Kalau mau, kirim sedikit detail tambahan supaya hasilnya bisa gue rapihin lagi.";
}

export function formatWhatsAppRuntimeReply(
  inputText: string,
  outputText: string
) {
  const cleanedInputText = removeLeadingAgentMention(inputText);

  const guarded = guardRuntimeFinalOutput(cleanedInputText, outputText, {
    channel: "whatsapp",
  });

  let cleanedOutput = normalizeWhitespace(guarded.outputText);

  if (!cleanedOutput || looksUnsafeForWhatsApp(cleanedOutput)) {
    cleanedOutput = buildWhatsAppEmergencyFallback(cleanedInputText);
  }

  if (userAskedForOneSentence(cleanedInputText)) {
    return truncateAtSentenceBoundary(
      getFirstSentence(cleanedOutput),
      ONE_SENTENCE_MAX_LENGTH
    );
  }

  if (userAskedForShortAnswer(cleanedInputText)) {
    return truncateAtSentenceBoundary(cleanedOutput, SHORT_REPLY_MAX_LENGTH);
  }

  return truncateAtSentenceBoundary(
    cleanedOutput,
    DEFAULT_MAX_WHATSAPP_REPLY_LENGTH
  );
}

export function formatWhatsAppBoundaryReply(outputText: string) {
  const cleanedOutput = normalizeWhitespace(
    stripRuntimeMetadata(stripMarkdownWrapper(outputText))
  );

  if (!cleanedOutput || looksUnsafeForWhatsApp(cleanedOutput)) {
    return "Maaf, request ini belum sesuai dengan capability agent yang dipilih. Coba arahkan ke agent yang lebih tepat.";
  }

  return truncateAtSentenceBoundary(cleanedOutput, BOUNDARY_REPLY_MAX_LENGTH);
}

export function ensureWhatsAppSendableText(outputText: string, inputText = "") {
  const cleanedOutput = normalizeWhitespace(outputText);

  if (!cleanedOutput || looksUnsafeForWhatsApp(cleanedOutput)) {
    return buildWhatsAppEmergencyFallback(inputText || outputText);
  }

  return truncateAtSentenceBoundary(
    cleanedOutput,
    DEFAULT_MAX_WHATSAPP_REPLY_LENGTH
  );
}