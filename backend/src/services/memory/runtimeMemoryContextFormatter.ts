import type {
    MemoryRuntimeScopeResolvedItem,
    MemoryRuntimeScopeResolveResult,
  } from "./memoryRuntimeScopeResolver";
  
  export type RuntimeMemoryContextSummary = {
    injected: boolean;
    itemCount: number;
    totalChars: number;
    usedMemoryIds: string[];
    usedMemoryTypes: string[];
    usedMemoryScopes: string[];
    usedMemorySources: string[];
  };
  
  export type RuntimeMemoryContextBuildResult = {
    contextBlock: string;
    summary: RuntimeMemoryContextSummary;
  };
  
  type RuntimeMemoryContextFormatterOptions = {
    maxItems?: number;
    maxTotalChars?: number;
    maxCharsPerMemory?: number;
  };
  
  const DEFAULT_MAX_ITEMS = 3;
  const DEFAULT_MAX_TOTAL_CHARS = 1500;
  const DEFAULT_MAX_CHARS_PER_MEMORY = 430;
  
  function normalizeWhitespace(value: string) {
    return value
      .replace(/\r/g, "")
      .replace(/[ \t]+/g, " ")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join(" ")
      .trim();
  }
  
  function sanitizeMemoryContent(value: string) {
    return normalizeWhitespace(value)
      .replace(/```/g, "")
      .replace(/\b(system|developer|assistant|user)\s*:/gi, "$1 note:")
      .trim();
  }
  
  function truncateText(value: string, maxChars: number) {
    if (value.length <= maxChars) {
      return value;
    }
  
    const slice = value.slice(0, maxChars);
  
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
  
  function shouldUseMemory(memory: MemoryRuntimeScopeResolvedItem) {
    return memory.runtimeInjectable;
  }
  
  function formatMemoryLine(
    memory: MemoryRuntimeScopeResolvedItem,
    index: number,
    maxCharsPerMemory: number
  ) {
    const content = truncateText(
      sanitizeMemoryContent(memory.content),
      maxCharsPerMemory
    );
  
    const skillHint =
      memory.linkedSkillNames.length > 0
        ? ` Linked skills: ${memory.linkedSkillNames.join(", ")}.`
        : "";
  
    return [
      `Memory ${index + 1}:`,
      `[type=${memory.type}; scope=${memory.scope}; owner=${
        memory.ownerAgentName || memory.agentName
      }; sensitivity=${memory.sensitivityLevel}]`,
      content,
      skillHint,
    ]
      .filter(Boolean)
      .join(" ");
  }
  
  export function buildRuntimeMemoryContextBlock(
    memoryContext: MemoryRuntimeScopeResolveResult | null | undefined,
    options: RuntimeMemoryContextFormatterOptions = {}
  ): RuntimeMemoryContextBuildResult {
    const maxItems = options.maxItems || DEFAULT_MAX_ITEMS;
    const maxTotalChars = options.maxTotalChars || DEFAULT_MAX_TOTAL_CHARS;
    const maxCharsPerMemory =
      options.maxCharsPerMemory || DEFAULT_MAX_CHARS_PER_MEMORY;
  
    if (!memoryContext || memoryContext.memories.length === 0) {
      return {
        contextBlock: "",
        summary: {
          injected: false,
          itemCount: 0,
          totalChars: 0,
          usedMemoryIds: [],
          usedMemoryTypes: [],
          usedMemoryScopes: [],
          usedMemorySources: [],
        },
      };
    }
  
    const usableMemories = memoryContext.memories
      .filter(shouldUseMemory)
      .slice(0, maxItems);
  
    if (usableMemories.length === 0) {
      return {
        contextBlock: "",
        summary: {
          injected: false,
          itemCount: 0,
          totalChars: 0,
          usedMemoryIds: [],
          usedMemoryTypes: [],
          usedMemoryScopes: [],
          usedMemorySources: [],
        },
      };
    }
  
    const header = [
      "Runtime memory context:",
      "Use the following scoped memories only as background context for this answer.",
      "Do not mention Memory Vault, memory IDs, scores, metadata, source references, or internal retrieval details to the user.",
      "If memory context is not relevant to the user's request, ignore it.",
    ].join("\n");
  
    const memoryLines: string[] = [];
  
    let currentLength = header.length;
  
    for (const memory of usableMemories) {
      const nextLine = formatMemoryLine(
        memory,
        memoryLines.length,
        maxCharsPerMemory
      );
  
      if (currentLength + nextLine.length > maxTotalChars) {
        break;
      }
  
      memoryLines.push(nextLine);
      currentLength += nextLine.length;
    }
  
    if (memoryLines.length === 0) {
      return {
        contextBlock: "",
        summary: {
          injected: false,
          itemCount: 0,
          totalChars: 0,
          usedMemoryIds: [],
          usedMemoryTypes: [],
          usedMemoryScopes: [],
          usedMemorySources: [],
        },
      };
    }
  
    const usedMemories = usableMemories.slice(0, memoryLines.length);
    const contextBlock = [header, "", memoryLines.join("\n")].join("\n").trim();
  
    return {
      contextBlock,
      summary: {
        injected: true,
        itemCount: memoryLines.length,
        totalChars: contextBlock.length,
        usedMemoryIds: usedMemories.map((memory) => memory.id),
        usedMemoryTypes: usedMemories.map((memory) => memory.type),
        usedMemoryScopes: usedMemories.map((memory) => memory.scope),
        usedMemorySources: usedMemories.map(
          (memory) => memory.sourceRef || memory.sourceType
        ),
      },
    };
  }