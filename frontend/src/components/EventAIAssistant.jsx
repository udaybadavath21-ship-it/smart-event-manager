import React, { useState, useEffect, useRef } from "react";
import api from "../api";
import "./EventAIAssistant.css";

const SUGGESTED_QUESTIONS = [
  { icon: "🎯", text: "Give me today's event summary" },
  { icon: "👥", text: "How many attendees checked in?" },
  { icon: "🏢", text: "Which venue is best for 300 people?" },
  { icon: "📅", text: "Are there any scheduling conflicts?" },
  { icon: "🚨", text: "Show high-priority incidents" },
  { icon: "🎤", text: "Which speaker is suitable for an AI session?" },
];

export default function EventAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, loading]);

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg = {
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      // Send conversation history to backend
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await api.post("/ai-assistant/chat", {
        message: query,
        history: historyPayload,
      });

      const aiResponseText = res.data?.response || "No response text received.";
      const aiMsg = {
        role: "assistant",
        content: aiResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("AI Assistant Chat Error:", err);
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }
      const errorMsg = {
        role: "assistant",
        content: "⚠️ **Connection Error**: Unable to reach the AI Assistant service. Please try again later.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };


  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  // Helper to render basic markdown formatting (bold **, bullets •, lines \n)
  const formatText = (content) => {
    if (!content) return "";
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      // Replace **text** with <strong>text</strong>
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedLine = parts.map((part, pIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      return (
        <span key={idx}>
          {formattedLine}
          {idx < lines.length - 1 && <br />}
        </span>
      );
    });
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          className="ai-chat-toggle-btn"
          onClick={() => setIsOpen(true)}
          title="Open Event AI Assistant"
        >
          <span>🤖</span>
          <span>AI Assistant</span>
        </button>
      )}

      {/* Floating Chat Modal Window */}
      {isOpen && (
        <div className="ai-chat-window">
          {/* Header */}
          <div className="ai-chat-header">
            <div className="ai-chat-header-info">
              <div className="ai-chat-avatar">🤖</div>
              <div>
                <h3 className="ai-chat-title">Event AI Assistant</h3>
                <div className="ai-chat-subtitle">
                  <span className="ai-chat-status-dot"></span> Online & Synchronized
                </div>
              </div>
            </div>
            <div className="ai-chat-header-actions">
              {messages.length > 0 && (
                <button
                  className="ai-chat-icon-btn"
                  onClick={clearChat}
                  title="Clear Chat History"
                >
                  🗑️
                </button>
              )}
              <button
                className="ai-chat-icon-btn"
                onClick={() => setIsOpen(false)}
                title="Close Chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="ai-chat-body">
            {messages.length === 0 ? (
              <div className="ai-chat-empty-state">
                <div className="ai-chat-welcome-icon">👋</div>
                <h4 className="ai-chat-welcome-title">How can I help you today?</h4>
                <p className="ai-chat-welcome-desc">
                  Ask me anything about attendees, venues, speakers, schedules, incidents, sponsors, or overall event analytics!
                </p>

                <div className="ai-chat-pills-title">Suggested Questions</div>
                <div className="ai-chat-pills-container">
                  {SUGGESTED_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      className="ai-chat-pill-btn"
                      onClick={() => handleSendMessage(q.text)}
                    >
                      <span>
                        <span style={{ marginRight: "8px" }}>{q.icon}</span>
                        {q.text}
                      </span>
                      <span className="ai-chat-pill-arrow">➔</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`ai-chat-msg-row ${
                    msg.role === "user" ? "ai-chat-msg-user" : "ai-chat-msg-ai"
                  }`}
                >
                  <div
                    className={`ai-chat-bubble ${
                      msg.role === "user"
                        ? "ai-chat-bubble-user"
                        : "ai-chat-bubble-ai"
                    }`}
                  >
                    {formatText(msg.content)}
                  </div>
                  <span className="ai-chat-msg-time">{msg.timestamp}</span>
                </div>
              ))
            )}

            {/* Loading Spinner */}
            {loading && (
              <div className="ai-chat-msg-row ai-chat-msg-ai">
                <div className="ai-chat-typing">
                  <div className="ai-chat-dot"></div>
                  <div className="ai-chat-dot"></div>
                  <div className="ai-chat-dot"></div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer & Input */}
          <div className="ai-chat-footer">
            <div className="ai-chat-input-wrapper">
              <input
                ref={inputRef}
                className="ai-chat-input"
                placeholder="Ask Event AI Assistant..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
            </div>
            <button
              className="ai-chat-send-btn"
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || loading}
              title="Send Message"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
