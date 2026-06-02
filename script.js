const panels = Array.from(document.querySelectorAll("section[data-panel]"));
const dots = Array.from(document.querySelectorAll(".dot"));
const recordControl = document.querySelector(".recording-control");
const recordToggle = document.querySelector("#recordToggle");
const recordState = document.querySelector("#recordState");

const autoConfig = {
  dwell: 4300,
  settle: 1350,
};

let activePanel = 0;
let isAutoPlaying = false;
let autoTimer = null;
let autoRunToken = 0;
const timelines = new WeakMap();

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

function drawPath(path, position = 0.2) {
  if (!path) return {};
  return {
    strokeDashoffset: 0,
    duration: 1.35,
    ease: "power2.inOut",
  };
}

function playPanel(panel) {
  if (!window.gsap || !panel) return;

  const existing = timelines.get(panel);
  if (existing) existing.kill();

  const theme = panel.dataset.panelTheme;
  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
  timelines.set(panel, tl);

  if (theme === "cover") {
    tl.fromTo(
      panel.querySelectorAll('[data-animate="layer"]'),
      { y: -22, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.09 },
      0,
    )
      .fromTo(
        panel.querySelectorAll('[data-animate="building"]'),
        { y: 54, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.9, stagger: 0.12 },
        0.16,
      )
      .fromTo(
        panel.querySelector('[data-animate="store"]'),
        { y: 78, scale: 0.96, autoAlpha: 0 },
        { y: 0, scale: 1, autoAlpha: 1, duration: 1 },
        0.24,
      )
      .to(panel.querySelector('[data-animate="path"]'), drawPath(panel.querySelector('[data-animate="path"]')), 0.68)
      .fromTo(
        panel.querySelectorAll('[data-animate="figure"]'),
        { x: -40, y: 24, autoAlpha: 0 },
        { x: 0, y: 0, autoAlpha: 1, duration: 0.82, stagger: 0.13 },
        0.86,
      )
      .fromTo(
        panel.querySelectorAll('[data-animate="label"]'),
        { y: 24, rotation: -3, autoAlpha: 0 },
        { y: 0, rotation: 0, autoAlpha: 1, duration: 0.62, stagger: 0.1 },
        1.15,
      );
    return;
  }

  if (theme === "ageing") {
    tl.fromTo(
      panel.querySelector('[data-animate="title"]'),
      { x: -38, y: 14, autoAlpha: 0 },
      { x: 0, y: 0, autoAlpha: 1, duration: 0.72 },
      0,
    )
      .to(panel.querySelector('[data-animate="path"]'), drawPath(panel.querySelector('[data-animate="path"]')), 0.24)
      .fromTo(
        panel.querySelectorAll('[data-animate="node"]'),
        { y: 32, scale: 0.92, autoAlpha: 0 },
        { y: 0, scale: 1, autoAlpha: 1, duration: 0.72, stagger: 0.16 },
        0.36,
      )
      .fromTo(
        panel.querySelector('[data-animate="figure"]'),
        { x: -34, autoAlpha: 0 },
        { x: 0, autoAlpha: 1, duration: 0.78 },
        0.82,
      )
      .fromTo(
        panel.querySelector('[data-animate="chart"]'),
        { x: 32, y: -12, autoAlpha: 0 },
        { x: 0, y: 0, autoAlpha: 1, duration: 0.7 },
        0.95,
      )
      .fromTo(
        panel.querySelectorAll('[data-animate="bar"]'),
        { scaleY: 0 },
        { scaleY: 1, duration: 0.55, stagger: 0.09 },
        1.2,
      )
      .fromTo(
        panel.querySelectorAll('[data-animate="label"]'),
        { y: 20, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.1 },
        1.45,
      );
    return;
  }

  tl.fromTo(
    panel.querySelector('[data-animate="title"]'),
    { x: -36, rotation: -3, autoAlpha: 0 },
    { x: 0, rotation: 0, autoAlpha: 1, duration: 0.7 },
    0,
  )
    .fromTo(
      panel.querySelector('[data-animate="shopper"]'),
      { y: 46, scale: 0.96, autoAlpha: 0 },
      { y: 0, scale: 1, autoAlpha: 1, duration: 0.86 },
      0.18,
    )
    .to(panel.querySelector('[data-animate="path"]'), drawPath(panel.querySelector('[data-animate="path"]')), 0.38)
    .fromTo(
      panel.querySelectorAll('[data-animate="paper"]'),
      {
        x: () => gsap.utils.random(-34, 34),
        y: -56,
        rotation: () => gsap.utils.random(-8, 8),
        scale: 0.92,
        autoAlpha: 0,
      },
      {
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
        autoAlpha: 1,
        duration: 0.66,
        stagger: 0.11,
        ease: "back.out(1.3)",
      },
      0.72,
    );
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
    goToPanel(activePanel + 1);
    return;
  }

  if (backKeys.includes(event.key)) {
    event.preventDefault();
    goToPanel(activePanel - 1);
  }
});

setActivePanel(0);
prepareAnimations();
observePanels();
playPanel(panels[0]);
