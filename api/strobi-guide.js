
const GROQ_URL =
  "https://api.groq.com/openai/v1/chat/completions";

const GROQ_MODEL = "openai/gpt-oss-120b";
const MAX_MESSAGE_LENGTH = 2000;
const REQUEST_TIMEOUT_MS = 12000;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  if (
    !String(req.headers["content-type"] || "")
      .toLowerCase()
      .startsWith("application/json")
  ) {
    return res.status(415).json({
      error: "Content-Type must be application/json",
    });
  }

  const apiKey = process.env.STROBI_GROQ_API_KEY;

  if (!apiKey) {
    console.error("Strobi API key is not configured.");
    return res.status(500).json({
      error: "Strobi is not configured yet.",
    });
  }

  const message = req.body?.message;

  if (
    typeof message !== "string" ||
    !message.trim() ||
    message.trim().length > MAX_MESSAGE_LENGTH
  ) {
    return res.status(400).json({
      error: "Send a message between 1 and 2000 characters.",
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  try {
    const upstream = await fetch(GROQ_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content: [
              "You are Strobi, the friendly guide for the JAYE / EFFS website.",
              "Help visitors understand and navigate the website.",
              "Be concise, warm, clear, and useful.",
              "Never claim you can see clicks, detect errors, or know page state unless that information is explicitly supplied.",
              "Never request passwords, API keys, or other secrets.",
              "If you lack context, ask one short clarifying question.",
            ].join(" "),
          },
          {
            role: "user",
            content: message.trim(),
          },
        ],
        temperature: 0.4,
        max_tokens: 220,
      }),
    });

    if (!upstream.ok) {
      console.error(
        "Strobi provider returned status:",
        upstream.status
      );

      return res.status(502).json({
        error: "Strobi is temporarily unavailable.",
      });
    }

    const data = await upstream.json();
    const reply = data.choices?.[0]?.message?.content;

    if (typeof reply !== "string" || !reply.trim()) {
      return res.status(502).json({
        error: "Strobi could not produce a reply.",
      });
    }

    return res.status(200).json({
      reply: reply.trim(),
    });
  } catch (error) {
    console.error(
      "Strobi request failed:",
      error?.name || "UnknownError"
    );

    return res.status(
      error?.name === "AbortError" ? 504 : 500
    ).json({
      error:
        error?.name === "AbortError"
          ? "Strobi took too long. Please try again."
          : "Something went wrong. Please try again.",
    });
  } finally {
    clearTimeout(timeout);
  }
}
