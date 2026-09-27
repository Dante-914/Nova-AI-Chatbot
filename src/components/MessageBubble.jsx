export default function MessageBubble({ role, content, pending }) {
  const isUser = role === "user";

  return (
    <div className={`bubble-row ${isUser ? "bubble-row--user" : ""}`}>
      <div className={`bubble ${isUser ? "bubble--user" : "bubble--assistant"}`}>
        {pending ? (
          <span className="typing" aria-label="Nova is typing">
            <span></span>
            <span></span>
            <span></span>
          </span>
        ) : (
          <p>{content}</p>
        )}
      </div>
    </div>
  );
}
