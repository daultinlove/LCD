(() => {
  const root = document.documentElement;

  /* =========================
     THEME (prevent flash)
  ========================= */
  const THEME_KEY = "lcd:theme";
  const savedTheme = localStorage.getItem(THEME_KEY);

  // Apply theme immediately (before any layout)
  (function bootTheme() {
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    const t = (savedTheme || (prefersDark ? "dark" : "light")) === "dark" ? "dark" : "light";
    root.setAttribute("data-theme", t);
  })();

  const themeBtn = document.querySelector("[data-theme-toggle]");

  function applyTheme(theme) {
    const t = theme === "dark" ? "dark" : "light";
    root.setAttribute("data-theme", t);
    localStorage.setItem(THEME_KEY, t);

    if (themeBtn) {
      themeBtn.setAttribute(
        "aria-label",
        t === "dark" ? "Switch to light theme" : "Switch to dark theme"
      );
      themeBtn.setAttribute("aria-pressed", t === "dark" ? "true" : "false");
    }
  }

  // Ensure aria state is correct after boot
  applyTheme(root.getAttribute("data-theme") || "light");

  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const current = root.getAttribute("data-theme") || "light";
      applyTheme(current === "dark" ? "light" : "dark");
    });
  }

  /* =========================
     MOBILE NAV TOGGLE
     - click outside closes
     - Esc closes
  ========================= */
  const navToggle = document.querySelector("[data-nav-toggle]");
  const navLinks = document.querySelector("[data-nav-links]");

  function isNavOpen() {
    return navLinks?.getAttribute("data-open") === "true";
  }

  function setNav(open) {
    if (!navLinks || !navToggle) return;
    navLinks.setAttribute("data-open", open ? "true" : "false");
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  if (navToggle && navLinks) {
    setNav(false);

    navToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      setNav(!isNavOpen());
    });

    navLinks.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => setNav(false));
    });

    // Click outside closes
    document.addEventListener("click", (e) => {
      if (!isNavOpen()) return;
      const target = e.target;
      const clickedInsideNav = navLinks.contains(target) || navToggle.contains(target);
      if (!clickedInsideNav) setNav(false);
    });

    // Esc closes
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isNavOpen()) setNav(false);
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 720) setNav(false);
    });
  }

  /* =========================
     CURRENT PAGE HIGHLIGHT
     - supports /, /index.html, hashes, query strings
  ========================= */
  const cleanPath = () => {
    // pathname like "/" or "/packages.html"
    let p = (location.pathname.split("/").pop() || "").toLowerCase();

    // normalize homepage
    if (!p || p === "/") p = "index.html";
    if (p === "") p = "index.html";

    // If deployed to "/" some browsers return "" as pop
    if (!p.includes(".html")) {
      // handle routes like "/about" if ever used
      p = `${p}.html`;
      if (p === ".html") p = "index.html";
    }
    return p;
  };

  const current = cleanPath();

  document.querySelectorAll("nav a[data-page]").forEach((a) => {
    const p = (a.getAttribute("data-page") || "").toLowerCase();
    if (p === current) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });

  /* =========================
     FORMSPREE HANDLER (reusable)
     - Contact + Intake
     - Redirects to thank-you.html on success
  ========================= */
  const FORMSPREE_URL = "https://formspree.io/f/xwvvpzaj";

  function bindForm({
    formSelector,
    statusSelector,
    idleText,
    sendingText,
    redirectTo = "thank-you.html",
  }) {
    const form = document.querySelector(formSelector);
    if (!form) return;

    const statusEl = statusSelector ? document.querySelector(statusSelector) : null;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.textContent : "";

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
      submitBtn.textContent = submitting ? sendingText : (idleText || originalBtnText);
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Honeypot: if bot filled it, pretend success but do nothing
      const gotcha = form.querySelector('input[name="_gotcha"]')?.value;
      if (gotcha && gotcha.trim() !== "") {
        window.location.href = redirectTo;
        return;
      }

      // Respect hidden _next if present, but default to thank-you.html
      const next =
        form.querySelector('input[name="_next"]')?.value?.trim() || redirectTo;

      setSubmitting(true);
      showStatus("Sending…", true);

      try {
        const data = new FormData(form);

        const res = await fetch(FORMSPREE_URL, {
          method: "POST",
          body: data,
          headers: { Accept: "application/json" },
        });

        if (res.ok) {
          showStatus("Submitted ✅ Redirecting…", true);
          setTimeout(() => {
            window.location.href = next;
          }, 250);
          return;
        }

        let errMsg = "Something went wrong. Please try again.";
        try {
          const json = await res.json();
          if (json?.errors?.length) {
            errMsg = json.errors.map((x) => x.message).join(" ");
          }
        } catch (_) {}

        showStatus(errMsg, false);
      } catch (_) {
        showStatus("Network error. Please check your connection and try again.", false);
      } finally {
        setSubmitting(false);
      }
    });
  }

  // CONTACT
  bindForm({
    formSelector: "#contact-form",
    statusSelector: "#form-status",
    idleText: "Send message",
    sendingText: "Sending...",
    redirectTo: "thank-you.html",
  });

  // INTAKE
  bindForm({
    formSelector: "#intake-form",
    statusSelector: "#intake-status",
    idleText: "Submit intake",
    sendingText: "Submitting...",
    redirectTo: "thank-you.html",
  });
})();
