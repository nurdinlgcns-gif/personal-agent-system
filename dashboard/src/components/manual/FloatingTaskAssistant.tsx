import { useEffect, useMemo, useRef, useState } from "react";
import { sendManualTask } from "../../services/api";
import type { AgentSnapshot, SkillSnapshot } from "../../types/api";

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
};

type Suggestion = {
  label: string;
  message: string;
};

function createMessage(
  role: ChatMessage["role"],
  text: string,
  status: ChatMessage["status"] = "normal"
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    text,
    timestamp: new Date().toISOString(),
    status,
  };
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

export function FloatingTaskAssistant({
  onTaskSent,
  agents,
  skills,
}: FloatingTaskAssistantProps) {
  const availableAgentsText = useMemo(
    () => buildAvailableAgentsText(agents),
    [agents]
  );

  const suggestions = useMemo(
    () => buildSuggestions(agents, skills),
    [agents, skills]
  );

  const defaultMessage = useMemo(() => {
    if (suggestions.length > 0) {
      return suggestions[0].message;
    }

    if (agents.length > 0) {
      return `@${agents[0].name} halo`;
    }

    return "@design-agent halo";
  }, [agents, suggestions]);

  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState(defaultMessage);
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage("system", availableAgentsText),
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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

  async function handleSendTask() {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage("assistant", "Message wajib diisi.", "error"),
      ]);
      return;
    }

    if (!trimmedMessage.includes("@")) {
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

      const response = await sendManualTask(trimmedMessage);

      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage("assistant", response.result),
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
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendTask();
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

          <div className="floating-task-messages">
            {messages.map((chatMessage) => (
              <div
                key={chatMessage.id}
                className={`chat-message ${chatMessage.role} ${
                  chatMessage.status === "error" ? "error" : ""
                }`}
              >
                <div className="chat-bubble">
                  <p>{chatMessage.text}</p>
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
                  onClick={() => setMessage(suggestion.message)}
                >
                  {suggestion.label}
                </button>
              ))
            )}
          </div>

          <footer className="floating-task-input-area">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="@design-agent create an ad copy..."
              rows={2}
            />

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