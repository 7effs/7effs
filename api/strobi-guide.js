
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  const apiKey = process.env.STROBI_GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Strobi is not configured yet.",
    });
  }

  try {
    const { message } = req.body ?? {};

    if (
      typeof message !== "string" ||
      !message.trim() ||
      message.length > 2000
    ) {
      return res.status(400).json({
        error: "Please send a valid message.",
      });
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: [
            {
              role: "system",
              content:
                "You are Strobi, a concise, friendly guide for the JAYE / EFFS website. Help visitors understand the site and navigate it. Never claim to have detected an error or observed an action unless the frontend explicitly provides that information. If you lack context, ask a brief clarifying question.",
            },
            {
              role: "user",
              content: message.trim(),
            },
          ],
          temperature: 0.5,
          max_tokens: 250,
        }),
      }
    );

    if (!response.ok) {
      console.error("Strobi provider error:", response.status);
      return res.status(502).json({
        error: "Strobi is temporarily unavailable.",
      });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;

    if (typeof reply !== "string" || !reply.trim()) {
      return res.status(502).json({
        error: "Strobi returned an empty response.",
      });
    }

    return res.status(200).json({
      reply: reply.trim(),
    });
  } catch (error) {
    console.error("Strobi request failed:", error);
    return res.status(500).json({
      error: "Something went wrong. Please try again.",
    });
  }
}
