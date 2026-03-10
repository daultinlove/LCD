(() => {
  const root = document.documentElement;

  /* =========================
     SAFE STORAGE HELPERS
  ========================= */
  const storage = {
    get(key) {
      try {
        return localStorage.getItem(key);
      } catch (_) {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (_) {}
    }
  };

  /* =========================
     THEME
  ========================= */
  const THEME_KEY = "lcd:theme";
  const mediaQuery =
    window.matchMedia?.("(prefers-color-scheme: dark)") || null;

  function getPreferredTheme() {
    return mediaQuery?.matches ? "dark" : "light";
  }

  function getStoredTheme() {
    const saved = storage.get(THEME_KEY);
    return saved === "dark" || saved === "light" ? saved : null;
  }

  function getActiveTheme() {
    return getStoredTheme() || getPreferredTheme();
  }

  function updateThemeButton(button, theme) {
    if (!button) return;
    const nextTheme = theme === "dark" ? "light" : "dark";
    button.setAttribute("aria-label", `Switch to ${nextTheme} theme`);
    button.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    button.setAttribute("title", `Switch to ${nextTheme} theme`);
  }

  function applyTheme(theme, persist = true) {
    const finalTheme = theme === "dark" ? "dark" : "light";
    root.setAttribute("data-theme", finalTheme);

    if (persist) {
      storage.set(THEME_KEY, finalTheme);
    }

    updateThemeButton(
      document.querySelector("[data-theme-toggle]"),
      finalTheme
    );
  }

  // Boot theme immediately
  applyTheme(getActiveTheme(), false);

  document.addEventListener("DOMContentLoaded", () => {
    const themeBtn = document.querySelector("[data-theme-toggle]");

    // Ensure button state is synced after DOM exists
    updateThemeButton(themeBtn, root.getAttribute("data-theme") || "light");

    if (themeBtn) {
      themeBtn.addEventListener("click", () => {
        const current = root.getAttribute("data-theme") || "light";
        const next = current === "dark" ? "light" : "dark";
        applyTheme(next, true);
      });
    }

    // If user has not manually chosen a theme, follow system changes
    if (mediaQuery && !getStoredTheme()) {
      const handleSystemThemeChange = (e) => {
        applyTheme(e.matches ? "dark" : "light", false);
      };

      if (typeof mediaQuery.addEventListener === "function") {
        mediaQuery.addEventListener("change", handleSystemThemeChange);
      } else if (typeof mediaQuery.addListener === "function") {
        mediaQuery.addListener(handleSystemThemeChange);
      }
    }

    /* =========================
       MOBILE NAV
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
      navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }

    if (navToggle && navLinks) {
      setNav(false);

      navToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        setNav(!isNavOpen());
      });

      navLinks.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => setNav(false));
      });

      document.addEventListener("click", (e) => {
        if (!isNavOpen()) return;
        const target = e.target;
        const clickedInside = navLinks.contains(target) || navToggle.contains(target);
        if (!clickedInside) setNav(false);
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && isNavOpen()) {
          setNav(false);
          navToggle.focus();
        }
      });

      window.addEventListener("resize", () => {
        if (window.innerWidth > 720) setNav(false);
      });
    }

    /* =========================
       CURRENT PAGE HIGHLIGHT
    ========================= */
    function getCurrentPage() {
      const path = window.location.pathname;
      const file = path.split("/").pop() || "index.html";

      if (file === "" || file === "/") return "index.html";
      if (!file.includes(".")) return `${file}.html`;

      return file.toLowerCase();
    }

    const currentPage = getCurrentPage();

    document.querySelectorAll("nav a[data-page]").forEach((link) => {
      const page = (link.getAttribute("data-page") || "").toLowerCase();
      if (page === currentPage) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    /* =========================
       FORMSPREE HANDLER
    ========================= */
    const FORMSPREE_URL = "https://formspree.io/f/xwvvpzaj";

    function bindForm({
      formSelector,
      statusSelector,
      idleText,
      sendingText,
      redirectTo = "thank-you.html"
    }) {
      const form = document.querySelector(formSelector);
      if (!form) return;

      const statusEl = statusSelector
        ? document.querySelector(statusSelector)
        : null;

      const submitBtn = form.querySelector('button[type="submit"]');
      const defaultButtonText = submitBtn?.textContent?.trim() || idleText;

      function showStatus(message, isSuccess = true) {
        if (!statusEl) return;

        statusEl.style.display = "block";
        statusEl.textContent = message;
        statusEl.setAttribute("role", "status");
        statusEl.setAttribute("aria-live", "polite");
        statusEl.classList.toggle("is-success", isSuccess);
        statusEl.classList.toggle("is-error", !isSuccess);
      }

      function setSubmitting(submitting) {
        if (!submitBtn) return;

        submitBtn.disabled = submitting;
        submitBtn.setAttribute("aria-busy", submitting ? "true" : "false");
        submitBtn.textContent = submitting ? sendingText : defaultButtonText;
      }

      form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const gotcha = form.querySelector('input[name="_gotcha"]')?.value || "";
        if (gotcha.trim()) {
          window.location.href = redirectTo;
          return;
        }

        const next =
          form.querySelector('input[name="_next"]')?.value?.trim() || redirectTo;

        setSubmitting(true);
        showStatus("Sending...", true);

        try {
          const formData = new FormData(form);

          const response = await fetch(FORMSPREE_URL, {
            method: "POST",
            body: formData,
            headers: {
              Accept: "application/json"
            }
          });

          if (response.ok) {
            showStatus("Submitted. Redirecting...", true);
            window.setTimeout(() => {
              window.location.href = next;
            }, 250);
            return;
          }

          let errorMessage = "Something went wrong. Please try again.";

          try {
            const data = await response.json();
            if (Array.isArray(data?.errors) && data.errors.length) {
              errorMessage = data.errors.map((err) => err.message).join(" ");
            }
          } catch (_) {}

          showStatus(errorMessage, false);
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

    bindForm({
      formSelector: "#contact-form",
      statusSelector: "#form-status",
      idleText: "Send message",
      sendingText: "Sending...",
      redirectTo: "thank-you.html"
    });

    bindForm({
      formSelector: "#intake-form",
      statusSelector: "#intake-status",
      idleText: "Submit intake",
      sendingText: "Submitting...",
      redirectTo: "thank-you.html"
    });
  });
})();
