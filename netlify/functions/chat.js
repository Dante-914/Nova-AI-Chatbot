import { getStore } from "@netlify/blobs";

const SYSTEM_PROMPT =
  "You are Nova, a friendly and concise AI assistant embedded in a developer's portfolio site. " +
  "Keep answers helpful and to the point.";

// Use a vision-capable model
const MODEL = "qwen/qwen3.8-27b";

export default async (req, context) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured: GROQ_API_KEY is not set." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages[] is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Build messages array for Groq
  const apiMessages = [{ role: "system", content: SYSTEM_PROMPT }];

  for (const m of messages.slice(-20)) {
    // Check if this message has an attached image
    if (m.fileKey) {
      // Fetch the image from Netlify Blobs
      try {
        const store = getStore({ name: "uploads", consistency: "strong" });
        const imageData = await store.get(m.fileKey, { type: "arrayBuffer" });
        
        if (imageData) {
          const base64 = Buffer.from(imageData).toString("base64");
          const contentType = m.fileName?.endsWith(".png") ? "image/png" : "image/jpeg";
          
          apiMessages.push({
            role: "user",
            content: [
              { type: "text", text: m.content?.trim() || "What's in this image?" },
              { type: "image_url", image_url: { url: `data:${contentType};base64,${base64}` } },
            ],
          });
          continue;
        }
      } catch (err) {
        console.error("Failed to fetch image:", err);
      }
    }
    
    // Regular text message
    apiMessages.push({
      role: m.role === "user" ? "user" : "assistant",
      content: String(m.content ?? "").slice(0, 4000),
    });
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 740,
        messages: apiMessages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Groq API error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Upstream AI request failed." }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Function error:", err);
    return new Response(JSON.stringify({ error: "Unexpected server error." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};