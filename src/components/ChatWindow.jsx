import { useEffect, useRef } from "react";
import Message from "./Message.jsx";

export default function ChatWindow({ messages, isThinking, error }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  return (
    <div className="chat-window">
      {messages.length === 0 && (
        <div className="chat-empty">
          <p>👋 Hey, I'm Nova.</p>
          <p>Ask me anything — code, ideas, images, files.</p>
        </div>
      )}

      {messages.map((msg, i) => (
        <Message
          key={i}
          role={msg.role}
          content={msg.content}
          type={msg.type}
          fileKey={msg.fileKey}
          fileName={msg.fileName}
        />
      ))}

      {isThinking && (
        <div className="message message--assistant">
          <div className="message__avatar">N</div>
          <div className="message__bubble typing">
            <span></span><span></span><span></span>
          </div>
        </div>
      )}

      {error && <div className="chat-error">{error}</div>}

      <div ref={bottomRef} />
    </div>
  );
}