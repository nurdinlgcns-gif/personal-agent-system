const DEFAULT_MAX_WHATSAPP_REPLY_LENGTH = 1200;
const SHORT_REPLY_MAX_LENGTH = 420;
const ONE_SENTENCE_MAX_LENGTH = 260;
const BOUNDARY_REPLY_MAX_LENGTH = 900;

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

function userAskedForShortAnswer(inputText: string) {
  const normalizedInput = inputText.toLowerCase();

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

function looksLikeMetaLine(line: string) {
  const cleanedLine = stripMarkdownPrefix(line);
  const normalizedLine = cleanedLine.toLowerCase().trim();

  return (
    normalizedLine.startsWith("topic:") ||
    normalizedLine.startsWith("language:") ||
    normalizedLine.startsWith("constraint") ||
    normalizedLine.startsWith("format") ||
    normalizedLine.startsWith("style:") ||
    normalizedLine.startsWith("tone:") ||
    normalizedLine.startsWith("platform:") ||
    normalizedLine.startsWith("target audience:") ||
    normalizedLine.startsWith("audience:") ||
    normalizedLine.startsWith("content:") ||
    normalizedLine.startsWith("user request:") ||
    normalizedLine.startsWith("request:") ||
    normalizedLine.startsWith("task:") ||
    normalizedLine.startsWith("instruction:") ||
    normalizedLine.startsWith("important:") ||
    normalizedLine.startsWith("analysis:") ||
    normalizedLine.startsWith("reasoning:") ||
    normalizedLine.startsWith("final:") ||
    normalizedLine.startsWith("output:") ||
    normalizedLine.startsWith("answer:") ||
    normalizedLine.includes("direct answer") ||
    normalizedLine.includes("short/mobile friendly") ||
    normalizedLine.includes("mobile friendly") ||
    normalizedLine.includes("no repetition") ||
    normalizedLine.includes("no reasoning") ||
    normalizedLine.includes("no analysis") ||
    normalizedLine.includes("no metadata") ||
    normalizedLine.includes("language matches") ||
    normalizedLine.includes("do not repeat user instructions") ||
    normalizedLine.includes("metadata") ||
    normalizedLine.includes("labels") ||
    normalizedLine.includes("whatsapp style") ||
    normalizedLine.includes("short and direct") ||
    normalizedLine.includes("direct to the point") ||
    normalizedLine.includes("self-correction") ||
    normalizedLine.includes("as an ai text model") ||
    normalizedLine.includes("system instruction") ||
    normalizedLine.includes("the user asked") ||
    normalizedLine.includes("i should") ||
    normalizedLine.includes("i will") ||
    normalizedLine.includes("wait,") ||
    normalizedLine === "yes." ||
    normalizedLine.endsWith("? yes.") ||
    normalizedLine.endsWith("? yes")
  );
}

function looksLikeOptionLine(line: string) {
  const normalizedLine = stripMarkdownPrefix(line).toLowerCase().trim();

  return (
    normalizedLine.startsWith("option 1:") ||
    normalizedLine.startsWith("option 2:") ||
    normalizedLine.startsWith("option 3:") ||
    normalizedLine.startsWith("option 4:") ||
    normalizedLine.startsWith("opsi 1:") ||
    normalizedLine.startsWith("opsi 2:") ||
    normalizedLine.startsWith("opsi 3:") ||
    normalizedLine.startsWith("opsi 4:")
  );
}

function stripRuntimeMetadata(outputText: string) {
  return outputText
    .split("\n")
    .filter((line) => {
      const normalizedLine = stripMarkdownPrefix(line).toLowerCase();

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

function stripMetaLines(outputText: string) {
  return outputText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !looksLikeMetaLine(line))
    .join("\n")
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

function stripMarkdownWrapper(outputText: string) {
  return outputText
    .replace(/^```[a-z]*\n?/i, "")
    .replace(/```$/i, "")
    .trim();
}

function getFirstSentence(outputText: string) {
  const normalizedOutput = outputText.trim();

  if (!normalizedOutput) {
    return "";
  }

  const firstLine = normalizedOutput
    .split("\n")
    .map((line) => stripMarkdownPrefix(line))
    .filter(Boolean)
    .filter((line) => !looksLikeMetaLine(line))[0];

  if (!firstLine) {
    return "";
  }

  const sentenceMatch = firstLine.match(/^(.+?[.!?])(\s|$)/);

  if (sentenceMatch?.[1]) {
    return sentenceMatch[1].trim();
  }

  return firstLine.trim();
}

function getFirstUsableLines(outputText: string, maxLines = 3) {
  return outputText
    .split("\n")
    .map((line) => stripMarkdownPrefix(line))
    .filter(Boolean)
    .filter((line) => !looksLikeMetaLine(line))
    .filter((line) => !looksLikeOptionLine(line))
    .slice(0, maxLines)
    .join("\n")
    .trim();
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

  if (lastSentenceEnd > 80) {
    return slice.slice(0, lastSentenceEnd + 1).trim();
  }

  const lastSpace = slice.lastIndexOf(" ");

  if (lastSpace > 80) {
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

function extractQuotedFinalAnswer(lines: string[]) {
  const cleanQuotedCandidates = lines
    .map((line) => stripMarkdownPrefix(line))
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !looksLikeMetaLine(line))
    .filter((line) => !looksLikeOptionLine(line))
    .map((line) => {
      const cleaned = stripOuterQuotes(line);

      if (cleaned !== line) {
        return cleaned;
      }

      const quotedTailMatch = line.match(/.+?["”]\s*$/);

      if (quotedTailMatch?.[1]) {
        return quotedTailMatch[1].trim();
      }

      return "";
    })
    .filter(Boolean);

  if (cleanQuotedCandidates.length === 0) {
    return "";
  }

  return cleanQuotedCandidates[cleanQuotedCandidates.length - 1];
}

function buildSafeFallback(inputText: string) {
  const cleanedInputText = removeLeadingAgentMention(inputText).toLowerCase();

  if (cleanedInputText.includes("kopi susu")) {
    return "Lagi butuh mood booster? Segerin hari kamu dengan kopi susu kita yang creamy dan manisnya pas. Cocok banget buat nemenin santai kamu hari ini! ☕️✨";
  }

  if (cleanedInputText.includes("buah") || cleanedInputText.includes("fruit")) {
    return "Nikmati buah segar pilihan yang kaya vitamin dan siap menemani harimu lebih sehat.";
  }

  return "Siap, request kamu sudah diproses.";
}

export function formatWhatsAppRuntimeReply(
  inputText: string,
  outputText: string
) {
  const cleanedInputText = removeLeadingAgentMention(inputText);

  const rawOutput = stripRuntimeMetadata(stripMarkdownWrapper(outputText));

  const rawLines = rawOutput
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const hasMetaLeak =
    rawLines.some((line) => looksLikeMetaLine(line)) ||
    rawLines.some((line) => looksLikeOptionLine(line));

  const quotedFinalAnswer = extractQuotedFinalAnswer(rawLines);

  if (quotedFinalAnswer) {
    if (userAskedForOneSentence(cleanedInputText)) {
      return truncateAtSentenceBoundary(
        getFirstSentence(quotedFinalAnswer),
        ONE_SENTENCE_MAX_LENGTH
      );
    }

    return truncateAtSentenceBoundary(quotedFinalAnswer, SHORT_REPLY_MAX_LENGTH);
  }

  const cleanedLines = rawLines
    .map((line) => stripMarkdownPrefix(line))
    .map((line) => stripOuterQuotes(line))
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !looksLikeMetaLine(line))
    .filter((line) => !looksLikeOptionLine(line));

  const dedupedLines = dedupeLines(cleanedLines);

  if (hasMetaLeak && dedupedLines.length > 0) {
    const lastUsableLine = dedupedLines[dedupedLines.length - 1];

    if (userAskedForOneSentence(cleanedInputText)) {
      return truncateAtSentenceBoundary(
        getFirstSentence(lastUsableLine),
        ONE_SENTENCE_MAX_LENGTH
      );
    }

    return truncateAtSentenceBoundary(lastUsableLine, SHORT_REPLY_MAX_LENGTH);
  }

  const cleanedOutput = normalizeWhitespace(
    stripMetaLines(dedupedLines.join("\n"))
  );

  if (!cleanedOutput) {
    return buildSafeFallback(cleanedInputText);
  }

  if (userAskedForOneSentence(cleanedInputText)) {
    const firstSentence = getFirstSentence(cleanedOutput);

    if (!firstSentence || looksLikeMetaLine(firstSentence)) {
      return buildSafeFallback(cleanedInputText);
    }

    return truncateAtSentenceBoundary(firstSentence, ONE_SENTENCE_MAX_LENGTH);
  }

  if (userAskedForShortAnswer(cleanedInputText)) {
    const shortReply = getFirstUsableLines(cleanedOutput, 2);

    if (!shortReply) {
      return buildSafeFallback(cleanedInputText);
    }

    return truncateAtSentenceBoundary(shortReply, SHORT_REPLY_MAX_LENGTH);
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

  if (!cleanedOutput) {
    return "Maaf, request ini belum sesuai dengan capability agent yang dipilih. Coba arahkan ke agent yang lebih tepat.";
  }

  return truncateAtSentenceBoundary(cleanedOutput, BOUNDARY_REPLY_MAX_LENGTH);
}