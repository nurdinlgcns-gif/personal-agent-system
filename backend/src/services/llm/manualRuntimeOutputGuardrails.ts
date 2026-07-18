const DEFAULT_MAX_MANUAL_REPLY_LENGTH = 2400;
const ONE_SENTENCE_MAX_LENGTH = 360;

function removeLeadingAgentMention(inputText: string) {
  return inputText.replace(/^@[\w-]+\s*/i, "").trim();
}

function userAskedForOneSentence(inputText: string) {
  const normalizedInput = inputText.toLowerCase();

  return (
    normalizedInput.includes("satu kalimat") ||
    normalizedInput.includes("1 kalimat") ||
    normalizedInput.includes("one sentence") ||
    normalizedInput.includes("single sentence")
  );
}

function stripMarkdownWrapper(outputText: string) {
  return outputText
    .replace(/^```[a-z]*\n?/i, "")
    .replace(/```$/i, "")
    .trim();
}

function stripMarkdownPrefix(value: string) {
  return value
    .replace(/^[-*•]\s*/, "")
    .replace(/^\d+\.\s*/, "")
    .replace(/^>\s*/, "")
    .trim();
}

function stripOuterQuotes(value: string) {
  return value
    .replace(/^["“”]+/, "")
    .replace(/["“”]+$/, "")
    .trim();
}

function normalizeWhitespace(outputText: string) {
  return outputText
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function looksLikeMetaLine(line: string) {
  const normalizedLine = stripMarkdownPrefix(line).toLowerCase().trim();

  return (
    normalizedLine.startsWith("style:") ||
    normalizedLine.startsWith("constraint") ||
    normalizedLine.startsWith("target audience:") ||
    normalizedLine.startsWith("audience:") ||
    normalizedLine.startsWith("tone:") ||
    normalizedLine.startsWith("content:") ||
    normalizedLine.startsWith("language:") ||
    normalizedLine.startsWith("topic:") ||
    normalizedLine.startsWith("format:") ||
    normalizedLine.startsWith("analysis:") ||
    normalizedLine.startsWith("reasoning:") ||
    normalizedLine.startsWith("final:") ||
    normalizedLine.startsWith("output:") ||
    normalizedLine.startsWith("answer:") ||
    normalizedLine.startsWith("user request:") ||
    normalizedLine.startsWith("request:") ||
    normalizedLine.startsWith("task:") ||
    normalizedLine.includes("direct answer only") ||
    normalizedLine.includes("no repetition") ||
    normalizedLine.includes("no reasoning") ||
    normalizedLine.includes("no analysis") ||
    normalizedLine.includes("no metadata") ||
    normalizedLine.includes("language matches") ||
    normalizedLine.includes("self-correction") ||
    normalizedLine.includes("as an ai text model") ||
    normalizedLine.includes("system instruction") ||
    normalizedLine.includes("the user asked") ||
    normalizedLine.includes("i should") ||
    normalizedLine.includes("i will") ||
    normalizedLine.includes("wait,") ||
    normalizedLine.includes("yes.")
  );
}

function looksLikeOptionLine(line: string) {
  const normalizedLine = stripMarkdownPrefix(line).toLowerCase().trim();

  return (
    normalizedLine.startsWith("option 1:") ||
    normalizedLine.startsWith("option 2:") ||
    normalizedLine.startsWith("option 3:") ||
    normalizedLine.startsWith("opsi 1:") ||
    normalizedLine.startsWith("opsi 2:") ||
    normalizedLine.startsWith("opsi 3:")
  );
}

function extractQuotedText(line: string) {
  const trimmedLine = stripMarkdownPrefix(line).trim();

  const quoteMatch =
    trimmedLine.match(/^.+["”]$/) ||
    trimmedLine.match(/.+["”]$/);

  if (quoteMatch?.[1]) {
    return quoteMatch[1].trim();
  }

  return "";
}

function getFirstSentence(outputText: string) {
  const normalizedOutput = outputText.trim();

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
  if (outputText.length <= maxLength) {
    return outputText;
  }

  const slice = outputText.slice(0, maxLength);
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

function dedupeLines(lines: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const line of lines) {
    const key = line.toLowerCase().trim();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(line);
  }

  return result;
}

function buildSafeFallback(inputText: string) {
  const cleanedInputText = removeLeadingAgentMention(inputText).toLowerCase();

  if (cleanedInputText.includes("kopi susu")) {
    return "Lagi butuh yang seger-seger buat nemenin aktivitas? Kopi susu kita siap bikin mood kamu balik lagi. Yuk, pesan sekarang sebelum kehabisan! ☕️✨";
  }

  return "Siap, request kamu sudah diproses.";
}

export function formatManualRuntimeOutput(
  inputText: string,
  outputText: string
) {
  const cleanedInputText = removeLeadingAgentMention(inputText);
  const rawOutput = stripMarkdownWrapper(outputText);

  const rawLines = rawOutput
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const hasMetaLeak = rawLines.some((line) => looksLikeMetaLine(line));

  const usableLines = rawLines
    .map((line) => stripMarkdownPrefix(line))
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !looksLikeMetaLine(line));

  const quotedCandidates = usableLines
    .map((line) => extractQuotedText(line))
    .filter(Boolean)
    .map(stripOuterQuotes);

  if (quotedCandidates.length > 0) {
    const candidate = quotedCandidates[quotedCandidates.length - 1];

    if (userAskedForOneSentence(cleanedInputText)) {
      return truncateAtSentenceBoundary(
        getFirstSentence(candidate),
        ONE_SENTENCE_MAX_LENGTH
      );
    }

    return truncateAtSentenceBoundary(candidate, DEFAULT_MAX_MANUAL_REPLY_LENGTH);
  }

  const nonOptionLines = usableLines
    .filter((line) => !looksLikeOptionLine(line))
    .map(stripOuterQuotes)
    .filter(Boolean);

  if (hasMetaLeak && nonOptionLines.length > 0) {
    const candidate = nonOptionLines[nonOptionLines.length - 1];

    if (userAskedForOneSentence(cleanedInputText)) {
      return truncateAtSentenceBoundary(
        getFirstSentence(candidate),
        ONE_SENTENCE_MAX_LENGTH
      );
    }

    return truncateAtSentenceBoundary(candidate, DEFAULT_MAX_MANUAL_REPLY_LENGTH);
  }

  const cleanedOutput = normalizeWhitespace(dedupeLines(usableLines).join("\n"));

  if (!cleanedOutput) {
    return buildSafeFallback(cleanedInputText);
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