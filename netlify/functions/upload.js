import { getStore } from "@netlify/blobs";
import { randomUUID } from "crypto";

export default async (req, context) => {  // <-- Use Request/Context
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const formData = await req.formData(); // <-- Much simpler
    const file = formData.get("file");

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const key = `${randomUUID()}-${file.name}`;
    const store = getStore({ name: "uploads", consistency: "strong" });

    await store.set(key, file, {
      metadata: { contentType: file.type, originalFilename: file.name }
    });

    return new Response(JSON.stringify({ key, filename: file.name }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("Upload error:", err);
    return new Response(JSON.stringify({ error: "Upload failed" }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};