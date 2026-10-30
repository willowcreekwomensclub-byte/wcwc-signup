(() => {
  "use strict";
  const form = document.getElementById("welcome-form");
  const email = document.getElementById("email");
  const button = document.getElementById("continue");
  const status = document.getElementById("status");
  const destinations = new Set([
    "https://tinyurl.com/wcwc-holidaytea",
    "https://tinyurl.com/wcwc-register"
  ]);
  let pending = null;
  function finish(message, error = false) {
    if (pending) {
      clearTimeout(pending.timer);
      pending.frame.remove();
      pending = null;
    }
    button.disabled = false;
    button.innerHTML = 'Continue <span aria-hidden="true">→</span>';
    form.removeAttribute("aria-busy");
    status.textContent = message;
    status.classList.toggle("error", error);
  }
  window.addEventListener("message", event => {
    const data = event.data;
    // Apps Script's HTML service adds a nested Google-hosted sandbox frame.
    // Its WindowProxy differs from the outer frame, so authenticate replies
    // using a fresh 128-bit nonce plus an HTTPS Google origin and URL allowlist.
    const googleOrigin = /^https:\/\/(?:script\.google\.com|[a-z0-9-]+\.googleusercontent\.com)$/.test(event.origin);
    if (!pending || !googleOrigin || !data || data.type !== "wcwc-result" || data.requestId !== pending.id) return;
    if (data.ok === true && destinations.has(data.destination)) {
      finish("You’re all set. Taking you to the next page…");
      button.disabled = true;
      window.location.assign(data.destination);
    } else {
      finish(data.error === "invalid_email" ? "Please enter a valid email address." : "We couldn’t check your membership just now. Please try again in a moment.", true);
    }
  });
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (pending) return;
    email.value = email.value.trim();
    email.removeAttribute("aria-invalid");
    if (!email.checkValidity() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      email.setAttribute("aria-invalid", "true");
      finish("Please enter a valid email address, like you@example.com.", true);
      email.focus();
      return;
    }
    const endpoint = window.WCWC_CONFIG && window.WCWC_CONFIG.scriptUrl;
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint || "")) {
      finish("Our welcome page is getting ready. Please check back soon.", true);
      return;
    }
    const id = Array.from(crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2,"0")).join("");
    const frame = document.createElement("iframe");
    frame.name = "wcwc-" + id;
    frame.title = "Membership check";
    frame.hidden = true;
    document.body.appendChild(frame);
    document.getElementById("request-id").value = id;
    document.getElementById("origin").value = window.location.origin;
    form.action = endpoint;
    form.target = frame.name;
    button.disabled = true;
    button.textContent = "Checking…";
    form.setAttribute("aria-busy", "true");
    status.classList.remove("error");
    status.textContent = "Checking your membership…";
    pending = { id, frame, timer: setTimeout(() => finish("The membership check is taking longer than expected. Please try again. If this continues, contact the club.", true), 45000) };
    // A normal form POST avoids CORS and keeps the email out of URL queries.
    // The response frame posts back only to the configured GitHub Pages origin.
    HTMLFormElement.prototype.submit.call(form);
  });
  window.addEventListener("pageshow", event => { if (event.persisted) finish(""); });
})();
