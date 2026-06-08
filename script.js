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
let scrollTween = null;
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

function goToPanel(index, { keepAuto = false, duration = null, ease = "power2.inOut" } = {}) {
  const nextIndex = clampPanel(index);
  if (!keepAuto) stopAutoPlay();
  if (duration) {
    scrollToTop(panels[nextIndex].offsetTop, { duration, ease });
  } else {
    panels[nextIndex].scrollIntoView({ behavior: "smooth", block: "start" });
  }
  setActivePanel(nextIndex);
}

function scrollToTop(top, { duration = 1.2, ease = "power2.inOut" } = {}) {
  const targetTop = Math.max(0, Math.min(top, document.documentElement.scrollHeight - window.innerHeight));

  if (scrollTween) scrollTween.kill();

  if (!window.gsap || duration <= 0) {
    window.scrollTo({ top: targetTop, behavior: "smooth" });
    return;
  }

  const scrollState = { y: window.scrollY };
  scrollTween = gsap.to(scrollState, {
    y: targetTop,
    duration,
    ease,
    overwrite: true,
    onUpdate: () => window.scrollTo(0, scrollState.y),
    onComplete: () => {
      scrollTween = null;
    },
  });
}

function peopleTextStop(panel) {
  return panel.offsetTop + window.innerHeight * 0.62;
}

function busStoryStops(panel) {
  const finalStop = panel.offsetTop + panel.offsetHeight - window.innerHeight - 4;
  const scrollRange = panel.offsetHeight - window.innerHeight;
  return [panel.offsetTop + scrollRange * 0.44, panel.offsetTop + scrollRange * 0.68, finalStop];
}

function literatureEvidenceStop(panel) {
  return {
    top: panel.offsetTop + panel.offsetHeight * 0.36,
    duration: 5,
    ease: "none",
  };
}

function normalizeStop(stop) {
  if (stop === null) return null;
  if (typeof stop === "number") return { top: stop, duration: 1.2 };
  return stop;
}

function isBeforePeopleText(panel) {
  return panel?.dataset.panelTheme === "people-first" && window.scrollY < peopleTextStop(panel) - 80;
}

function isAfterPeopleText(panel) {
  return panel?.dataset.panelTheme === "people-first" && window.scrollY > peopleTextStop(panel) - 80;
}

function nextInternalStop(panel) {
  if (isBeforePeopleText(panel)) return peopleTextStop(panel);
  if (panel?.dataset.panelTheme === "main-statement") {
    return busStoryStops(panel).find((stop) => window.scrollY < stop - 80) ?? null;
  }
  if (panel?.dataset.panelTheme === "literature-evidence") {
    const stop = literatureEvidenceStop(panel);
    return window.scrollY < stop.top - 80 ? stop : null;
  }
  return null;
}

function panelEntryStop(panel) {
  if (panel?.dataset.panelTheme === "literature-evidence") return literatureEvidenceStop(panel);
  return null;
}

function previousInternalStop(panel) {
  if (isAfterPeopleText(panel)) return panel.offsetTop;
  if (panel?.dataset.panelTheme === "main-statement") {
    const stops = [panel.offsetTop, ...busStoryStops(panel)];
    return stops.reverse().find((stop) => window.scrollY > stop + 80) ?? null;
  }
  if (panel?.dataset.panelTheme === "literature-evidence") {
    return window.scrollY > panel.offsetTop + 120 ? { top: panel.offsetTop, duration: 3.8, ease: "none" } : null;
  }
  return null;
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

    const internalStop = nextInternalStop(panels[index]);
    if (internalStop !== null) {
      const target = normalizeStop(internalStop);
      scrollToTop(target.top, { duration: target.duration, ease: target.ease });
      await wait(target.duration * 1000 + 350, token);
      if (!isAutoPlaying || token !== autoRunToken) return;
      continue;
    }

    const currentPanel = panels[index];
    index += 1;
    const entryStop = panelEntryStop(panels[index]);
    if (entryStop) {
      setActivePanel(index);
      scrollToTop(entryStop.top, { duration: entryStop.duration, ease: entryStop.ease });
      await wait(entryStop.duration * 1000 + 250, token);
    } else {
      const duration = currentPanel?.dataset.panelTheme === "literature-evidence" ? 3.2 : null;
      const ease = currentPanel?.dataset.panelTheme === "literature-evidence" ? "none" : "power2.inOut";
      goToPanel(index, { keepAuto: true, duration, ease });
      await wait(duration ? duration * 1000 + 250 : autoConfig.settle, token);
    }
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
    playedPanels.add(panel);
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
    { threshold: 0.32 },
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
    { scale: 0.62 },
    {
      scale: 1.52,
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
    { rotation: -11 },
    {
      rotation: 9,
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

function setupBusScrollMotion() {
  if (!window.gsap || !window.ScrollTrigger) return;
  const panel = document.querySelector('[data-panel-theme="main-statement"]');
  if (!panel) return;

  const lineOne = panel.querySelector('[data-animate="title"]');
  const lineTwo = panel.querySelector('[data-animate="title-alt"]');
  const lineThree = panel.querySelector('[data-animate="title-final"]');
  const busStop = panel.querySelector('[data-animate="bus-stop"]');
  const bus = panel.querySelector('[data-animate="bus"]');
  const caption = panel.querySelector('[data-animate="subtitle"]');
  const ground = panel.querySelector('[data-animate="paper-layer"]');
  const routePath = panel.querySelector('[data-animate="path"]');

  if (!lineOne || !lineTwo || !lineThree || !busStop || !bus) return;

  gsap.set([lineOne, lineTwo, lineThree], {
    xPercent: -50,
    yPercent: -50,
    y: 0,
    scale: 1,
  });
  gsap.set(lineOne, { autoAlpha: 1 });
  gsap.set([lineTwo, lineThree], { autoAlpha: 0 });
  gsap.set([busStop, bus], { autoAlpha: 0 });
  if (ground) gsap.set(ground, { autoAlpha: 0 });
  if (caption) gsap.set(caption, { xPercent: -50, autoAlpha: 0, y: 0, rotation: -1.4 });
  if (routePath) {
    setupPath(routePath);
    gsap.set(routePath, { autoAlpha: 0 });
  }

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: panel,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.8,
    },
  });

  tl.to(lineOne, { autoAlpha: 1, duration: 0.16, ease: "none" }, 0)
    .to(lineOne, { autoAlpha: 0.02, scale: 0.96, y: -26, duration: 0.12, ease: "none" }, 0.24)
    .fromTo(
      lineTwo,
      { xPercent: -50, yPercent: -50, autoAlpha: 0, scale: 1.05, y: 18 },
      { xPercent: -50, yPercent: -50, autoAlpha: 1, scale: 1, y: 0, duration: 0.12, ease: "none" },
      0.34,
    )
    .to(lineTwo, { autoAlpha: 0.02, scale: 0.96, y: -28, duration: 0.12, ease: "none" }, 0.52)
    .fromTo(
      lineThree,
      { xPercent: -50, yPercent: -50, autoAlpha: 0, scale: 1.05, y: 24 },
      { xPercent: -50, yPercent: -50, autoAlpha: 1, scale: 1, y: 0, duration: 0.16, ease: "none" },
      0.56,
    )
    .to(lineThree, { autoAlpha: 1, y: 0, duration: 0.18, ease: "none" }, 0.68)
    .to(lineThree, { autoAlpha: 0.42, y: -46, duration: 0.16, ease: "none" }, 0.82)
    .fromTo(
      ground,
      { autoAlpha: 0, yPercent: 44 },
      { autoAlpha: 1, yPercent: 0, duration: 0.18, ease: "none" },
      0.8,
    )
    .fromTo(
      busStop,
      { autoAlpha: 0, yPercent: 68, scale: 0.92, rotation: -2 },
      { autoAlpha: 1, yPercent: 0, scale: 1, rotation: 0, duration: 0.22, ease: "none" },
      0.84,
    )
    .fromTo(
      bus,
      { autoAlpha: 0, xPercent: 86, yPercent: 30, scale: 0.28, rotation: -8 },
      { autoAlpha: 1, xPercent: 0, yPercent: 0, scale: 1, rotation: 0, duration: 0.24, ease: "none" },
      0.88,
    )
    .fromTo(
      caption,
      { xPercent: -50, autoAlpha: 0, y: 28, rotation: -3 },
      { xPercent: -50, autoAlpha: 1, y: 0, rotation: -1.4, duration: 0.14, ease: "none" },
      0.94,
    );

  if (routePath) {
    tl.to(routePath, { autoAlpha: 1, strokeDashoffset: 0, duration: 0.2, ease: "none" }, 0.86);
  }
}

function setupLiteratureEvidenceMotion() {
  if (!window.gsap || !window.ScrollTrigger) return;
  const panel = document.querySelector('[data-panel-theme="literature-evidence"]');
  if (!panel) return;

  const list = panel.querySelector('[data-animate="evidence-list"]');
  const receipt = panel.querySelector('[data-animate="evidence-receipt"]');
  const shadow = panel.querySelector('[data-animate="evidence-shadow"]');
  const reading = panel.querySelector('[data-animate="evidence-card"]');
  if (!list || !receipt || !shadow || !reading) return;

  gsap.set(reading, { autoAlpha: 1, y: 10 });
  gsap.set(receipt, { autoAlpha: 1, left: "24vw", top: "-22vh", rotation: -12, scale: 0.9 });
  gsap.set(list, { autoAlpha: 1, left: "10vw", top: "-34vh", rotation: 10, scale: 0.86 });
  gsap.set(shadow, { autoAlpha: 0, scaleX: 0.82, scaleY: 0.72 });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: panel,
      start: "top bottom",
      end: () => `+=${window.innerHeight + panel.offsetHeight * 0.36}`,
      scrub: 0.8,
    },
  });

  tl.to(reading, { y: -8, ease: "none", duration: 1 }, 0)
    .to(receipt, { left: "22vw", top: "96vh", rotation: 4, scale: 0.91, ease: "none", duration: 1 }, 0)
    .to(list, { left: "12vw", top: "84vh", rotation: -5, scale: 0.86, ease: "none", duration: 1 }, 0)
    .to(shadow, { autoAlpha: 0.38, scaleX: 0.78, scaleY: 0.68, ease: "none", duration: 1 }, 0);
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
    const currentIndex = panelIndexFromScrollTop();
    const currentPanel = panels[currentIndex];
    const internalStop = nextInternalStop(currentPanel);
    if (internalStop !== null) {
      const target = normalizeStop(internalStop);
      stopAutoPlay();
      scrollToTop(target.top, { duration: target.duration, ease: target.ease });
      return;
    }
    if (currentIndex >= panels.length - 1) return;
    const nextIndex = clampPanel(currentIndex + 1);
    const entryStop = panelEntryStop(panels[nextIndex]);
    if (entryStop) {
      stopAutoPlay();
      setActivePanel(nextIndex);
      scrollToTop(entryStop.top, { duration: entryStop.duration, ease: entryStop.ease });
      return;
    }
    const duration = currentPanel?.dataset.panelTheme === "literature-evidence" ? 3.2 : null;
    const ease = currentPanel?.dataset.panelTheme === "literature-evidence" ? "none" : "power2.inOut";
    goToPanel(nextIndex, { duration, ease });
    return;
  }

  if (backKeys.includes(event.key)) {
    event.preventDefault();
    const currentIndex = panelIndexFromScrollTop();
    const currentPanel = panels[currentIndex];
    const internalStop = previousInternalStop(currentPanel);
    if (internalStop !== null) {
      const target = normalizeStop(internalStop);
      stopAutoPlay();
      scrollToTop(target.top, { duration: target.duration, ease: target.ease });
      return;
    }
    const duration = currentPanel?.dataset.panelTheme === "literature-evidence" ? 3.2 : null;
    const ease = currentPanel?.dataset.panelTheme === "literature-evidence" ? "none" : "power2.inOut";
    goToPanel(currentIndex - 1, { duration, ease });
  }
});

setActivePanel(0);
prepareAnimations();
observePanels();
setupPeopleScrollMotion();
setupBusScrollMotion();
setupLiteratureEvidenceMotion();
playPanel(panels[0]);
