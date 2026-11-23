(function () {
  function showStatus(form, out, status, message) {
    form.classList.remove("init", "submitting", "sent", "failed", "invalid");
    form.classList.add(status);
    form.setAttribute("data-status", status);
    if (!out) return;
    out.textContent = message;
    out.setAttribute("aria-hidden", "false");
    out.style.display = "block";
    out.style.marginTop = "16px";
    out.style.padding = "12px 16px";
    out.style.fontWeight = "600";
    if (status === "sent") {
      out.style.borderColor = "#46b450";
      out.style.color = "#1b365d";
    } else if (status === "invalid") {
      out.style.borderColor = "#ffb900";
      out.style.color = "#7a5800";
    } else {
      out.style.borderColor = "#dc3232";
      out.style.color = "#dc3232";
    }
  }

  function initContactForms() {
    var forms = document.querySelectorAll("form.wpcf7-form");
    forms.forEach(function (form) {
      if (form.id === "apply-form" || form.dataset.telegramBound === "1") {
        return;
      }
      form.dataset.telegramBound = "1";
      form.setAttribute("action", "/api/contact");

      form.addEventListener(
        "submit",
        async function (e) {
          e.preventDefault();
          e.stopImmediatePropagation();

          var out = form.querySelector(".wpcf7-response-output");
          var btn = form.querySelector('input[type="submit"], button[type="submit"]');
          var originalLabel = btn ? (btn.tagName === "INPUT" ? btn.value : btn.textContent) : "SUBMIT";

          var getVal = function (name) {
            var el = form.querySelector('[name="' + name + '"]');
            return el ? el.value.trim() : "";
          };

          var payload = {
            "your-name": getVal("your-name"),
            "your-surname": getVal("your-surname"),
            "tel-272": getVal("tel-272"),
            "your-email": getVal("your-email"),
            "your-message": getVal("your-message"),
            page: window.location.pathname,
          };

          if (!payload["your-name"] || !payload["tel-272"] || !payload["your-email"] || !payload["your-message"]) {
            showStatus(
              form,
              out,
              "invalid",
              "Please fill in all required fields (First Name, Phone, Email, and Message)."
            );
            return;
          }

          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload["your-email"])) {
            showStatus(form, out, "invalid", "Please enter a valid email address.");
            return;
          }

          form.classList.remove("init", "sent", "failed", "invalid");
          form.classList.add("submitting");
          form.setAttribute("data-status", "submitting");
          if (out) {
            out.style.display = "none";
          }
          if (btn) {
            btn.disabled = true;
            if (btn.tagName === "INPUT") btn.value = "SENDING...";
            else btn.textContent = "SENDING...";
          }

          try {
            var res = await fetch("/api/contact", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            var data = await res.json().catch(function () {
              return { ok: false, error: "Unexpected server response" };
            });

            if (res.ok && data.ok) {
              showStatus(
                form,
                out,
                "sent",
                "Thank you for your message. Our team will get back to you shortly."
              );
              form.reset();
            } else {
              throw new Error(data.error || "Failed to send message");
            }
          } catch (err) {
            showStatus(form, out, "failed", "Error sending message: " + err.message);
          } finally {
            if (btn) {
              btn.disabled = false;
              if (btn.tagName === "INPUT") btn.value = originalLabel;
              else btn.textContent = originalLabel;
            }
          }
        },
        true
      );
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initContactForms);
  } else {
    initContactForms();
  }
})();
