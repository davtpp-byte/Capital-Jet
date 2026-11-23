exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "Method Not Allowed" }),
    };
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "Missing Telegram env vars" }),
    };
  }

  try {
    const contentType = (event.headers["content-type"] || event.headers["Content-Type"] || "").toLowerCase();
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64").toString("utf8")
      : event.body || "";

    let fields = {};

    if (contentType.includes("application/json")) {
      fields = JSON.parse(rawBody || "{}");
    } else if (contentType.includes("multipart/form-data")) {
      const bodyBuffer = event.isBase64Encoded
        ? Buffer.from(event.body || "", "base64")
        : Buffer.from(event.body || "", "utf8");
      const req = new Request("http://localhost/api/contact", {
        method: "POST",
        headers: { "content-type": event.headers["content-type"] || event.headers["Content-Type"] },
        body: bodyBuffer,
      });
      const formData = await req.formData();
      for (const [key, value] of formData.entries()) {
        if (typeof value === "string") {
          fields[key] = value;
        }
      }
    } else {
      const params = new URLSearchParams(rawBody);
      for (const [key, value] of params.entries()) {
        fields[key] = value;
      }
    }

    const pick = (...keys) => {
      for (const key of keys) {
        if (fields[key] !== undefined && fields[key] !== null) {
          const val = String(fields[key]).trim();
          if (val) return val;
        }
      }
      return "";
    };

    const firstName = pick("your-name", "first-name", "firstName");
    const lastName = pick("your-surname", "last-name", "lastName");
    const phone = pick("tel-272", "phone");
    const email = pick("your-email", "email");
    const message = pick("your-message", "message");
    const page = pick("page");

    if (!firstName || !phone || !email || !message) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ok: false,
          error: "Please fill in First Name, Phone, Email, and Message.",
        }),
      };
    }

    const lines = [
      "New Capital Jets Contact Message",
      "",
      `First Name: ${firstName}`,
      `Last Name: ${lastName || "-"}`,
      `Phone: ${phone}`,
      `Email: ${email}`,
    ];
    if (page) {
      lines.push(`Page: ${page}`);
    }
    lines.push("", "Message:", message);

    const msgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: lines.join("\n"),
      }),
    });

    if (!msgRes.ok) {
      throw new Error(`Telegram sendMessage failed: ${await msgRes.text()}`);
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
