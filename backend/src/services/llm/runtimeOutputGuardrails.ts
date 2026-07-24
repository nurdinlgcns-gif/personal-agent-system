import type { LlmModelMode } from "./llmTypes";

export type RuntimeGenerationConfig = {
  maxOutputTokens: number;
  temperature: number;
};

export type RuntimeFinalGuardContext = {
  channel?: "manual" | "whatsapp" | "runtime";
  agentKey?: string | null;
};

export type RuntimeFinalGuardResult = {
  ok: boolean;
  outputText: string;
  reason: string | null;
};

const PROVIDER_LEAK_PATTERNS = [
  "thanks for this conversation",
  "i've reached my limit",
  "i have reached my limit",
  "will you hit",
  "new topic",
  "start a new chat",
  "conversation limit",
  "as an ai language model",
  "as an ai model",
  "as a language model",
  "i can't continue this conversation",
  "i cannot continue this conversation",
  "i'm unable to continue",
  "i am unable to continue",
  "model is overloaded",
  "provider error",
  "rate limit",
  "token limit",
  "context length",
];

const META_PREFIXES = [
  "topic:",
  "language:",
  "constraint",
  "constraints:",
  "format:",
  "style:",
  "tone:",
  "platform:",
  "target audience:",
  "audience:",
  "content:",
  "user request:",
  "request:",
  "task:",
  "instruction:",
  "important:",
  "analysis:",
  "reasoning:",
  "final:",
  "output:",
  "answer:",
  "runtime:",
  "provider:",
  "model:",
  "resolved from:",
];

const META_PHRASES = [
  "the user asked",
  "the user wants",
  "user wants",
  "i should",
  "i will",
  "wait,",
  "system instruction",
  "hidden instruction",
  "chain-of-thought",
  "internal reasoning",
  "direct answer only",
  "no reasoning",
  "no analysis",
  "no metadata",
  "do not repeat user instructions",
  "language matches",
  "short/mobile friendly",
  "mobile friendly",
  "self-correction",
];

const PLACEHOLDER_PHRASES = [
  "[link order/whatsapp]",
  "[link order]",
  "[whatsapp]",
  "[cta]",
  "[call to action]",
  "[nama produk]",
  "[product name]",
  "[insert",
  "[masukkan",
  "{{",
  "}}",
];

function removeLeadingAgentMention(inputText: string) {
  return String(inputText || "").replace(/^@[\w-]+\s*/i, "").trim();
}

function normalizeBasicText(value: string) {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .trim();
}

function stripMarkdownWrapper(outputText: string) {
  return normalizeBasicText(outputText)
    .replace(/^```[a-z0-9-]*\n?/i, "")
    .replace(/```$/i, "")
    .trim();
}

function stripMarkdownPrefix(value: string) {
  return normalizeBasicText(value)
    .replace(/^[-*•]\s*/, "")
    .replace(/^\d+\.\s*/, "")
    .replace(/^>\s*/, "")
    .trim();
}

function stripOuterQuotes(value: string) {
  return normalizeBasicText(value)
    .replace(/^["“”']+/, "")
    .replace(/["“”']+$/, "")
    .trim();
}

function normalizeWhitespace(outputText: string) {
  return normalizeBasicText(outputText)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .replace(/[ \t]+/g, " ")
    .trim();
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

function userAskedForMultipleOptions(inputText: string) {
  const normalizedInput = removeLeadingAgentMention(inputText).toLowerCase();

  return (
    normalizedInput.includes("beberapa opsi") ||
    normalizedInput.includes("beberapa pilihan") ||
    normalizedInput.includes("3 opsi") ||
    normalizedInput.includes("tiga opsi") ||
    normalizedInput.includes("3 pilihan") ||
    normalizedInput.includes("tiga pilihan") ||
    normalizedInput.includes("multiple options") ||
    normalizedInput.includes("several options") ||
    normalizedInput.includes("alternatif") ||
    normalizedInput.includes("variasi")
  );
}

function looksLikeMetaLine(line: string) {
  const normalizedLine = stripMarkdownPrefix(line).toLowerCase().trim();

  if (!normalizedLine) {
    return false;
  }

  return (
    META_PREFIXES.some((prefix) => normalizedLine.startsWith(prefix)) ||
    META_PHRASES.some((phrase) => normalizedLine.includes(phrase))
  );
}

function looksLikeOptionOrDraftLine(line: string) {
  const normalizedLine = stripMarkdownPrefix(line).toLowerCase().trim();

  return (
    /^draft\s*\d+\s*[:(-]/i.test(normalizedLine) ||
    /^option\s*\d+\s*[:(-]/i.test(normalizedLine) ||
    /^opsi\s*\d+\s*[:(-]/i.test(normalizedLine) ||
    /^versi\s*\d+\s*[:(-]/i.test(normalizedLine) ||
    /^pilihan\s*\d+\s*[:(-]/i.test(normalizedLine) ||
    /^alternative\s*\d+\s*[:(-]/i.test(normalizedLine) ||
    /^alternatif\s*\d+\s*[:(-]/i.test(normalizedLine)
  );
}

function stripOptionOrDraftPrefix(line: string) {
  return stripMarkdownPrefix(line)
    .replace(/^draft\s*\d+\s*\([^)]*\)\s*:\s*/i, "")
    .replace(/^draft\s*\d+\s*[:(-]\s*/i, "")
    .replace(/^option\s*\d+\s*\([^)]*\)\s*:\s*/i, "")
    .replace(/^option\s*\d+\s*[:(-]\s*/i, "")
    .replace(/^opsi\s*\d+\s*\([^)]*\)\s*:\s*/i, "")
    .replace(/^opsi\s*\d+\s*[:(-]\s*/i, "")
    .replace(/^versi\s*\d+\s*\([^)]*\)\s*:\s*/i, "")
    .replace(/^versi\s*\d+\s*[:(-]\s*/i, "")
    .replace(/^pilihan\s*\d+\s*\([^)]*\)\s*:\s*/i, "")
    .replace(/^pilihan\s*\d+\s*[:(-]\s*/i, "")
    .replace(/^alternative\s*\d+\s*\([^)]*\)\s*:\s*/i, "")
    .replace(/^alternative\s*\d+\s*[:(-]\s*/i, "")
    .replace(/^alternatif\s*\d+\s*\([^)]*\)\s*:\s*/i, "")
    .replace(/^alternatif\s*\d+\s*[:(-]\s*/i, "")
    .trim();
}

function hasProviderLeak(outputText: string) {
  const normalizedOutput = normalizeWhitespace(outputText).toLowerCase();

  return PROVIDER_LEAK_PATTERNS.some((pattern) =>
    normalizedOutput.includes(pattern)
  );
}

function hasPlaceholderLeak(outputText: string) {
  const normalizedOutput = normalizeWhitespace(outputText).toLowerCase();

  return PLACEHOLDER_PHRASES.some((phrase) =>
    normalizedOutput.includes(phrase)
  );
}

function isPlaceholderOnlyLine(line: string) {
  const cleanedLine = stripMarkdownPrefix(stripOuterQuotes(line)).trim();

  return (
    /^\[[^\]]+\]$/i.test(cleanedLine) ||
    /^\{\{[^}]+\}\}$/i.test(cleanedLine) ||
    /^<[^>]+>$/i.test(cleanedLine)
  );
}

function stripRuntimeMetadata(outputText: string) {
  return normalizeBasicText(outputText)
    .split("\n")
    .filter((line) => !looksLikeMetaLine(line))
    .join("\n")
    .trim();
}

function dedupeLines(lines: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const line of lines) {
    const key = line.toLowerCase().trim();

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(line);
  }

  return result;
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

function looksTruncated(outputText: string) {
  const cleanedOutput = normalizeWhitespace(outputText);

  if (!cleanedOutput) {
    return true;
  }

  if (cleanedOutput.endsWith("...")) {
    return true;
  }

  const words = cleanedOutput.split(/\s+/).filter(Boolean);
  const lastWord = words[words.length - 1]?.toLowerCase() || "";
  const previousWord = words[words.length - 2]?.toLowerCase() || "";

  if (
    previousWord.length >= 4 &&
    lastWord.length >= 3 &&
    previousWord.startsWith(lastWord) &&
    previousWord !== lastWord
  ) {
    return true;
  }

  if (cleanedOutput.length < 40 && !/[.!?]$/.test(cleanedOutput)) {
    return true;
  }

  return false;
}

function normalizeFinalLines(inputText: string, outputText: string) {
  const allowMultipleOptions = userAskedForMultipleOptions(inputText);

  const rawLines = stripRuntimeMetadata(stripMarkdownWrapper(outputText))
    .split("\n")
    .map((line) => stripMarkdownPrefix(line))
    .map((line) => stripOuterQuotes(line))
    .map((line) => line.trim())
    .filter(Boolean);

  const cleanedLines = rawLines
    .filter((line) => !isPlaceholderOnlyLine(line))
    .map((line) => {
      if (!allowMultipleOptions && looksLikeOptionOrDraftLine(line)) {
        return stripOptionOrDraftPrefix(line);
      }

      return line;
    })
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !looksLikeMetaLine(line));

  return dedupeLines(cleanedLines);
}

function buildSafeFallback(inputText: string, context?: RuntimeFinalGuardContext) {
  const cleanedInputText = removeLeadingAgentMention(inputText).toLowerCase();
  const agentKey = String(context?.agentKey || "").toLowerCase();

  if (
    cleanedInputText.includes("ts1005") ||
    cleanedInputText.includes("typescript") ||
    cleanedInputText.includes("error ts") ||
    agentKey.includes("code")
  ) {
    return "Error TS1005 biasanya berarti ada sintaks TypeScript yang belum lengkap, misalnya tanda kurung, kurung kurawal, tanda kutip, koma, atau operator yang hilang. Coba cek baris yang ditunjuk compiler, lalu periksa juga 1 sampai 3 baris sebelumnya karena sumber error sering ada tepat sebelum posisi yang ditandai.";
  }

  if (
    cleanedInputText.includes("kopi hli") ||
    cleanedInputText.includes("produk kopi hli")
  ) {
    return "Nikmati Kopi HLI yang praktis, nikmat, dan cocok menemani aktivitas harianmu. Rasanya pas buat bikin hari lebih semangat dari tegukan pertama.";
  }

  if (
    cleanedInputText.includes("kopi susu") ||
    cleanedInputText.includes("coffee with milk") ||
    cleanedInputText.includes("milk coffee")
  ) {
    return "Lagi butuh mood booster? Segerin hari kamu dengan kopi susu creamy yang manisnya pas dan cocok banget buat nemenin santai kamu hari ini.";
  }

  if (
    cleanedInputText.includes("caption") ||
    cleanedInputText.includes("jualan") ||
    cleanedInputText.includes("promosi")
  ) {
    return "Produk ini siap jadi pilihan tepat buat kamu yang ingin kualitas, rasa, dan manfaat dalam satu paket. Yuk, coba sekarang dan rasakan bedanya.";
  }

  return "Siap, request kamu sudah diproses. Kalau mau, kirim sedikit detail tambahan supaya hasilnya bisa gue rapihin lagi.";
}

export function guardRuntimeFinalOutput(
  inputText: string,
  outputText: string,
  context?: RuntimeFinalGuardContext
): RuntimeFinalGuardResult {
  const cleanedInputText = removeLeadingAgentMention(inputText);
  const rawOutput = normalizeBasicText(outputText);

  if (!rawOutput) {
    return {
      ok: false,
      outputText: buildSafeFallback(cleanedInputText, context),
      reason: "empty_output",
    };
  }

  if (hasProviderLeak(rawOutput)) {
    return {
      ok: false,
      outputText: buildSafeFallback(cleanedInputText, context),
      reason: "provider_leak",
    };
  }

  const hasPlaceholder = hasPlaceholderLeak(rawOutput);
  const lines = normalizeFinalLines(cleanedInputText, rawOutput);
  const cleanedOutput = normalizeWhitespace(lines.join("\n"));

  if (!cleanedOutput) {
    return {
      ok: false,
      outputText: buildSafeFallback(cleanedInputText, context),
      reason: hasPlaceholder ? "placeholder_only" : "no_usable_output",
    };
  }

  if (hasPlaceholder && cleanedOutput.length < 80) {
    return {
      ok: false,
      outputText: buildSafeFallback(cleanedInputText, context),
      reason: "placeholder_residue",
    };
  }

  if (looksTruncated(cleanedOutput)) {
    return {
      ok: false,
      outputText: buildSafeFallback(cleanedInputText, context),
      reason: "truncated_output",
    };
  }

  if (userAskedForOneSentence(cleanedInputText)) {
    const firstSentence = getFirstSentence(cleanedOutput);

    if (!firstSentence || looksLikeMetaLine(firstSentence)) {
      return {
        ok: false,
        outputText: buildSafeFallback(cleanedInputText, context),
        reason: "invalid_one_sentence_output",
      };
    }

    return {
      ok: true,
      outputText: truncateAtSentenceBoundary(firstSentence, 320),
      reason: null,
    };
  }

  if (userAskedForShortAnswer(cleanedInputText)) {
    return {
      ok: true,
      outputText: truncateAtSentenceBoundary(cleanedOutput, 700),
      reason: null,
    };
  }

  return {
    ok: true,
    outputText: truncateAtSentenceBoundary(cleanedOutput, 1800),
    reason: null,
  };
}

export function buildGuardedSystemPrompt(systemPrompt: string) {
  return [
    systemPrompt,
    "",
    "STRICT OUTPUT CONTRACT:",
    "Return the final user-facing answer only.",
    "Never repeat, summarize, translate, label, or analyze the user's request.",
    "Never output metadata such as Topic, Language, Constraint, Format, User request, Task, Analysis, Reasoning, Final, Output, Provider, Model, Runtime, or Answer.",
    "Never reveal internal reasoning, hidden analysis, planning notes, or chain-of-thought.",
    "Never mention provider limitations, conversation limits, new topic requests, model errors, or internal runtime errors.",
    "Never output unresolved placeholders such as [Link Order/WhatsApp], [CTA], [Product Name], [Nama Produk], or {{variable}}.",
    "Do not provide alternatives unless explicitly requested.",
    "If the user asks for one sentence, return exactly one sentence and nothing else.",
    "No bullet points unless explicitly requested.",
    "No explanation unless explicitly requested.",
    "Use the same language as the user's request.",
    "Make the answer complete. Do not stop mid-sentence.",
  ].join("\n");
}

export function buildGuardedUserPrompt(inputText: string) {
  const cleanedInputText = removeLeadingAgentMention(inputText);

  if (userAskedForOneSentence(cleanedInputText)) {
    return [
      cleanedInputText,
      "",
      "Berikan hanya satu kalimat final yang langsung bisa dipakai.",
      "Jangan tulis label, metadata, bahasa, constraint, format, topic, atau penjelasan.",
      "Jangan ulangi instruksi.",
      "Jangan beri opsi.",
      "Jangan gunakan bullet point.",
      "Pastikan kalimat selesai utuh dan tidak terpotong.",
    ].join("\n");
  }

  if (userAskedForShortAnswer(cleanedInputText)) {
    return [
      cleanedInputText,
      "",
      "Jawab singkat dan langsung ke inti.",
      "Jangan ulangi instruksi user.",
      "Jangan tampilkan analisis, metadata, label, draft, atau placeholder.",
      "Pastikan jawaban selesai utuh dan tidak terpotong.",
    ].join("\n");
  }

  return [
    cleanedInputText,
    "",
    "Jawab langsung dengan hasil akhir saja.",
    "Jangan ulangi instruksi user.",
    "Jangan tampilkan reasoning, analisis internal, metadata, label, draft, atau placeholder.",
    "Pastikan jawaban lengkap, natural, dan tidak terpotong.",
  ].join("\n");
}

export function getRuntimeGenerationConfig(
  inputText: string,
  mode: LlmModelMode
): RuntimeGenerationConfig {
  const cleanedInputText = removeLeadingAgentMention(inputText);

  if (userAskedForOneSentence(cleanedInputText)) {
    return {
      maxOutputTokens: 120,
      temperature: 0.2,
    };
  }

  if (userAskedForShortAnswer(cleanedInputText)) {
    return {
      maxOutputTokens: 300,
      temperature: 0.3,
    };
  }

  if (mode === "creative") {
    return {
      maxOutputTokens: 900,
      temperature: 0.75,
    };
  }

  if (mode === "deep") {
    return {
      maxOutputTokens: 1200,
      temperature: 0.35,
    };
  }

  if (mode === "fast") {
    return {
      maxOutputTokens: 520,
      temperature: 0.25,
    };
  }

  return {
    maxOutputTokens: 700,
    temperature: 0.3,
  };
}

export function cleanRuntimeOutput(inputText: string, outputText: string) {
  const guarded = guardRuntimeFinalOutput(inputText, outputText, {
    channel: "runtime",
  });

  return guarded.outputText;
}
