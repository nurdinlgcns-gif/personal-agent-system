import { useEffect, useMemo, useRef, useState } from "react";
import { sendManualTask } from "../../services/api";
import {
  fetchDynamicLlmProviders,
  type DynamicLlmProvider,
  type LlmModelMode,
} from "../../services/llmApi";
import type {
  AgentSnapshot,
  ManualTaskRuntimeMemoryContext,
  SkillSnapshot,
} from "../../types/api";
import { RuntimeMemoryContextDisplay } from "../runtime/RuntimeMemoryContextDisplay";

type FloatingTaskAssistantProps = {
  onTaskSent: () => Promise<void>;
  agents: AgentSnapshot[];
  skills: SkillSnapshot[];
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  timestamp: string;
  status?: "normal" | "error";
  runtimeMemoryContext?: ManualTaskRuntimeMemoryContext | null;
};

type Suggestion = {
  label: string;
  message: string;
};

type MentionQuery = {
  query: string;
  startIndex: number;
  endIndex: number;
};

type RuntimeModelSelection = {
  id: string;
  providerId: string | null;
  providerName: string;
  providerType: string;
  model: string;
  mode: LlmModelMode;
  label: string;
};

const PREFERRED_AGENT_ORDER = [
  "design-agent",
  "writer-agent",
  "image-agent",
  "code-agent",
  "research-agent",
  "qa-agent",
];

const MODEL_SELECTION_STORAGE_KEY = "floating-assistant-model-selection";

const AUTO_MODEL_SELECTION: RuntimeModelSelection = {
  id: "auto",
  providerId: null,
  providerName: "Auto",
  providerType: "auto",
  model: "auto",
  mode: "auto",
  label: "Auto",
};

function createMessage(
  role: ChatMessage["role"],
  text: string,
  status: ChatMessage["status"] = "normal",
  runtimeMemoryContext?: ManualTaskRuntimeMemoryContext | null
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    text,
    timestamp: new Date().toISOString(),
    status,
    runtimeMemoryContext,
  };
}

function sortAgentsForMention(agents: AgentSnapshot[]) {
  return [...agents].sort((firstAgent, secondAgent) => {
    const firstIndex = PREFERRED_AGENT_ORDER.indexOf(firstAgent.name);
    const secondIndex = PREFERRED_AGENT_ORDER.indexOf(secondAgent.name);

    const safeFirstIndex =
      firstIndex === -1 ? PREFERRED_AGENT_ORDER.length + 1 : firstIndex;
    const safeSecondIndex =
      secondIndex === -1 ? PREFERRED_AGENT_ORDER.length + 1 : secondIndex;

    if (safeFirstIndex !== safeSecondIndex) {
      return safeFirstIndex - safeSecondIndex;
    }

    return firstAgent.name.localeCompare(secondAgent.name);
  });
}

function buildAvailableAgentsText(agents: AgentSnapshot[]) {
  if (agents.length === 0) {
    return "AI Task Assistant ready. No registered agents found yet.";
  }

  const agentMentions = agents.map((agent) => `@${agent.name}`).join(", ");

  return `AI Task Assistant ready. Available agents: ${agentMentions}.`;
}

function buildSuggestions(
  agents: AgentSnapshot[],
  skills: SkillSnapshot[]
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  const designAgent = agents.find((agent) => agent.name === "design-agent");

  const designSkill = skills.find(
    (skill) =>
      skill.agentName === "design-agent" &&
      skill.name === "generate_ad_copy"
  );

  if (designAgent && designSkill) {
    suggestions.push({
      label: "Ad copy",
      message: "@design-agent buatkan 3 variasi ad copy untuk produk kopi susu",
    });

    suggestions.push({
      label: "Caption",
      message: "@design-agent buatkan 3 variasi caption iklan yang singkat",
    });

    suggestions.push({
      label: "Running shoes",
      message: "@design-agent create an ad copy for running shoes",
    });
  }

  skills.forEach((skill) => {
    const alreadyExists = suggestions.some(
      (suggestion) => suggestion.label === skill.name
    );

    if (alreadyExists) {
      return;
    }

    suggestions.push({
      label: skill.name.replace(/_/g, " "),
      message: `@${skill.agentName} gunakan skill ${skill.name} untuk membuat output singkat`,
    });
  });

  agents.forEach((agent) => {
    const alreadyExists = suggestions.some((suggestion) =>
      suggestion.message.startsWith(`@${agent.name}`)
    );

    if (alreadyExists) {
      return;
    }

    suggestions.push({
      label: agent.name,
      message: `@${agent.name} halo`,
    });
  });

  return suggestions.slice(0, 6);
}

function getMentionQuery(
  message: string,
  cursorPosition: number
): MentionQuery | null {
  const textBeforeCursor = message.slice(0, cursorPosition);
  const match = textBeforeCursor.match(/(^|\s)@([\w-]*)$/);

  if (!match) {
    return null;
  }

  const fullMatch = match[0];
  const query = match[2] || "";
  const atIndexInMatch = fullMatch.lastIndexOf("@");
  const startIndex =
    textBeforeCursor.length - fullMatch.length + atIndexInMatch;

  return {
    query,
    startIndex,
    endIndex: cursorPosition,
  };
}

function hasAgentMention(message: string) {
  return /(^|\s)@[\w-]+(\s|$)/i.test(message.trim());
}

function normalizeMode(mode?: string): LlmModelMode {
  if (
    mode === "auto" ||
    mode === "fast" ||
    mode === "deep" ||
    mode === "creative"
  ) {
    return mode;
  }

  return "auto";
}

function buildRuntimeModelSelections(
  providers: DynamicLlmProvider[]
): RuntimeModelSelection[] {
  const selections: RuntimeModelSelection[] = [AUTO_MODEL_SELECTION];

  providers
    .filter((provider) => provider.enabled)
    .forEach((provider) => {
      if (provider.modelAliases.length === 0) {
        selections.push({
          id: `${provider.id}:${provider.defaultModel || "auto"}:auto`,
          providerId: provider.id,
          providerName: provider.name,
          providerType: provider.type,
          model: provider.defaultModel || "auto",
          mode: "auto",
          label: `${provider.name} · ${provider.defaultModel || "auto"}`,
        });

        return;
      }

      provider.modelAliases.forEach((modelAlias) => {
        const mode = normalizeMode(modelAlias.mode);

        selections.push({
          id: `${provider.id}:${modelAlias.id}:${mode}`,
          providerId: provider.id,
          providerName: provider.name,
          providerType: provider.type,
          model: modelAlias.id,
          mode,
          label: `${provider.name} · ${modelAlias.label || modelAlias.id}`,
        });
      });
    });

  return selections;
}

function getSavedModelSelectionId() {
  return localStorage.getItem(MODEL_SELECTION_STORAGE_KEY) || "auto";
}

export function FloatingTaskAssistant({
  onTaskSent,
  agents,
  skills,
}: FloatingTaskAssistantProps) {
  const sortedAgents = useMemo(() => sortAgentsForMention(agents), [agents]);

  const availableAgentsText = useMemo(
    () => buildAvailableAgentsText(sortedAgents),
    [sortedAgents]
  );

  const suggestions = useMemo(
    () => buildSuggestions(sortedAgents, skills),
    [sortedAgents, skills]
  );

  const defaultMessage = useMemo(() => {
    if (suggestions.length > 0) {
      return suggestions[0].message;
    }

    if (sortedAgents.length > 0) {
      return `@${sortedAgents[0].name} halo`;
    }

    return "@design-agent halo";
  }, [sortedAgents, suggestions]);

  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState(defaultMessage);
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage("system", availableAgentsText),
  ]);

  const [mentionQuery, setMentionQuery] = useState<MentionQuery | null>(null);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);

  const [runtimeProviders, setRuntimeProviders] = useState<
    DynamicLlmProvider[]
  >([]);
  const [isModelRegistryLoading, setIsModelRegistryLoading] = useState(false);
  const [modelRegistryError, setModelRegistryError] = useState<string | null>(
    null
  );
  const [selectedModelSelectionId, setSelectedModelSelectionId] = useState(
    getSavedModelSelectionId
  );

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const modelSelections = useMemo(
    () => buildRuntimeModelSelections(runtimeProviders),
    [runtimeProviders]
  );

  const selectedModelSelection =
    modelSelections.find(
      (selection) => selection.id === selectedModelSelectionId
    ) || AUTO_MODEL_SELECTION;

  const mentionAgents = useMemo(() => {
    if (!mentionQuery) {
      return [];
    }

    const normalizedQuery = mentionQuery.query.toLowerCase();

    return sortedAgents
      .filter((agent) => agent.name.toLowerCase().includes(normalizedQuery))
      .slice(0, 6);
  }, [mentionQuery, sortedAgents]);

  const shouldShowMentionPopup =
    mentionQuery !== null && mentionAgents.length > 0;

  async function loadRuntimeProviders() {
    try {
      setIsModelRegistryLoading(true);
      setModelRegistryError(null);

      const response = await fetchDynamicLlmProviders();
      setRuntimeProviders(response.providers);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load model registry";

      setModelRegistryError(message);
    } finally {
      setIsModelRegistryLoading(false);
    }
  }

  useEffect(() => {
    loadRuntimeProviders();
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    loadRuntimeProviders();
  }, [isOpen]);

  useEffect(() => {
    setMessages((currentMessages) => {
      const firstMessage = currentMessages[0];

      if (firstMessage?.role === "system") {
        return [
          {
            ...firstMessage,
            text: availableAgentsText,
            timestamp: new Date().toISOString(),
          },
          ...currentMessages.slice(1),
        ];
      }

      return [createMessage("system", availableAgentsText), ...currentMessages];
    });
  }, [availableAgentsText]);

  useEffect(() => {
    setMessage((currentMessage) => {
      if (!currentMessage || currentMessage === "@design-agent halo") {
        return defaultMessage;
      }

      return currentMessage;
    });
  }, [defaultMessage]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, isOpen]);

  useEffect(() => {
    if (!shouldShowMentionPopup) {
      setActiveMentionIndex(0);
      return;
    }

    setActiveMentionIndex((currentIndex) => {
      if (currentIndex >= mentionAgents.length) {
        return 0;
      }

      return currentIndex;
    });
  }, [mentionAgents.length, shouldShowMentionPopup]);

  useEffect(() => {
    const selectedExists = modelSelections.some(
      (selection) => selection.id === selectedModelSelectionId
    );

    if (!selectedExists) {
      setSelectedModelSelectionId("auto");
      localStorage.setItem(MODEL_SELECTION_STORAGE_KEY, "auto");
    }
  }, [modelSelections, selectedModelSelectionId]);

  function handleModelSelectionChange(nextSelectionId: string) {
    setSelectedModelSelectionId(nextSelectionId);
    localStorage.setItem(MODEL_SELECTION_STORAGE_KEY, nextSelectionId);
  }

  function updateMentionQuery(nextMessage: string, cursorPosition: number) {
    const nextMentionQuery = getMentionQuery(nextMessage, cursorPosition);
    setMentionQuery(nextMentionQuery);
  }

  function handleTextareaChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const nextMessage = event.target.value;
    const cursorPosition = event.target.selectionStart;

    setMessage(nextMessage);
    updateMentionQuery(nextMessage, cursorPosition);
  }

  function insertAgentMention(agentName: string) {
    const textarea = textareaRef.current;

    if (!mentionQuery || !textarea) {
      return;
    }

    const mentionText = `@${agentName} `;
    const nextMessage =
      message.slice(0, mentionQuery.startIndex) +
      mentionText +
      message.slice(mentionQuery.endIndex);

    const nextCursorPosition = mentionQuery.startIndex + mentionText.length;

    setMessage(nextMessage);
    setMentionQuery(null);
    setActiveMentionIndex(0);

    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCursorPosition, nextCursorPosition);
    });
  }

  async function handleSendTask() {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage("assistant", "Message wajib diisi.", "error"),
      ]);
      return;
    }

    if (!hasAgentMention(trimmedMessage)) {
      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage(
          "assistant",
          "Message harus menyertakan mention agent, contoh: @design-agent halo",
          "error"
        ),
      ]);
      return;
    }

    try {
      setIsSending(true);

      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage("user", trimmedMessage),
      ]);

      setMessage("");
      setMentionQuery(null);

      const response = await sendManualTask({
        inputText: trimmedMessage,
        modelPreference: {
          providerId: selectedModelSelection.providerId,
          provider: selectedModelSelection.providerType,
          model: selectedModelSelection.model,
          mode: selectedModelSelection.mode,
        },
      });

      const runtimeText = response.runtimeProvider
        ? `\n\nRuntime: ${response.runtimeProvider.providerName || "auto"
        } / ${response.runtimeProvider.model || "auto"} (${response.runtimeProvider.mode || "auto"
        })`
        : "";

      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage(
          "assistant",
          `${response.result}${runtimeText}`,
          "normal",
          response.runtimeMemoryContext || null
        ),
      ]);

      await onTaskSent();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send manual task";

      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage("assistant", errorMessage, "error"),
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (shouldShowMentionPopup) {
      if (event.key === "ArrowDown") {
        event.preventDefault();

        setActiveMentionIndex((currentIndex) =>
          currentIndex + 1 >= mentionAgents.length ? 0 : currentIndex + 1
        );

        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();

        setActiveMentionIndex((currentIndex) =>
          currentIndex - 1 < 0 ? mentionAgents.length - 1 : currentIndex - 1
        );

        return;
      }

      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();

        const selectedAgent = mentionAgents[activeMentionIndex];

        if (selectedAgent) {
          insertAgentMention(selectedAgent.name);
        }

        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setMentionQuery(null);
        setActiveMentionIndex(0);
        return;
      }
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendTask();
    }
  }

  function handleTextareaClick(event: React.MouseEvent<HTMLTextAreaElement>) {
    const target = event.currentTarget;
    updateMentionQuery(target.value, target.selectionStart);
  }

  function handleTextareaKeyUp(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "ArrowLeft" ||
      event.key === "ArrowRight" ||
      event.key === "Home" ||
      event.key === "End"
    ) {
      const target = event.currentTarget;
      updateMentionQuery(target.value, target.selectionStart);
    }
  }

  function clearChat() {
    setMessages([createMessage("system", availableAgentsText)]);
  }

  return (
    <>
      <button
        className={`floating-task-button ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen((current) => !current)}
        aria-label="Open AI Task Assistant"
      >
        <span className="floating-task-pulse" />
        <span className="floating-task-icon">🤖</span>
      </button>

      {isOpen && (
        <section className="floating-task-panel">
          <header className="floating-task-header">
            <div className="floating-task-title">
              <div className="floating-task-avatar">🤖</div>

              <div>
                <strong>AI Task Assistant</strong>
                <p>
                  {agents.length > 0
                    ? `${agents.length} agent available`
                    : "Waiting for agents"}
                </p>
              </div>
            </div>

            <button
              className="floating-task-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close AI Task Assistant"
            >
              ×
            </button>
          </header>

          <div className="floating-task-status">
            <span className="floating-task-status-dot" />
            Connected to backend orchestrator
          </div>

          <div className="floating-task-model-selector">
            <div>
              <label htmlFor="floating-task-model-select">Runtime Model</label>
              <small>
                Agent via @mention. Provider/model preference is sent with this
                task.
              </small>
            </div>

            <select
              id="floating-task-model-select"
              value={selectedModelSelection.id}
              onChange={(event) =>
                handleModelSelectionChange(event.target.value)
              }
              disabled={isModelRegistryLoading}
            >
              {modelSelections.map((selection) => (
                <option key={selection.id} value={selection.id}>
                  {selection.label}
                </option>
              ))}
            </select>
          </div>

          <div className="floating-task-model-preview">
            <span>
              {isModelRegistryLoading
                ? "Loading provider registry..."
                : modelRegistryError
                  ? "Provider registry unavailable"
                  : `${selectedModelSelection.providerName} · ${selectedModelSelection.model}`}
            </span>

            <small>
              Type: {selectedModelSelection.providerType} · Mode:{" "}
              {selectedModelSelection.mode}
            </small>
          </div>

          <div className="floating-task-messages">
            {messages.map((chatMessage) => (
              <div
                key={chatMessage.id}
                className={`chat-message ${chatMessage.role} ${chatMessage.status === "error" ? "error" : ""
                  }`}
              >
                <div className="chat-bubble">
                  <p>{chatMessage.text}</p>

                  {chatMessage.role === "assistant" &&
                    chatMessage.runtimeMemoryContext && (
                      <RuntimeMemoryContextDisplay
                        runtimeMemoryContext={chatMessage.runtimeMemoryContext}
                      />
                    )}

                  <small>
                    {new Date(chatMessage.timestamp).toLocaleTimeString()}
                  </small>
                </div>
              </div>
            ))}

            {isSending && (
              <div className="chat-message assistant">
                <div className="chat-bubble typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="floating-task-suggestions">
            {suggestions.length === 0 ? (
              <button onClick={() => setMessage("@design-agent halo")}>
                Default command
              </button>
            ) : (
              suggestions.map((suggestion) => (
                <button
                  key={`${suggestion.label}-${suggestion.message}`}
                  onClick={() => {
                    setMessage(suggestion.message);
                    setMentionQuery(null);
                  }}
                >
                  {suggestion.label}
                </button>
              ))
            )}
          </div>

          <footer className="floating-task-input-area">
            <div className="floating-task-input-wrap">
              {shouldShowMentionPopup && (
                <div className="floating-task-mention-popover">
                  <div className="mention-popover-title">Select agent</div>

                  {mentionAgents.map((agent, index) => (
                    <button
                      type="button"
                      key={agent.id}
                      className={`mention-agent-option ${index === activeMentionIndex ? "active" : ""
                        }`}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        insertAgentMention(agent.name);
                      }}
                    >
                      <span>@{agent.name}</span>
                      <small>{agent.status}</small>
                    </button>
                  ))}
                </div>
              )}

              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleTextareaChange}
                onClick={handleTextareaClick}
                onKeyDown={handleKeyDown}
                onKeyUp={handleTextareaKeyUp}
                placeholder="@design-agent create an ad copy..."
                rows={2}
              />
            </div>

            <div className="floating-task-actions">
              <button
                className="floating-task-clear"
                onClick={clearChat}
                disabled={isSending}
              >
                Clear
              </button>

              <button
                className="floating-task-send"
                onClick={handleSendTask}
                disabled={isSending}
              >
                {isSending ? "Sending..." : "Send"}
              </button>
            </div>
          </footer>
        </section>
      )}
    </>
  );
}