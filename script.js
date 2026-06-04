const panels = Array.from(document.querySelectorAll("section[data-panel]"));
const dots = Array.from(document.querySelectorAll(".dot"));
const recordControl = document.querySelector(".recording-control");
const recordToggle = document.querySelector("#recordToggle");
const recordState = document.querySelector("#recordState");

const autoConfig = {
  dwell: 9500,
  settle: 1350,
};

let activePanel = 0;
let isAutoPlaying = false;
let autoTimer = null;
let autoRunToken = 0;
const timelines = new WeakMap();
const playedPanels = new WeakSet();

function clampPanel(index) {
  return Math.max(0, Math.min(panels.length - 1, index));
}

function setActivePanel(index) {
  activePanel = clampPanel(index);
  document.body.dataset.activePanel = String(activePanel);
  dots.forEach((dot, dotIndex) => dot.classList.toggle("is-active", dotIndex === activePanel));
}

function wait(ms, token) {
  return new Promise((resolve) => {
    autoTimer = window.setTimeout(() => {
      autoTimer = null;
      if (token === autoRunToken) resolve();
    }, ms);
  });
}

function stopAutoPlay() {
  if (autoTimer) window.clearTimeout(autoTimer);
  autoTimer = null;
  autoRunToken += 1;
  isAutoPlaying = false;
  recordControl.classList.remove("is-recording");
  recordState.textContent = "Paused";
}

function goToPanel(index, { keepAuto = false } = {}) {
  const nextIndex = clampPanel(index);
  if (!keepAuto) stopAutoPlay();
  panels[nextIndex].scrollIntoView({ behavior: "smooth", block: "start" });
  setActivePanel(nextIndex);
}

function panelIndexFromScrollTop() {
  const top = window.scrollY + 24;
  let index = 0;
  panels.forEach((panel, panelIndex) => {
    if (panel.offsetTop <= top) index = panelIndex;
  });
  return clampPanel(index);
}

function nearestPanelIndex() {
  const center = window.scrollY + window.innerHeight * 0.5;
  return panels.reduce(
    (closest, panel, index) => {
      const panelCenter = panel.offsetTop + panel.offsetHeight * 0.5;
      const distance = Math.abs(center - panelCenter);
      return distance < closest.distance ? { index, distance } : closest;
    },
    { index: activePanel, distance: Infinity },
  ).index;
}

async function runAutoSequence(token) {
  let index = nearestPanelIndex();
  setActivePanel(index);
  playPanel(panels[index]);

  while (isAutoPlaying && token === autoRunToken) {
    await wait(autoConfig.dwell, token);
    if (!isAutoPlaying || token !== autoRunToken) return;

    if (index >= panels.length - 1) {
      stopAutoPlay();
      return;
    }

    index += 1;
    goToPanel(index, { keepAuto: true });
    await wait(autoConfig.settle, token);
    if (!isAutoPlaying || token !== autoRunToken) return;
    playPanel(panels[index]);
  }
}

function toggleAutoPlay() {
  if (isAutoPlaying) {
    stopAutoPlay();
    return;
  }

  isAutoPlaying = true;
  autoRunToken += 1;
  recordControl.classList.add("is-recording");
  recordState.textContent = "Recording";
  runAutoSequence(autoRunToken);
}

function setupPath(path) {
  if (!path || !path.getTotalLength) return;
  const length = path.getTotalLength();
  gsap.set(path, {
    strokeDasharray: length,
    strokeDashoffset: length,
  });
}

function drawPath(path) {
  if (!path) return {};
  return {
    autoAlpha: 1,
    strokeDashoffset: 0,
    duration: 1.35,
    ease: "power2.inOut",
  };
}

function playPanel(panel) {
  if (!window.gsap || !panel) return;
  if (playedPanels.has(panel)) return;

  const existing = timelines.get(panel);
  if (existing && existing.isActive()) return;
  if (existing) existing.kill();

  const theme = panel.dataset.panelTheme;
  const tl = gsap.timeline({
    defaults: { ease: "power3.out" },
    onComplete: () => playedPanels.add(panel),
  });
  timelines.set(panel, tl);

  if (theme === "cover") {
    const routePath = panel.querySelector('[data-animate="path"]');

    tl.fromTo(
      panel.querySelector('[data-animate="hero-bg"]'),
      { xPercent: -50, yPercent: -54, scale: 1.045, autoAlpha: 0 },
      { xPercent: -50, yPercent: -47, scale: 1, autoAlpha: 1, duration: 7.2, ease: "power1.inOut" },
      0,
    )
      .fromTo(
        panel.querySelectorAll('[data-animate="hero-paper"]'),
        { y: 32, scale: 0.98, autoAlpha: 0 },
        { y: 0, scale: 1, autoAlpha: 1, duration: 0.72, stagger: 0.1 },
        0.18,
      )
      .set(panel.querySelector('[data-animate="hero-title"]'), { xPercent: -50, yPercent: -50, autoAlpha: 1 }, 0.36)
      .fromTo(
        panel.querySelectorAll('[data-animate="hero-title"] span'),
        { y: 34, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.72, stagger: 0.12 },
        0.38,
      )
      .to(
        panel.querySelector('[data-animate="hero-title"]'),
        { xPercent: -50, yPercent: -42, scale: 0.86, duration: 3.8, ease: "power1.inOut" },
        2.2,
      )
      .fromTo(
        panel.querySelector('[data-animate="hero-front"]'),
        { xPercent: -50, yPercent: 34, scale: 1, autoAlpha: 1 },
        { xPercent: -50, yPercent: -18, scale: 1, autoAlpha: 1, duration: 5.1, ease: "power1.inOut" },
        2.65,
      )
      .fromTo(
        panel.querySelector('[data-animate="hero-caption"]'),
        { y: 18, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.72 },
        6.4,
      )
      .fromTo(
        panel.querySelectorAll('[data-animate="tag"]'),
        { y: 20, scale: 0.95, autoAlpha: 0 },
        { y: 0, scale: 1, autoAlpha: 1, duration: 0.58, stagger: 0.1 },
        7.15,
      );

    if (routePath) {
      tl.to(routePath, drawPath(routePath), 5.45);
    }

    return;
  }

  if (theme === "group-map") {
    const routePath = panel.querySelector('[data-animate="path"]');

    tl.fromTo(
      panel.querySelectorAll('[data-animate="paper-layer"]'),
      { x: -70, y: 24, rotation: -4, scale: 0.98, autoAlpha: 0 },
      { x: 0, y: 0, rotation: 0, scale: 1, autoAlpha: 1, duration: 0.95, stagger: 0.12 },
      0,
    )
      .fromTo(
        panel.querySelector('[data-animate="main-visual"]'),
        { y: 64, scale: 0.96, autoAlpha: 0 },
        { y: 0, scale: 1, autoAlpha: 1, duration: 1.12, ease: "power2.out" },
        0.18,
      );

    if (routePath) {
      tl.to(routePath, drawPath(routePath), 0.9);
    }

    tl.fromTo(
      panel.querySelector('[data-animate="chapter"]'),
      { y: -18, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.42 },
      1.42,
    )
      .fromTo(
        panel.querySelectorAll(".editorial-label"),
        { y: 22, scale: 0.94, autoAlpha: 0 },
        { y: 0, scale: 1, autoAlpha: 1, duration: 0.5, stagger: 0.12 },
        1.08,
    )
      .set(panel.querySelector('[data-animate="title"]'), { autoAlpha: 1 }, 1.58)
      .fromTo(
        panel.querySelectorAll('[data-animate="title"] span'),
        { x: -42, autoAlpha: 0 },
        { x: 0, autoAlpha: 1, duration: 0.62, stagger: 0.08 },
        1.58,
      )
      .fromTo(
        panel.querySelector('[data-animate="subtitle"]'),
        { y: 18, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.52 },
        1.94,
      )
      .fromTo(
        panel.querySelector(".map-support"),
        { y: 20, scale: 0.98, autoAlpha: 0 },
        { y: 0, scale: 1, autoAlpha: 1, duration: 0.56 },
        2.2,
      );
    return;
  }

  if (theme === "chapter-gate") {
    tl.fromTo(
      panel.querySelector('[data-animate="chapter"]'),
      { y: 18, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.65 },
      0.12,
    )
      .fromTo(
        panel.querySelector('[data-animate="title"]'),
        { y: 28, scale: 0.98, autoAlpha: 0 },
        { y: 0, scale: 1, autoAlpha: 1, duration: 0.85 },
        0.36,
      )
      .fromTo(
        panel.querySelector('[data-animate="subtitle"]'),
        { y: 18, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.58 },
        1.1,
      );
    return;
  }

  if (theme === "people-first") {
    tl.fromTo(
      panel.querySelectorAll('[data-animate="paper-layer"]'),
      { y: 28, rotation: -2, autoAlpha: 0 },
      { y: 0, rotation: 0, autoAlpha: 1, duration: 0.78, stagger: 0.12 },
      0,
    )
      .fromTo(
        panel.querySelector('[data-animate="orb"]'),
        { scale: 0.62, autoAlpha: 0 },
        { scale: 0.9, autoAlpha: 1, duration: 0.9, ease: "power2.out" },
        0.16,
      )
      .fromTo(
        panel.querySelector('[data-animate="main-visual"]'),
        { y: 64, scale: 0.98, autoAlpha: 0 },
        { y: 0, scale: 1, autoAlpha: 1, duration: 1.15, ease: "power2.out" },
        0.22,
      )
      .fromTo(
        panel.querySelector('[data-animate="subtitle"]'),
        { y: 26, rotation: -2, autoAlpha: 0 },
        { y: 0, rotation: 0, autoAlpha: 1, duration: 0.72 },
        1.22,
      );
    return;
  }

  if (theme === "main-statement") {
    tl.fromTo(
      panel.querySelectorAll('[data-animate="paper-layer"]'),
      { y: 30, rotation: -2, autoAlpha: 0 },
      { y: 0, rotation: 0, autoAlpha: 1, duration: 0.72, stagger: 0.12 },
      0,
    )
      .set(panel.querySelector('[data-animate="title"]'), { autoAlpha: 1 }, 0.24)
      .fromTo(
        panel.querySelectorAll('[data-animate="title"] span'),
        { y: 34, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.72, stagger: 0.14 },
        0.26,
      )
      .fromTo(
        panel.querySelector('[data-animate="subtitle"]'),
        { y: 20, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.62 },
        1.18,
      );
    return;
  }

  if (theme === "pressure" || theme === "service-node") {
    const visualStart = theme === "pressure" ? { x: -58, y: 24 } : { x: 58, y: 24 };
    const routePath = panel.querySelector('[data-animate="path"]');

    tl.fromTo(
      panel.querySelectorAll('[data-animate="paper-layer"]'),
      { x: () => gsap.utils.random(-42, 42), y: 34, rotation: () => gsap.utils.random(-5, 5), autoAlpha: 0 },
      { x: 0, y: 0, rotation: 0, autoAlpha: 1, duration: 0.78, stagger: 0.1 },
      0,
    )
      .fromTo(
        panel.querySelector('[data-animate="chapter"]'),
        { x: -26, autoAlpha: 0 },
        { x: 0, autoAlpha: 1, duration: 0.44 },
        0.18,
      )
      .fromTo(
        panel.querySelector('[data-animate="title"]'),
        { x: -42, autoAlpha: 0 },
        { x: 0, autoAlpha: 1, duration: 0.62 },
        0.3,
      )
      .fromTo(
        panel.querySelector('[data-animate="subtitle"]'),
        { y: 18, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.52 },
        0.52,
      )
      .fromTo(
        panel.querySelector('[data-animate="main-visual"]'),
        { ...visualStart, scale: 0.96, autoAlpha: 0 },
        { x: 0, y: 0, scale: 1, autoAlpha: 1, duration: 0.88 },
        0.62,
      )
      .fromTo(
        panel.querySelectorAll('[data-animate="label"]'),
        { y: 22, scale: 0.94, autoAlpha: 0 },
        { y: 0, scale: 1, autoAlpha: 1, duration: 0.48, stagger: 0.08 },
        1.1,
      );

    if (routePath) {
      tl.to(routePath, drawPath(routePath), 0.95);
    }
  }
}

function prepareAnimations() {
  if (!window.gsap) {
    document.body.classList.add("no-gsap");
    return;
  }

  gsap.defaults({ ease: "power3.out" });
  panels.forEach((panel) => {
    gsap.set(panel.querySelectorAll("[data-animate]"), { autoAlpha: 0 });
    panel.querySelectorAll('[data-animate="path"]').forEach(setupPath);
  });
}

function observePanels() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const index = panels.indexOf(entry.target);
        setActivePanel(index);
        playPanel(entry.target);
      });
    },
    { threshold: 0.58 },
  );

  panels.forEach((panel) => observer.observe(panel));
}

function setupPeopleScrollMotion() {
  if (!window.gsap || !window.ScrollTrigger) return;
  const panel = document.querySelector('[data-panel-theme="people-first"]');
  if (!panel) return;

  const orb = panel.querySelector('[data-animate="orb"]');
  const visual = panel.querySelector('[data-animate="main-visual"]');
  if (!orb || !visual) return;

  gsap.fromTo(
    orb,
    { scale: 0.78 },
    {
      scale: 1.26,
      ease: "none",
      scrollTrigger: {
        trigger: panel,
        start: "top bottom",
        end: "bottom top",
        scrub: 0.5,
      },
    },
  );

  gsap.fromTo(
    visual,
    { rotation: -5 },
    {
      rotation: 4,
      ease: "none",
      scrollTrigger: {
        trigger: panel,
        start: "top bottom",
        end: "bottom top",
        scrub: 0.5,
      },
    },
  );
}

dots.forEach((dot) => {
  dot.addEventListener("click", () => goToPanel(Number(dot.dataset.targetPanel)));
});

recordToggle.addEventListener("click", toggleAutoPlay);

window.addEventListener("keydown", (event) => {
  const forwardKeys = ["ArrowDown", "PageDown", " "];
  const backKeys = ["ArrowUp", "PageUp"];

  if (event.key.toLowerCase() === "r") {
    event.preventDefault();
    toggleAutoPlay();
    return;
  }

  if (forwardKeys.includes(event.key)) {
    event.preventDefault();
    goToPanel(panelIndexFromScrollTop() + 1);
    return;
  }

  if (backKeys.includes(event.key)) {
    event.preventDefault();
    goToPanel(panelIndexFromScrollTop() - 1);
  }
});

setActivePanel(0);
prepareAnimations();
observePanels();
setupPeopleScrollMotion();
playPanel(panels[0]);
