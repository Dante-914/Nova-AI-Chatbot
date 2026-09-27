import { useState, useEffect } from "react";
import ChatWindow from "./components/ChatWindow.jsx";
import "./App.css";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState("");
  const [imageMode, setImageMode] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // ── Load history (stripped of stale file attachments) ──────
  useEffect(() => {
    const saved = localStorage.getItem("nova-chat-history");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Strip fileKey/fileName on load — prevents re-triggering
          // old vision requests when the page is refreshed
          const cleaned = parsed.map((m) => ({
            role: m.role,
            content: m.content,
            type: m.type,
          }));
          setMessages(cleaned);
        }
      } catch (e) {
        console.warn("Failed to parse chat history:", e);
        localStorage.removeItem("nova-chat-history");
      }
    }
  }, []);

  // ── Persist history (also stripped) ────────────────────────
  useEffect(() => {
    if (messages.length === 0) {
      localStorage.removeItem("nova-chat-history");
      return;
    }
    const trimmed = messages.slice(-55);
    if (trimmed.length !== messages.length) setMessages(trimmed);

    // Never persist fileKey — it can't be re-fetched after refresh anyway
    const cleanForStorage = trimmed.map((m) => ({
      role: m.role,
      content: m.content,
      type: m.type,
    }));

    localStorage.setItem("nova-chat-history", JSON.stringify(cleanForStorage));
  }, [messages]);

  // ── Upload helper ──────────────────────────────────────────
  async function handleFileUpload(file) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Upload failed");
    return res.json();
  }

  // ── Send message ───────────────────────────────────────────
  async function sendMessage(e) {
    e.preventDefault();
    const text = input.trim();
    if ((!text && !selectedFile) || isThinking) return;

    let fileKey = null;
    let fileName = null;

    if (selectedFile) {
      try {
        const uploadResult = await handleFileUpload(selectedFile);
        fileKey = uploadResult.key;
        fileName = uploadResult.filename;
      } catch (err) {
        console.error(err);
        setError("File upload failed. Please try again.");
        setIsThinking(false);
        return;
      }
    }

    const userMessage = {
      role: "user",
      content: text || `Uploaded: ${fileName}`,
      fileKey,   // only THIS message carries fileKey
      fileName,
    };

    // Strip fileKey/fileName from all PREVIOUS messages
    // Groq only accepts up to 3 images per request
    const cleanHistory = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const nextMessages = [...cleanHistory, userMessage];

    setMessages([...messages, userMessage]);
    setInput("");
    setSelectedFile(null);
    setError("");
    setIsThinking(true);

    try {
      if (imageMode) {
        // ── Image generation (Pollinations) ─────────────
        const encoded = encodeURIComponent(text);
        const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&enhance=true&model=flux`;

        await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = resolve;
          img.onerror = reject;
          img.src = imageUrl;
        });

        setMessages((prev) => [
          ...prev,
          { role: "assistant", type: "image", content: imageUrl },
        ]);
      } else {
        // ── Chat completion (Groq) ──────────────────────
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: nextMessages }),
        });

        if (!res.ok) {
          // Try to read the error body for better messaging
          let errBody = "";
          try {
            errBody = await res.text();
          } catch {}
          throw new Error(errBody || `HTTP ${res.status}`);
        }

        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply },
        ]);
      }
    } catch (err) {
      console.error(err);
      const msg = err.message || "";
      let friendly = "Something went wrong. Please try again.";

      if (msg.includes("Too many images") || msg.includes("images provided")) {
        friendly =
          "I can only look at up to 3 images at a time. Start a new chat or send the image by itself.";
      } else if (msg.includes("rate_limit") || msg.includes("429")) {
        friendly =
          "I'm getting too many requests right now. Please wait a moment and try again.";
      } else if (msg.includes("model_not_found") || msg.includes("404")) {
        friendly =
          "The AI model isn't available right now. Please try again later.";
      } else if (
        msg.toLowerCase().includes("token") ||
        msg.toLowerCase().includes("too long")
      ) {
        friendly =
          "This message is too long. Try shortening it or starting a new chat.";
      } else if (msg.includes("500") || msg.includes("502")) {
        friendly =
          "The AI service is having issues. Please try again in a minute.";
      } else if (msg.includes("401")) {
        friendly =
          "There's a configuration issue with the AI service. Please contact the site owner.";
      } else if (msg.includes("413") || msg.includes("too large")) {
        friendly = "That file is too large. Please try a smaller one.";
      }

      setError(friendly);
    } finally {
      setIsThinking(false);
    }
  }

  // ── Clear chat ─────────────────────────────────────────────
  function clearChat() {
    setMessages([]);
    setError("");
    setSelectedFile(null);
    localStorage.removeItem("nova-chat-history");
  }

  // ── Download chat ──────────────────────────────────────────
  function downloadChat() {
    const blob = new Blob([JSON.stringify(messages, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nova-chat-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__brand">
          <span className="app-header__mark">N</span>
          <div>
            <p className="app-header__title">Nova</p>
            <p className="app-header__subtitle">
              AI assistant &middot; built by Daniel Udensi
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            className="app-header__clear"
            onClick={downloadChat}
            disabled={messages.length === 0}
          >
            Download
          </button>
          <button
            type="button"
            className="app-header__clear"
            onClick={clearChat}
            disabled={messages.length === 0}
          >
            Clear chat
          </button>
        </div>
      </header>

      <main className="app-main">
        <ChatWindow messages={messages} isThinking={isThinking} error={error} />
      </main>

      {selectedFile && (
        <div className="composer__file-chip">
          📎 {selectedFile.name}
          <button onClick={() => setSelectedFile(null)}>✕</button>
        </div>
      )}

      <form className="composer" onSubmit={sendMessage}>
        <button
          type="button"
          className={`composer__mode ${imageMode ? "composer__mode--active" : ""}`}
          onClick={() => setImageMode((v) => !v)}
          title={imageMode ? "Switch to chat" : "Switch to image generation"}
        >
          {imageMode ? "🖼️" : "💬"}
        </button>

        <label className="composer__attach" title="Attach a file">
          📎
          <input
            type="file"
            accept="image/*,application/pdf"
            hidden
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          />
        </label>

        <textarea
          className="composer__input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage(e);
            }
          }}
          placeholder={imageMode ? "Describe an image..." : "Message Nova..."}
          rows={1}
          aria-label="Message"
        />

        <button
          type="submit"
          className="composer__send"
          disabled={(!input.trim() && !selectedFile) || isThinking}
        >
          Send
        </button>
      </form>
    </div>
  );
}