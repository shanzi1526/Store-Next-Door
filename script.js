const config = {
  autoPanelDwell: 1400,
  autoPanelScroll: 9000,
  minAutoDuration: 20000,
  panelEnd: "bottom top",
};

const panels = Array.from(document.querySelectorAll("section[data-panel]"));
const dots = Array.from(document.querySelectorAll(".dot"));
const recordControl = document.querySelector(".recording-control");
const recordToggle = document.querySelector("#recordToggle");
const recordState = document.querySelector("#recordState");

let autoScrollFrame = null;
let autoTimer = null;
let autoTimerResolve = null;
let autoRunToken = 0;
let isAutoScrolling = false;
let activePanel = 0;
const panelTriggers = new Map();

const qs = (root, selector) => Array.from(root.querySelectorAll(selector));
const group = (panel, name) => qs(panel, `[data-animate="${name}"]`);
const first = (panel, name) => panel.querySelector(`[data-animate="${name}"]`);

function setActivePanel(index) {
  activePanel = Math.max(0, Math.min(panels.length - 1, index));
  document.body.dataset.activePanel = String(activePanel);
  dots.forEach((dot, dotIndex) => dot.classList.toggle("is-active", dotIndex === activePanel));
}

function scrollToPanel(index) {
  const nextIndex = Math.max(0, Math.min(panels.length - 1, index));
  stopAutoScroll();
  panels[nextIndex].scrollIntoView({ behavior: "smooth", block: "start" });
  setActivePanel(nextIndex);
}

function stopAutoScroll() {
  if (autoScrollFrame) cancelAnimationFrame(autoScrollFrame);
  if (autoTimer) clearTimeout(autoTimer);
  if (autoTimerResolve) autoTimerResolve();
  autoRunToken += 1;
  autoScrollFrame = null;
  autoTimer = null;
  autoTimerResolve = null;
  isAutoScrolling = false;
  recordControl.classList.remove("is-recording");
  recordState.textContent = "Paused";
}

function sleep(ms, token) {
  return new Promise((resolve) => {
    autoTimerResolve = resolve;
    autoTimer = setTimeout(() => {
      autoTimer = null;
      autoTimerResolve = null;
      if (token === autoRunToken) resolve();
    }, ms);
  });
}

function smoothScrollTo(targetY, duration, token) {
  return new Promise((resolve) => {
    const startY = window.scrollY;
    const distance = targetY - startY;
    const startTime = performance.now();
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    const tick = (now) => {
      if (token !== autoRunToken || !isAutoScrolling) {
        resolve();
        return;
      }

      const progress = Math.min(1, (now - startTime) / duration);
      window.scrollTo(0, startY + distance * ease(progress));

      if (progress < 1) {
        autoScrollFrame = requestAnimationFrame(tick);
      } else {
        autoScrollFrame = null;
        resolve();
      }
    };

    autoScrollFrame = requestAnimationFrame(tick);
  });
}

function currentPanelIndex() {
  if (!window.ScrollTrigger) return activePanel;
  const y = window.scrollY;
  const matches = panels
    .map((panel, index) => ({ index, trigger: panelTriggers.get(panel) }))
    .filter(({ trigger }) => trigger && y >= trigger.start - 4 && y <= trigger.end + 4);

  if (matches.length) return matches[0].index;
  return panels.reduce((closest, panel, index) => {
    const trigger = panelTriggers.get(panel);
    if (!trigger) return closest;
    const distance = Math.abs(y - trigger.start);
    return distance < closest.distance ? { index, distance } : closest;
  }, { index: activePanel, distance: Infinity }).index;
}

async function runPanelSequence(token) {
  if (window.ScrollTrigger) ScrollTrigger.refresh();

  let index = currentPanelIndex();
  setActivePanel(index);

  while (isAutoScrolling && token === autoRunToken && index < panels.length) {
    const trigger = panelTriggers.get(panels[index]);
    const target = trigger ? trigger.end : panels[index].offsetTop + window.innerHeight;

    await sleep(config.autoPanelDwell, token);
    if (!isAutoScrolling || token !== autoRunToken) return;

    await smoothScrollTo(target, config.autoPanelScroll, token);
    if (!isAutoScrolling || token !== autoRunToken) return;

    index += 1;
    setActivePanel(Math.min(index, panels.length - 1));
  }

  if (token === autoRunToken) stopAutoScroll();
}

function startAutoScroll() {
  if (isAutoScrolling) {
    stopAutoScroll();
    return;
  }

  isAutoScrolling = true;
  autoRunToken += 1;
  const token = autoRunToken;
  recordControl.classList.add("is-recording");
  recordState.textContent = "Recording";
  runPanelSequence(token);
}

function createPinnedTimeline(panel) {
  const timeline = gsap.timeline({
    scrollTrigger: {
      trigger: panel,
      start: "top top",
      end: config.panelEnd,
      scrub: 1,
      pin: true,
    },
  });
  panelTriggers.set(panel, timeline.scrollTrigger);
  return timeline;
}

function addCommonCopy(timeline, panel) {
  const copy = first(panel, "copy");
  if (!copy) return timeline;

  return timeline
    .from(copy, { x: -38, autoAlpha: 0, duration: 0.18 })
    .to(copy, { y: -26, autoAlpha: 0.28, duration: 0.2 }, 0.86);
}

function animateStoryPanel(panel) {
  const timeline = createPinnedTimeline(panel);
  addCommonCopy(timeline, panel);

  timeline
    .from(group(panel, "anchor"), { y: 80, scale: 0.94, autoAlpha: 0, duration: 0.28 }, 0.05)
    .from(group(panel, "building"), { y: 55, autoAlpha: 0, stagger: 0.04, duration: 0.25 }, 0.1)
    .from(group(panel, "sky"), { y: -28, autoAlpha: 0, stagger: 0.05, duration: 0.22 }, 0.14)
    .from(group(panel, "figure"), {
      x: -55,
      autoAlpha: 0,
      stagger: 0.07,
      duration: 0.28,
    }, 0.22)
    .from(group(panel, "sticker"), {
      y: -24,
      rotation: -9,
      scale: 0.86,
      autoAlpha: 0,
      stagger: 0.08,
      duration: 0.22,
    }, 0.42)
    .to(panel.querySelector("[data-scene]"), { y: -60, scale: 0.97, duration: 0.32 }, 0.72);
}

function animateDiagramPanel(panel) {
  const timeline = createPinnedTimeline(panel);
  addCommonCopy(timeline, panel);

  timeline
    .from(group(panel, "anchor"), { scale: 0.78, autoAlpha: 0, duration: 0.24 }, 0.08)
    .from(group(panel, "orbit"), { scale: 0.45, autoAlpha: 0, stagger: 0.08, duration: 0.26 }, 0.16)
    .from(group(panel, "card"), { x: -50, y: 20, autoAlpha: 0, duration: 0.22 }, 0.24)
    .from(group(panel, "bar"), {
      scaleY: 0,
      transformOrigin: "bottom center",
      stagger: 0.06,
      duration: 0.26,
    }, 0.32)
    .from(group(panel, "node"), {
      scale: 0.78,
      autoAlpha: 0,
      stagger: 0.07,
      duration: 0.24,
    }, 0.42)
    .from(group(panel, "note"), { x: -24, autoAlpha: 0, duration: 0.18 }, 0.67)
    .to(panel.querySelector("[data-scene]"), { y: -44, duration: 0.24 }, 0.82);
}

function animateNetworkPanel(panel) {
  const timeline = createPinnedTimeline(panel);
  addCommonCopy(timeline, panel);

  timeline
    .from(group(panel, "anchor"), { scale: 0.72, rotation: -4, autoAlpha: 0, duration: 0.24 }, 0.08)
    .from(qs(panel, '[data-animate="lines"] path'), {
      strokeDasharray: 240,
      strokeDashoffset: 240,
      stagger: 0.035,
      duration: 0.34,
      ease: "none",
    }, 0.24)
    .from(group(panel, "node"), {
      y: 22,
      rotation: () => gsap.utils.random(-5, 5),
      scale: 0.84,
      autoAlpha: 0,
      stagger: 0.055,
      duration: 0.22,
    }, 0.34)
    .from(group(panel, "note"), { x: 24, autoAlpha: 0, duration: 0.2 }, 0.72)
    .to(panel.querySelector("[data-scene]"), { scale: 0.98, y: -28, duration: 0.22 }, 0.84);
}

function animatePanel(panel) {
  const theme = panel.dataset.panelTheme;
  if (theme === "story") animateStoryPanel(panel);
  else if (theme === "network") animateNetworkPanel(panel);
  else animateDiagramPanel(panel);
}

function animateGlobalPath() {
  const path = document.querySelector("#mainPath");
  if (!path) return;

  const length = path.getTotalLength();
  gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
  gsap.to(path, {
    strokeDashoffset: 0,
    ease: "none",
    scrollTrigger: {
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.8,
    },
  });
}

function watchPanelProgress() {
  panels.forEach((panel, index) => {
    ScrollTrigger.create({
      trigger: panel,
      start: "top center",
      end: "bottom center",
      onEnter: () => setActivePanel(index),
      onEnterBack: () => setActivePanel(index),
    });
  });
}

function initGsap() {
  if (!window.gsap || !window.ScrollTrigger) {
    document.body.classList.add("no-gsap");
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: "power3.out" });

  animateGlobalPath();
  watchPanelProgress();
  panels.forEach(animatePanel);
}

dots.forEach((dot) => {
  dot.addEventListener("click", () => scrollToPanel(Number(dot.dataset.targetPanel)));
});

recordToggle.addEventListener("click", startAutoScroll);

window.addEventListener("keydown", (event) => {
  const forwardKeys = ["ArrowDown", "PageDown", " "];
  const backKeys = ["ArrowUp", "PageUp"];

  if (event.key.toLowerCase() === "r") {
    event.preventDefault();
    startAutoScroll();
    return;
  }

  if (forwardKeys.includes(event.key)) {
    event.preventDefault();
    scrollToPanel(activePanel + 1);
    return;
  }

  if (backKeys.includes(event.key)) {
    event.preventDefault();
    scrollToPanel(activePanel - 1);
  }
});

setActivePanel(0);
initGsap();
