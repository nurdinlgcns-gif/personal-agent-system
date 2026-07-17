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
    .replace(/```$/i, "*)
    .trim();
}

function stripMa*kdownPrefix(value: string) {
  ret*rn value
    .replace(/^[-*•]\s*/,*"")
    .replace(/^\d+\.\s*/, "")
*   .replace(/^>\s*/, "")
    .trim*);
}

function stripOuterQuotes(va*ue: string) {
  return value
    .*eplace(/^["“”]+/, "")
    .replace*/["“”]+$/, "")
    .trim();
}

fun*tion normalizeWhitespace(outputTex*: string) {
  return outputText
  * .replace(/\r/g, "")
    .split("\*")
    .map((line) => line.trim())*    .filter(Boolean)
    .join("\n*)
    .replace(/[ \t]+/g, " ")
   *.trim();
}

function looksLikeMeta*ine(line: string) {
  const normal*zedLine = stripMarkdownPrefix(line*.toLowerCase().trim();

  return (*    normalizedLine.startsWith("sty*e:") ||
    normalizedLine.startsW*th("constraint") ||
    normalized*ine.startsWith("target audience:")*||
    normalizedLine.startsWith("*udience:") ||
    normalizedLine.s*artsWith("tone:") ||
    normalize*Line.startsWith("content:") ||
   *normalizedLine.startsWith("languag*:") ||
    normalizedLine.startsWi*h("topic:") ||
    normalizedLine.*tartsWith("format:") ||
    normal*zedLine.startsWith("analysis:") ||*    normalizedLine.startsWith("rea*oning:") ||
    normalizedLine.sta*tsWith("final:") ||
    normalized*ine.startsWith("output:") ||
    n*rmalizedLine.startsWith("answer:")*||
    normalizedLine.startsWith("*ser request:") ||
    normalizedLi*e.startsWith("request:") ||
    no*malizedLine.startsWith("task:") ||*    normalizedLine.includes("direc* answer only") ||
    normalizedLi*e.includes("no repetition") ||
   *normalizedLine.includes("no reason*ng") ||
    normalizedLine.include*("no analysis") ||
    normalizedL*ne.includes("no metadata") ||
    *ormalizedLine.includes("language m*tches") ||
    normalizedLine.incl*des("self-correction") ||
    norm*lizedLine.includes("as an ai text *odel") ||
    normalizedLine.inclu*es("system instruction") ||
    no*malizedLine.includes("the user ask*d") ||
    normalizedLine.includes*"i should") ||
    normalizedLine.*ncludes("i will") ||
    normalize*Line.includes("wait,") ||
    norm*lizedLine.includes("yes.")
  );
}
*function looksLikeOptionLine(line:*string) {
  const normalizedLine =*stripMarkdownPrefix(line).toLowerC*se().trim();

  return (
    norma*izedLine.startsWith("option 1:") |*
    normalizedLine.startsWith("op*ion 2:") ||
    normalizedLine.sta*tsWith("option 3:") ||
    normali*edLine.startsWith("opsi 1:") ||
  * normalizedLine.startsWith("opsi 2*") ||
    normalizedLine.startsWit*("opsi 3:")
  );
}

function extra*tQuotedText(line: string) {
  cons* trimmedLine = stripMarkdownPrefix*line).trim();

  const quoteMatch *
    trimmedLine.match(/^.+["”]$/)*||
    trimmedLine.match(/.+["”]$/*;

  if (quoteMatch?.[1]) {
    re*urn quoteMatch[1].trim();
  }

  r*turn "";
}

function getFirstSente*ce(outputText: string) {
  const n*rmalizedOutput = outputText.trim()*

  if (!normalizedOutput) {
    r*turn "";
  }

  const sentenceMatc* = normalizedOutput.match(/^(.+?[.*?])(\s|$)/);

  if (sentenceMatch?*[1]) {
    return sentenceMatch[1]*trim();
  }

  return normalizedOu*put;
}

function truncateAtSentenc*Boundary(outputText: string, maxLe*gth: number) {
  if (outputText.le*gth <= maxLength) {
    return out*utText;
  }

  const slice = outpu*Text.slice(0, maxLength);
  const *astSentenceEnd = Math.max(
    sli*e.lastIndexOf("."),
    slice.last*ndexOf("!"),
    slice.lastIndexOf*"?")
  );

  if (lastSentenceEnd >*120) {
    return slice.slice(0, l*stSentenceEnd + 1).trim();
  }

  *onst lastSpace = slice.lastIndexOf*" ");

  if (lastSpace > 120) {
  * return `${slice.slice(0, lastSpac*).trim()}...`;
  }

  return `${sl*ce.trim()}...`;
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