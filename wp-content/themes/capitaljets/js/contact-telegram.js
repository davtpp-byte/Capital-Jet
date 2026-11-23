(function () {
  var hideTimers = new WeakMap();

  function clearStatus(form, out) {
    var timer = hideTimers.get(form);
    if (timer) {
      clearTimeout(timer);
      hideTimers.delete(form);
    }
    form.classList.remove("submitting", "sent", "failed", "invalid");
    form.classList.add("init");
    form.setAttribute("data-status", "init");
    if (!out) return;
    out.textContent = "";
    out.setAttribute("aria-hidden", "true");
    out.style.display = "none";
  }

  function showStatus(form, out, status, message, autoHideMs) {
    var existingTimer = hideTimers.get(form);
    if (existingTimer) {
      clearTimeout(existingTimer);
      hideTimers.delete(form);
    }
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
    if (autoHideMs) {
      hideTimers.set(
        form,
        setTimeout(function () {
          clearStatus(form, out);
        }, autoHideMs)
      );
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

      var out = form.querySelector(".wpcf7-response-output");

      // Dismiss confirmation/error banner immediately when user starts editing again
      form.addEventListener("input", function () {
        if (out && out.style.display !== "none") {
          clearStatus(form, out);
        }
      });
      form.addEventListener("change", function () {
        if (out && out.style.display !== "none") {
          clearStatus(form, out);
        }
      });

      form.addEventListener(
        "submit",
        async function (e) {
          e.preventDefault();
          e.stopImmediatePropagation();

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

          if (!/^[A-Za-z][A-Za-z\s'\-]{1,49}$/.test(payload["your-name"])) {
            showStatus(form, out, "invalid", "Please enter a valid first name (letters only).");
            return;
          }

          if (payload["your-surname"] && !/^[A-Za-z][A-Za-z\s'\-]{1,49}$/.test(payload["your-surname"])) {
            showStatus(form, out, "invalid", "Please enter a valid last name (letters only).");
            return;
          }

          var phoneDigits = payload["tel-272"].replace(/\D/g, "");
          if (phoneDigits.length < 7 || phoneDigits.length > 15) {
            showStatus(form, out, "invalid", "Please enter a valid phone number (7 to 15 digits).");
            return;
          }

          if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(payload["your-email"])) {
            showStatus(form, out, "invalid", "Please enter a valid email address.");
            return;
          }

          clearStatus(form, out);
          form.classList.remove("init");
          form.classList.add("submitting");
          form.setAttribute("data-status", "submitting");
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
              form.reset();
              showStatus(
                form,
                out,
                "sent",
                "Thank you for your message. Our team will get back to you shortly.",
                6000
              );
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
