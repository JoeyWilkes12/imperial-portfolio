(() => {
  "use strict";

  const carousel = document.querySelector(".testimonial-carousel");
  if (carousel) {
    const slides = [...carousel.querySelectorAll(".testimonial-slide")];
    const controls = carousel.querySelector(".testimonial-controls");
    const position = carousel.querySelector(".testimonial-position");
    let current = 0;
    const show = (index) => {
      current = (index + slides.length) % slides.length;
      slides.forEach((slide, slideIndex) => { slide.hidden = slideIndex !== current; });
      position.textContent = `${current + 1} of ${slides.length}`;
    };
    if (slides.length > 1) {
      show(0);
      controls.hidden = false;
      carousel.querySelector('[data-testimonial="previous"]').addEventListener("click", () => show(current - 1));
      carousel.querySelector('[data-testimonial="next"]').addEventListener("click", () => show(current + 1));
      controls.addEventListener("keydown", (event) => {
        const offset = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
        if (offset) { event.preventDefault(); show(current + offset); }
      });
    }
  }

  const root = document.documentElement;
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  const themeToggle = document.querySelector(".theme-toggle");
  let preferredTheme = null;
  try {
    const saved = localStorage.getItem("imperial-theme");
    if (saved === "light" || saved === "dark") preferredTheme = saved;
  } catch { /* The toggle still works when browser storage is unavailable. */ }

  const applyTheme = (theme) => {
    root.dataset.theme = theme;
    const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
    themeToggle?.setAttribute("aria-label", label);
    themeToggle?.setAttribute("title", label);
    themeToggle?.setAttribute("aria-pressed", String(theme === "dark"));
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#191d1b" : "#edefea");
  };
  applyTheme(preferredTheme || (systemTheme.matches ? "dark" : "light"));
  if (themeToggle) {
    themeToggle.hidden = false;
    themeToggle.addEventListener("click", () => {
      preferredTheme = root.dataset.theme === "dark" ? "light" : "dark";
      try { localStorage.setItem("imperial-theme", preferredTheme); } catch { /* Keep the in-page preference. */ }
      applyTheme(preferredTheme);
    });
  }
  systemTheme.addEventListener("change", (event) => {
    if (!preferredTheme) applyTheme(event.matches ? "dark" : "light");
  });

  const mobileMenu = document.querySelector(".mobile-nav");
  mobileMenu?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => mobileMenu.removeAttribute("open"));
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && mobileMenu?.open) {
      mobileMenu.removeAttribute("open");
      mobileMenu.querySelector("summary")?.focus();
    }
  });

  const roleDetails = [...document.querySelectorAll(".role-details")];
  let printClosedDetails = [];
  window.addEventListener("beforeprint", () => {
    printClosedDetails = roleDetails.filter(details => !details.open);
    printClosedDetails.forEach(details => { details.open = true; });
  });
  window.addEventListener("afterprint", () => {
    printClosedDetails.forEach(details => { details.open = false; });
    printClosedDetails = [];
  });
})();
