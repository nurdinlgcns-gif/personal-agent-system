import { guardRuntimeFinalOutput } from "./runtimeOutputGuardrails";

const DEFAULT_MAX_MANUAL_REPLY_LENGTH = 2400;
const ONE_SENTENCE_MAX_LENGTH = 360;

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

function normalizeWhitespace(outputText: string) {
  return String(outputText || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function getFirstSentence(outputText: string) {
  const normalizedOutput = normalizeWhitespace(outputText);

  if (!normalizedOutput) {
    return "";
  }

  const sentenceMatch = normalizedOutput.match(/^(.+?[.!?])(\s|$)/);

  if (sentenceMatch?.[1]) {
    return sentenceMatch[1].trim();
  }

  return normalizedOutput;
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

export function formatManualRuntimeOutput(
  inputText: string,
  outputText: string
) {
  const cleanedInputText = removeLeadingAgentMention(inputText);

  const guarded = guardRuntimeFinalOutput(cleanedInputText, outputText, {
    channel: "manual",
  });

  const cleanedOutput = normalizeWhitespace(guarded.outputText);

  if (!cleanedOutput) {
    return "Siap, request kamu sudah diproses. Kalau mau, kirim sedikit detail tambahan supaya hasilnya bisa gue rapihin lagi.";
  }

  if (userAskedForOneSentence(cleanedInputText)) {
    return truncateAtSentenceBoundary(
      getFirstSentence(cleanedOutput),
      ONE_SENTENCE_MAX_LENGTH
    );
  }

  return truncateAtSentenceBoundary(
    cleanedOutput,
    DEFAULT_MAX_MANUAL_REPLY_LENGTH
  );
}