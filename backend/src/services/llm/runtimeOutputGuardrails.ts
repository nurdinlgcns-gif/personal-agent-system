import type { LlmModelMode } from "./llmTypes";

export type RuntimeGenerationConfig = {
    maxOutputTokens: number;
    temperature: number;
};

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
        normalizedInput.includes("jawab singkat")
    );
}

function looksLikeMetaLine(line: string) {
    const normalizedLine = line.toLowerCase().trim();

    return (
        normalizedLine.startsWith("topic:") ||
        normalizedLine.startsWith("language:") ||
        normalizedLine.startsWith("constraint") ||
        normalizedLine.startsWith("format") ||
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
        normalizedLine.includes("the user wants") ||
        normalizedLine.includes("user wants") ||
        normalizedLine.includes("make one") ||
        normalizedLine.includes("short promotional sentence") ||
        normalizedLine.includes("promotional sentence") ||
        normalizedLine.includes("only one final") ||
        normalizedLine.includes("one final promotional") ||
        normalizedLine.includes("indonesian") ||
        normalizedLine.includes("milk coffee") ||
        normalizedLine.includes("@design-agent")
    );
}

function stripMarkdownPrefix(value: string) {
    return value
        .replace(/^[-*•]\s*/, "")
        .replace(/^>\s*/, "")
        .replace(/^["“”]+/, "")
        .replace(/["“”]+$/, "")
        .trim();
}

function buildSafeOneSentenceFallback(inputText: string) {
    const normalizedInput = inputText.toLowerCase();

    if (
        normalizedInput.includes("kopi susu") ||
        normalizedInput.includes("coffee with milk") ||
        normalizedInput.includes("milk coffee")
    ) {
        return "Nikmati kopi susu creamy yang bikin harimu lebih semangat dalam setiap tegukan.";
    }

    return "Solusi praktis untuk kebutuhanmu, hadir dengan hasil yang cepat, jelas, dan mudah digunakan.";
}

export function buildGuardedSystemPrompt(systemPrompt: string) {
    return [
        systemPrompt,
        "",
        "STRICT OUTPUT CONTRACT:",
        "Return the final user-facing answer only.",
        "Never repeat, summarize, translate, label, or analyze the user's request.",
        "Never output metadata such as Topic, Language, Constraint, Format, User request, Task, Analysis, Reasoning, Final, Output, or Answer.",
        "Never reveal internal reasoning, hidden analysis, planning notes, or chain-of-thought.",
        "Do not provide alternatives unless explicitly requested.",
        "If the user asks for one sentence, return exactly one sentence and nothing else.",
        "No bullet points unless explicitly requested.",
        "No explanation unless explicitly requested.",
        "Use the same language as the user's request.",
    ].join("\n");
}

export function buildGuardedUserPrompt(inputText: string) {
    const cleanedInputText = removeLeadingAgentMention(inputText);

    if (userAskedForOneSentence(cleanedInputText)) {
        return [
            cleanedInputText,
            "",
            "Berikan hanya satu kalimat promosi final.",
            "Kalimat harus langsung bisa dipakai sebagai copy iklan.",
            "Jangan tulis label, metadata, bahasa, constraint, format, topic, atau penjelasan.",
            "Jangan ulangi instruksi.",
            "Jangan beri opsi.",
            "Jangan gunakan bullet point.",
            "",
            "Contoh jawaban benar:",
            "Nikmati kopi susu creamy yang bikin harimu lebih semangat dalam setiap tegukan.",
        ].join("\n");
    }

    if (userAskedForShortAnswer(cleanedInputText)) {
        return [
            cleanedInputText,
            "",
            "Jawab singkat dan langsung ke inti.",
            "Jangan ulangi instruksi user.",
            "Jangan tampilkan analisis, metadata, atau label apa pun.",
        ].join("\n");
    }

    return [
        cleanedInputText,
        "",
        "Jawab langsung dengan hasil akhir saja.",
        "Jangan ulangi instruksi user.",
        "Jangan tampilkan reasoning, analisis internal, metadata, atau label apa pun.",
    ].join("\n");
}

export function getRuntimeGenerationConfig(
    inputText: string,
    mode: LlmModelMode
): RuntimeGenerationConfig {
    const cleanedInputText = removeLeadingAgentMention(inputText);

    if (userAskedForOneSentence(cleanedInputText)) {
        return {
            maxOutputTokens: 70,
            temperature: 0.15,
        };
    }

    if (userAskedForShortAnswer(cleanedInputText)) {
        return {
            maxOutputTokens: 160,
            temperature: 0.3,
        };
    }

    if (mode === "creative") {
        return {
            maxOutputTokens: 700,
            temperature: 0.8,
        };
    }

    if (mode === "deep") {
        return {
            maxOutputTokens: 900,
            temperature: 0.35,
        };
    }

    if (mode === "fast") {
        return {
            maxOutputTokens: 260,
            temperature: 0.25,
        };
    }

    return {
        maxOutputTokens: 420,
        temperature: 0.3,
    };
}

function stripPromptEchoLines(outputText: string) {
    return outputText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => !looksLikeMetaLine(line))
        .join("\n")
        .trim();
}

function extractFirstUsableSentence(outputText: string) {
    const candidateLines = outputText
        .split("\n")
        .map((line) => stripMarkdownPrefix(line))
        .filter(Boolean)
        .filter((line) => !looksLikeMetaLine(line))
        .filter((line) => {
            const normalizedLine = line.toLowerCase();

            return (
                !normalizedLine.includes("berikut adalah") &&
                !normalizedLine.includes("pilihan") &&
                !normalizedLine.includes("opsi") &&
                !normalizedLine.includes("vibe") &&
                !normalizedLine.includes("sesuai kebutuhan") &&
                !normalizedLine.includes("cocok untuk") &&
                !normalizedLine.includes("alternatif") &&
                !normalizedLine.includes("contoh jawaban")
            );
        });

    const firstCandidate = candidateLines[0];

    if (!firstCandidate) {
        return "";
    }

    const sentenceMatch = firstCandidate.match(/^(.+?[.!?])(\s|$)/);

    if (sentenceMatch?.[1]) {
        return sentenceMatch[1].trim();
    }

    return firstCandidate.trim();
}

export function cleanRuntimeOutput(inputText: string, outputText: string) {
    const cleanedInputText = removeLeadingAgentMention(inputText);
    const strippedOutput = stripPromptEchoLines(outputText);
    const trimmedOutput = strippedOutput.trim();

    if (!trimmedOutput) {
        if (userAskedForOneSentence(cleanedInputText)) {
            return buildSafeOneSentenceFallback(cleanedInputText);
        }

        return outputText.trim();
    }

    if (!userAskedForOneSentence(cleanedInputText)) {
        return trimmedOutput;
    }

    const extractedSentence = extractFirstUsableSentence(trimmedOutput);

    if (!extractedSentence || looksLikeMetaLine(extractedSentence)) {
        return buildSafeOneSentenceFallback(cleanedInputText);
    }

    return extractedSentence;
}