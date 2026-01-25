(() => {
  const root = document.documentElement;

  /* =========================
     THEME TOGGLE (light/dark)
  ========================= */
  const THEME_KEY = "lcd:theme";
  const btn = document.querySelector("[data-theme-toggle]");
  const prefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  function applyTheme(theme) {
    const t = theme === "dark" ? "dark" : "light";
    root.setAttribute("data-theme", t);
    localStorage.setItem(THEME_KEY, t);

    if (btn) {
      btn.setAttribute(
        "aria-label",
        t === "dark" ? "Switch to light theme" : "Switch to dark theme"
      );
      btn.setAttribute("aria-pressed", t === "dark" ? "true" : "false");
    }
  }

  const saved = localStorage.getItem(THEME_KEY);
  applyTheme(saved || (prefersDark ? "dark" : "light"));

  if (btn) {
    btn.addEventListener("click", () => {
      const current = root.getAttribute("data-theme") || "light";
      applyTheme(current === "dark" ? "light" : "dark");
    });
  }

  /* =========================
     MOBILE NAV TOGGLE
  ========================= */
  const navToggle = document.querySelector("[data-nav-toggle]");
  const navLinks = document.querySelector("[data-nav-links]");

  function setNav(open) {
    if (!navLinks || !navToggle) return;
    navLinks.setAttribute("data-open", open ? "true" : "false");
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  if (navToggle && navLinks) {
    setNav(false);

    navToggle.addEventListener("click", () => {
      const open = navLinks.getAttribute("data-open") === "true";
      setNav(!open);
    });

    navLinks.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => setNav(false));
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 720) setNav(false);
    });
  }

  /* =========================
     CURRENT PAGE HIGHLIGHT
  ========================= */
  const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  document.querySelectorAll("nav a[data-page]").forEach((a) => {
    const p = (a.getAttribute("data-page") || "").toLowerCase();
    if (p === path) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });

  /* =========================
     CONTACT FORM (Formspree)
     - Shows #form-status
     - Redirects to thank-you.html on success
  ========================= */
  const form = document.querySelector("#contact-form");
  if (form) {
    const FORMSPREE_URL = "https://formspree.io/f/xwvvpzaj";

    const statusEl = document.querySelector("#form-status");
    const submitBtn = form.querySelector('button[type="submit"]');

    const showStatus = (msg, ok = true) => {
      if (!statusEl) return;
      statusEl.style.display = "block";
      statusEl.textContent = msg;
      statusEl.setAttribute("role", "status");
      statusEl.setAttribute("aria-live", "polite");
      statusEl.classList.toggle("is-error", !ok);
      statusEl.classList.toggle("is-success", ok);
    };

    const setSubmitting = (submitting) => {
      if (!submitBtn) return;
      submitBtn.disabled = submitting;
      submitBtn.setAttribute("aria-busy", submitting ? "true" : "false");
      submitBtn.textContent = submitting ? "Sending..." : "Send message";
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = form.querySelector('input[name="name"]')?.value?.trim();
      const email = form.querySelector('input[name="email"]')?.value?.trim();
      const message = form.querySelector('textarea[name="message"]')?.value?.trim();

      if (!name || !email || !message) {
        showStatus("Please fill out your name, email, and message.", false);
        return;
      }

      // Honeypot: if bot filled it, pretend success but do nothing
      const gotcha = form.querySelector('input[name="_gotcha"]')?.value;
      if (gotcha && gotcha.trim() !== "") {
        window.location.href = "thank-you.html";
        return;
      }

      // Respect your hidden _next field if present
      const next =
        form.querySelector('input[name="_next"]')?.value?.trim() || "thank-you.html";

      setSubmitting(true);
      showStatus("Sending…");

      try {
        const data = new FormData(form);

        const res = await fetch(FORMSPREE_URL, {
          method: "POST",
          body: data,
          headers: { Accept: "application/json" },
        });

        if (res.ok) {
          showStatus("Message sent ✅ Redirecting…");
          setTimeout(() => {
            window.location.href = next;
          }, 350);
          return;
        }

        let errMsg =
          "Something went wrong. Please try again, or email me directly.";
        try {
          const json = await res.json();
          if (json?.errors?.length) {
            errMsg = json.errors.map((x) => x.message).join(" ");
          }
        } catch (_) {}

        showStatus(errMsg, false);
      } catch (_) {
        showStatus(
          "Network error. Please check your connection and try again.",
          false
        );
      } finally {
        setSubmitting(false);
      }
    });
  }
})();
