(() => {
  "use strict";

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
    window.dispatchEvent(new CustomEvent("trace:reink"));
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

  const canvas = document.querySelector("#lorenz-trace");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const narrowScreen = window.matchMedia("(max-width: 640px)");

  if (!(canvas instanceof HTMLCanvasElement)) return;

  const context = canvas.getContext("2d");
  const container = canvas.parentElement;
  if (!context || !container) return;

  const seeds = {
    "reservoir-network-thinning": [0.1, 0, 0],
    "conference-discourse-nlp": [0.1008, 0, 0],
    "risk-game-prediction": [0.0992, 0, 0],
    "movie-revenue-modeling": [0.1016, 0, 0],
  };

  let state = [...seeds["reservoir-network-thinning"]];
  let previousPoint = null;
  let animationFrame = 0;
  let visible = true;
  let width = 0;
  let height = 0;
  let steps = 0;

  const resize = () => {
    const rect = container.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    previousPoint = null;
  };

  const derivative = ([x, y, z]) => [
    10 * (y - x),
    x * (28 - z) - y,
    x * y - (8 / 3) * z,
  ];

  const stepLorenz = (point, dt = 0.006) => {
    const k1 = derivative(point);
    const k2 = derivative(point.map((value, index) => value + k1[index] * dt / 2));
    const k3 = derivative(point.map((value, index) => value + k2[index] * dt / 2));
    const k4 = derivative(point.map((value, index) => value + k3[index] * dt));
    return point.map((value, index) => value + dt * (k1[index] + 2 * k2[index] + 2 * k3[index] + k4[index]) / 6);
  };

  const projectPoint = ([x, , z]) => ({
    x: width * (0.5 + x / 49),
    y: height * (0.92 - z / 58),
  });

  const draw = () => {
    if (!visible || document.hidden || reduceMotion.matches || narrowScreen.matches) {
      animationFrame = requestAnimationFrame(draw);
      return;
    }

    const traceColor = getComputedStyle(document.documentElement).getPropertyValue("--trace").trim();
    context.strokeStyle = traceColor;
    context.globalAlpha = 0.5;
    context.lineWidth = 1.25;

    for (let index = 0; index < 4; index += 1) {
      state = stepLorenz(state);
      const point = projectPoint(state);
      if (previousPoint && steps > 45) {
        context.beginPath();
        context.moveTo(previousPoint.x, previousPoint.y);
        context.lineTo(point.x, point.y);
        context.stroke();
      }
      previousPoint = point;
      steps += 1;
    }

    if (steps > 9800) {
      context.globalAlpha = 0.035;
      context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--paper").trim();
      context.fillRect(0, 0, width, height);
      context.globalAlpha = 1;
      steps = 70;
    }

    animationFrame = requestAnimationFrame(draw);
  };

  const resetTrace = (projectId) => {
    state = [...(seeds[projectId] || seeds["reservoir-network-thinning"])];
    previousPoint = null;
    steps = 0;
    context.clearRect(0, 0, width, height);
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  const visibilityObserver = new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? true;
  }, { rootMargin: "120px" });
  visibilityObserver.observe(container);

  window.addEventListener("trace:reink", (event) => resetTrace(event.detail));
  window.addEventListener("pagehide", () => cancelAnimationFrame(animationFrame), { once: true });

  resize();
  draw();
})();
