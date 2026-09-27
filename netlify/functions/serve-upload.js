import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");

  if (!key) {
    return new Response("Missing file key", { status: 400 });
  }

  try {
    const store = getStore({ name: "uploads", consistency: "strong" });
    const result = await store.getWithMetadata(key, { type: "arrayBuffer" });

    if (!result) {
      return new Response("File not found", { status: 404 });
    }

    return new Response(result.data, {
      status: 200,
      headers: {
        "Content-Type": result.metadata?.contentType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${result.metadata?.originalFilename || "download"}"`,
      },
    });
  } catch (err) {
    console.error("Serve error:", err);
    return new Response("Failed to retrieve file", { status: 500 });
  }
};
