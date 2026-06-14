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

function panelExitTransition(panel) {
  if (panel?.dataset.panelTheme === "silver-economy") {
    return {
      duration: 2.45,
      ease: "none",
    };
  }
  if (panel?.dataset.panelTheme === "history-float") {
    return {
      duration: 3.1,
      ease: "none",
    };
  }
  return null;
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

function communityObjectStop(panel) {
  const scrollRange = Math.max(window.innerHeight * 1.45, panel.offsetHeight - window.innerHeight);
  return {
    top: panel.offsetTop + scrollRange * 0.88,
    duration: 4.8,
    ease: "none",
  };
}

function silverEconomyBaseRange(panel) {
  return Math.max(window.innerHeight * 2.55, panel.offsetHeight - window.innerHeight);
}

function silverEconomyPinRange(panel) {
  const baseRange = silverEconomyBaseRange(panel);
  return Math.min(panel.offsetHeight - window.innerHeight * 0.04, baseRange + window.innerHeight * 0.72);
}

function silverEconomyStop(panel) {
  const scrollRange = silverEconomyBaseRange(panel);
  return {
    top: panel.offsetTop + scrollRange * 0.92,
    duration: 5.8,
    ease: "none",
  };
}

function busStoryStops(panel) {
  const finalStop = panel.offsetTop + panel.offsetHeight - window.innerHeight - 4;
  const scrollRange = panel.offsetHeight - window.innerHeight;
  return [panel.offsetTop + scrollRange * 0.44, panel.offsetTop + scrollRange * 0.68, finalStop];
}

function literatureEvidenceStop(panel) {
  const stopBeforeStickyRelease = panel.offsetTop + Math.max(0, panel.offsetHeight - window.innerHeight * 1.08);
  return {
    top: stopBeforeStickyRelease,
    duration: 4.35,
    ease: "none",
  };
}

function literatureSupportStop(panel) {
  const scrollRange = Math.max(window.innerHeight * 3, panel.offsetHeight - window.innerHeight);
  return {
    top: panel.offsetTop + scrollRange * 0.9,
    duration: 6.4,
    ease: "none",
  };
}

function historyFloatStops(panel) {
  const scrollRange = Math.max(window.innerHeight * 3.15, panel.offsetHeight - window.innerHeight);
  return [
    {
      top: panel.offsetTop + scrollRange * 0.43,
      duration: 3.35,
      ease: "none",
    },
    {
      top: panel.offsetTop + scrollRange * 0.985,
      duration: 6.4,
      ease: "none",
    },
  ];
}

function theoryCriteriaStops(panel) {
  const scrollRange = Math.max(window.innerHeight * 2.8, panel.offsetHeight - window.innerHeight);
  return [
    {
      top: panel.offsetTop + scrollRange * 0.22,
      duration: 2.2,
      ease: "none",
    },
    {
      top: panel.offsetTop + scrollRange * 0.41,
      duration: 2.4,
      ease: "none",
    },
    {
      top: panel.offsetTop + scrollRange * 0.82,
      duration: 3.1,
      ease: "none",
    },
  ];
}

function theoryCriteriaStop(panel) {
  return theoryCriteriaStops(panel).at(-1);
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
  if (panel?.dataset.panelTheme === "community-object") {
    const stop = communityObjectStop(panel);
    return window.scrollY < stop.top - 80 ? stop : null;
  }
  if (panel?.dataset.panelTheme === "silver-economy") {
    const stop = silverEconomyStop(panel);
    return window.scrollY < stop.top - 80 ? stop : null;
  }
  if (isBeforePeopleText(panel)) return peopleTextStop(panel);
  if (panel?.dataset.panelTheme === "main-statement") {
    return busStoryStops(panel).find((stop) => window.scrollY < stop - 80) ?? null;
  }
  if (panel?.dataset.panelTheme === "literature-evidence") {
    const stop = literatureEvidenceStop(panel);
    return window.scrollY < stop.top - 80 ? stop : null;
  }
  if (panel?.dataset.panelTheme === "literature-support") {
    const stop = literatureSupportStop(panel);
    return window.scrollY < stop.top - 80 ? stop : null;
  }
  if (panel?.dataset.panelTheme === "history-float") {
    return historyFloatStops(panel).find((stop) => window.scrollY < stop.top - 150) ?? null;
  }
  if (panel?.dataset.panelTheme === "theory-criteria") {
    return theoryCriteriaStops(panel).find((stop) => window.scrollY < stop.top - 80) ?? null;
  }
  return null;
}

function panelEntryStop(panel) {
  if (panel?.dataset.panelTheme === "community-object") return communityObjectStop(panel);
  if (panel?.dataset.panelTheme === "silver-economy") return silverEconomyStop(panel);
  if (panel?.dataset.panelTheme === "people-first") {
    return {
      top: panel.offsetTop + Math.min(window.innerHeight * 0.14, 150),
      duration: 2.65,
      ease: "power1.inOut",
    };
  }
  if (panel?.dataset.panelTheme === "literature-evidence") return literatureEvidenceStop(panel);
  if (panel?.dataset.panelTheme === "history-float") return historyFloatStops(panel)[0];
  if (panel?.dataset.panelTheme === "literature-support") return literatureSupportStop(panel);
  if (panel?.dataset.panelTheme === "theory-criteria") return theoryCriteriaStops(panel)[0];
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
  if (panel?.dataset.panelTheme === "literature-support") {
    return window.scrollY > panel.offsetTop + 120 ? { top: panel.offsetTop, duration: 5.2, ease: "none" } : null;
  }
  if (panel?.dataset.panelTheme === "history-float") {
    const stops = [
      { top: panel.offsetTop, duration: 2.35, ease: "none" },
      ...historyFloatStops(panel),
    ];
    return stops.reverse().find((stop) => window.scrollY > stop.top + 80) ?? null;
  }
  if (panel?.dataset.panelTheme === "community-object") {
    return window.scrollY > panel.offsetTop + 120 ? { top: panel.offsetTop, duration: 3.4, ease: "none" } : null;
  }
  if (panel?.dataset.panelTheme === "silver-economy") {
    return window.scrollY > panel.offsetTop + 120 ? { top: panel.offsetTop, duration: 4.2, ease: "none" } : null;
  }
  if (panel?.dataset.panelTheme === "theory-criteria") {
    const stops = [
      { top: panel.offsetTop, duration: 2.2, ease: "none" },
      ...theoryCriteriaStops(panel),
    ];
    return stops.reverse().find((stop) => window.scrollY > stop.top + 80) ?? null;
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

function updateTheoryCriteriaState() {
  const panel = document.querySelector('[data-panel-theme="theory-criteria"]');
  if (!panel) return;
  const top = window.scrollY + window.innerHeight * 0.5;
  document.body.classList.toggle("is-theory-criteria-active", top >= panel.offsetTop && top <= panel.offsetTop + panel.offsetHeight);
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
    const nextPanel = panels[index];
    const shouldUseEntryStop = !(currentPanel?.dataset.panelTheme === "history-float" && nextPanel?.dataset.panelTheme === "literature-support");
    const entryStop = shouldUseEntryStop ? panelEntryStop(nextPanel) : null;
    if (entryStop) {
      setActivePanel(index);
      scrollToTop(entryStop.top, { duration: entryStop.duration, ease: entryStop.ease });
      await wait(entryStop.duration * 1000 + 250, token);
    } else {
      const exitTransition = panelExitTransition(currentPanel);
      const duration = exitTransition?.duration ?? (currentPanel?.dataset.panelTheme === "literature-evidence" ? 3.2 : null);
      const ease = exitTransition?.ease ?? (currentPanel?.dataset.panelTheme === "literature-evidence" ? "none" : "power2.inOut");
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

function setupCommunityObjectMotion() {
  if (!window.gsap || !window.ScrollTrigger) return;
  const panel = document.querySelector('[data-panel-theme="community-object"]');
  if (!panel) return;

  const stage = panel.querySelector(".community-object-stage");
  const reveal = panel.querySelector(".community-object-reveal");
  const image = panel.querySelector('[data-animate="community-image"]');
  const label = panel.querySelector('[data-animate="community-label"]');
  const title = panel.querySelector('[data-animate="community-title"]');
  const subtitle = panel.querySelector('[data-animate="community-subtitle"]');
  const tags = Array.from(panel.querySelectorAll('[data-animate="community-tag"]'));
  const marquee = panel.querySelector('[data-animate="community-marquee"]');
  if (!stage || !reveal || !image || !label || !title || !subtitle || !marquee) return;

  gsap.set(reveal, { autoAlpha: 1, xPercent: 0, yPercent: 0, rotation: 0.4 });
  gsap.set(image, { autoAlpha: 0, xPercent: 1.4, yPercent: -7, scale: 1.06 });
  gsap.set(label, { autoAlpha: 0, x: -22, y: 28 });
  gsap.set(title, { autoAlpha: 0, x: -32, y: 52 });
  gsap.set(subtitle, { autoAlpha: 0, x: -18, y: 34 });
  gsap.set(tags, { autoAlpha: 0, x: -12, y: 24 });
  gsap.set(marquee, { autoAlpha: 0, xPercent: 18, yPercent: 10 });

  const enterTl = gsap.timeline({
    scrollTrigger: {
      trigger: panel,
      start: "top bottom",
      end: "top top",
      scrub: 0.65,
      invalidateOnRefresh: true,
    },
    defaults: { ease: "none" },
  });

  enterTl
    .to(reveal, { xPercent: 106, yPercent: -1.5, rotation: -1.2, duration: 1 }, 0)
    .to(image, { autoAlpha: 1, xPercent: 0, yPercent: -2.5, scale: 1.035, duration: 0.88 }, 0.08)
    .to(marquee, { autoAlpha: 1, xPercent: 5, yPercent: 0, duration: 0.8 }, 0.2)
    .to(label, { autoAlpha: 1, x: 0, y: 0, duration: 0.38 }, 0.34)
    .to(title, { autoAlpha: 1, x: 0, y: 0, duration: 0.52 }, 0.42)
    .to(subtitle, { autoAlpha: 1, x: 0, y: 0, duration: 0.38 }, 0.62)
    .to(tags, { autoAlpha: 1, x: 0, y: 0, stagger: 0.06, duration: 0.34 }, 0.72);

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: panel,
      start: "top top",
      end: () => `+=${Math.max(window.innerHeight * 1.45, panel.offsetHeight - window.innerHeight)}`,
      pin: stage,
      pinSpacing: false,
      scrub: 0.85,
      invalidateOnRefresh: true,
    },
    defaults: { ease: "none" },
  });

  tl.to(image, { yPercent: 5.8, scale: 1.015, duration: 2.4 }, 0)
    .to(marquee, { xPercent: -18, duration: 2.4 }, 0)
    .to([label, title, subtitle], { y: -8, duration: 1.2 }, 1.2)
    .to(tags, { y: -6, duration: 1.2 }, 1.2);
}

function setupSilverEconomyMotion() {
  if (!window.gsap || !window.ScrollTrigger) return;
  const panel = document.querySelector('[data-panel-theme="silver-economy"]');
  if (!panel) return;

  const stage = panel.querySelector(".silver-stage");
  const words = Array.from(panel.querySelectorAll('[data-animate="silver-word"]'));
  const base = panel.querySelector('[data-animate="silver-base"]');
  const milk = panel.querySelector('[data-animate="silver-milk"]');
  const copy = panel.querySelector('[data-animate="silver-copy"]');
  const report = panel.querySelector('[data-animate="silver-report"]');
  if (!stage || !words.length || !base || !milk || !copy || !report) return;

  gsap.set(stage, { backgroundColor: "#dcdaf4" });
  gsap.set(words, { autoAlpha: 1, x: 0, y: 0, scale: 1 });
  gsap.set(base, { autoAlpha: 0, y: "2vh", scale: 0.995, rotation: 0 });
  gsap.set(milk, { autoAlpha: 0, x: "-2vw", y: "4vh", rotation: -3, scale: 1 });
  gsap.set(copy, { autoAlpha: 0, y: 42 });
  gsap.set(report, { autoAlpha: 0, yPercent: 118, scale: 0.98 });

  const wordMoves = [
    { autoAlpha: 0.08 },
    { autoAlpha: 0.12 },
    { autoAlpha: 0.05 },
    { autoAlpha: 0.1 },
  ];
  const endHoldDuration = 1.4;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: panel,
      start: "top top",
      end: () => `+=${silverEconomyPinRange(panel)}`,
      pin: stage,
      pinSpacing: false,
      anticipatePin: 1,
      scrub: 0.85,
      invalidateOnRefresh: true,
    },
    defaults: { ease: "none" },
  });

  tl.to(stage, { backgroundColor: "#f3ccd2", duration: 1.25 }, 0)
    .to(words, {
      xPercent: 0,
      yPercent: 0,
      autoAlpha: (index) => wordMoves[index]?.autoAlpha ?? 0.1,
      scale: 0.992,
      stagger: 0.16,
      duration: 0.72,
      ease: "power2.inOut",
    }, 0.12)
    .to(milk, { autoAlpha: 1, x: "-2vw", y: "4vh", rotation: -3, scale: 1, duration: 0.95, ease: "power3.out" }, 1.16)
    .to(base, { autoAlpha: 1, y: 0, scale: 1, rotation: 0, duration: 1.05, ease: "power3.out" }, 1.22)
    .to(copy, { autoAlpha: 1, y: 0, duration: 0.72, ease: "power2.out" }, 1.88)
    .to(milk, { x: "2vw", y: "-4vh", rotation: 1, duration: 1.4, ease: "power2.inOut" }, 2.1)
    .to(base, { y: 0, scale: 1, duration: 1.4, ease: "power2.inOut" }, 2.1)
    .to(copy, { autoAlpha: 0.28, y: -20, duration: 0.72, ease: "power2.inOut" }, 3.1)
    .to(report, { autoAlpha: 1, yPercent: 0, scale: 1, duration: 0.9, ease: "power3.out" }, 3.22)
    .to(milk, { x: "2vw", y: "-4vh", duration: 0.9 }, 3.42)
    .to([base, report], { duration: 0.72 }, 4.08)
    .to([base, milk, report], { duration: endHoldDuration }, 4.8);
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

  gsap.set(reading, { autoAlpha: 1, y: 0 });
  gsap.set(receipt, { autoAlpha: 1, left: "24vw", top: "-22vh", rotation: -12, scale: 0.9 });
  gsap.set(list, { autoAlpha: 1, left: "10vw", top: "-34vh", rotation: 10, scale: 0.86 });
  gsap.set(shadow, { autoAlpha: 0, scaleX: 0.82, scaleY: 0.72 });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: panel,
      start: "top bottom",
      end: () => `+=${Math.max(window.innerHeight, panel.offsetHeight - window.innerHeight * 0.08)}`,
      scrub: 0.8,
    },
  });

  tl.to(reading, { y: 0, ease: "none", duration: 1 }, 0)
    .to(receipt, { left: "22vw", top: "76vh", rotation: 4, scale: 0.88, ease: "none", duration: 1 }, 0)
    .to(list, { left: "12vw", top: "64vh", rotation: -5, scale: 0.84, ease: "none", duration: 1 }, 0)
    .to(shadow, { autoAlpha: 0.32, scaleX: 0.74, scaleY: 0.62, ease: "none", duration: 1 }, 0);
}

function setupLiteratureSupportMotion() {
  if (!window.gsap || !window.ScrollTrigger) return;
  const panel = document.querySelector('[data-panel-theme="literature-support"]');
  if (!panel) return;

  const stage = panel.querySelector(".lens-stage");
  const texture = panel.querySelector('[data-animate="lens-texture"]');
  const backdrop = panel.querySelector('[data-animate="literature-backdrop"]');
  const opening = panel.querySelector('[data-animate="literature-opening"]');
  const kicker = panel.querySelector('[data-animate="literature-kicker"]');
  const title = panel.querySelector('[data-animate="literature-title"]');
  const subtitle = panel.querySelector('[data-animate="literature-subtitle"]');
  const desk = panel.querySelector('[data-animate="literature-desk"]');
  const card01 = panel.querySelector('[data-lens-card="01"]');
  const card02 = panel.querySelector('[data-lens-card="02"]');
  const card03 = panel.querySelector('[data-lens-card="03"]');
  const card04 = panel.querySelector('[data-lens-card="04"]');
  const card05 = panel.querySelector('[data-lens-card="05"]');
  if (!stage || !texture || !backdrop || !opening || !kicker || !title || !subtitle || !desk || !card01 || !card02 || !card03 || !card04 || !card05) return;

  const allCards = [card01, card02, card03, card04, card05];

  gsap.set(panel, { backgroundColor: "transparent" });
  gsap.set(stage, { backgroundColor: "rgba(20, 63, 54, 0)" });
  gsap.set(texture, { autoAlpha: 0 });
  gsap.set(backdrop, { autoAlpha: 0, xPercent: 6, scale: 0.96 });
  gsap.set([kicker, title, subtitle], { autoAlpha: 0, x: 44 });
  gsap.set(opening, { y: 0 });
  gsap.set(desk, { xPercent: 66, yPercent: 0, scale: 1.07, rotation: 0 });
  gsap.set(allCards, { autoAlpha: 0 });
  gsap.set(card01, { xPercent: 145, yPercent: 8, scale: 1.08, rotation: -8 });
  gsap.set(card02, { xPercent: 136, yPercent: -4, scale: 1.05, rotation: 7 });
  gsap.set(card03, { xPercent: 128, yPercent: 6, scale: 1.08, rotation: -6 });
  gsap.set(card04, { xPercent: 120, yPercent: -3, scale: 1.06, rotation: 8 });
  gsap.set(card05, { xPercent: 112, yPercent: 5, scale: 1.08, rotation: -9 });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: panel,
      start: "top top",
      end: () => `+=${Math.max(window.innerHeight * 3, panel.offsetHeight - window.innerHeight)}`,
      pin: stage,
      pinSpacing: false,
      scrub: 0.9,
      invalidateOnRefresh: true,
    },
    defaults: { ease: "power3.inOut" },
  });

  tl.to(stage, { backgroundColor: "rgba(20, 63, 54, 1)", duration: 0.75, ease: "none" }, 0)
    .to(texture, { autoAlpha: 1, duration: 0.75, ease: "none" }, 0)
    .to(backdrop, { autoAlpha: 1, xPercent: 0, scale: 1, duration: 0.8, ease: "power2.out" }, 0.08)
    .to(kicker, { autoAlpha: 1, x: 0, duration: 0.34, ease: "power2.out" }, 0.22)
    .to(title, { autoAlpha: 1, x: 0, duration: 0.48, ease: "power3.out" }, 0.36)
    .to(subtitle, { autoAlpha: 1, x: 0, duration: 0.38, ease: "power2.out" }, 0.58)
    .to(desk, { autoAlpha: 1, xPercent: 0, scale: 1, duration: 1.75, ease: "power2.inOut" }, 0.44)
    .to(card01, { autoAlpha: 1, xPercent: 0, yPercent: 0, scale: 1, rotation: -4, duration: 1.22, ease: "power3.out" }, 0.58)
    .to(card02, { autoAlpha: 1, xPercent: 0, yPercent: 0, scale: 1, rotation: 3, duration: 1.22, ease: "power3.out" }, 0.78)
    .to(card03, { autoAlpha: 1, xPercent: 0, yPercent: 0, scale: 1, rotation: -2, duration: 1.22, ease: "power3.out" }, 0.98)
    .to(card04, { autoAlpha: 1, xPercent: 0, yPercent: 0, scale: 1, rotation: 4, duration: 1.22, ease: "power3.out" }, 1.18)
    .to(card05, { autoAlpha: 1, xPercent: 0, yPercent: 0, scale: 1, rotation: -5, duration: 1.22, ease: "power3.out" }, 1.38)
    .to(backdrop, { xPercent: -7, scale: 1.04, duration: 3.2, ease: "none" }, 1.25)
    .to(opening, { x: -18, autoAlpha: 0.72, duration: 1.6, ease: "none" }, 1.85)
    .to(desk, { xPercent: 0, scale: 1.02, duration: 1.8, ease: "none" }, 2.2)
    .to(allCards, { xPercent: (index) => [-0.6, -0.3, 0, 0.4, 0.7][index], yPercent: (index) => [1.2, -0.8, 0.7, -1, 1.1][index], scale: (index) => [1.01, 1, 1.01, 1, 1.01][index], duration: 1.75, ease: "power2.inOut" }, 2.35)
    .to(allCards, { duration: 1.25, ease: "none" }, 4.1);
}

function setupHistoryFloatMotion() {
  if (!window.gsap || !window.ScrollTrigger) return;
  const panel = document.querySelector('[data-panel-theme="history-float"]');
  if (!panel) return;

  const stage = panel.querySelector(".history-float-stage");
  const keywordTitle = panel.querySelector("[data-history-title-keyword]");
  const photoTitle = panel.querySelector("[data-history-title-photo]");
  const insightCard = panel.querySelector("[data-history-card]");
  const keywords = Array.from(panel.querySelectorAll("[data-history-keyword]"));
  const photos = Array.from(panel.querySelectorAll("[data-history-photo]"));
  if (!stage || !keywordTitle || !photoTitle || !insightCard || !keywords.length || !photos.length) return;

  const keywordPasses = [
    { start: 0.08, fromY: "-122vh", outY: "116vh", x: "-8vw", outX: "-16vw", rotation: -8, outRotation: -16, alpha: 0.9 },
    { start: 0.34, fromY: "-128vh", outY: "122vh", x: "9vw", outX: "18vw", rotation: 7, outRotation: 15, alpha: 0.82 },
    { start: 0.6, fromY: "-120vh", outY: "128vh", x: "-3vw", outX: "-9vw", rotation: 11, outRotation: 20, alpha: 0.78 },
    { start: 0.86, fromY: "-130vh", outY: "120vh", x: "12vw", outX: "24vw", rotation: -12, outRotation: -20, alpha: 0.76 },
    { start: 1.12, fromY: "-116vh", outY: "132vh", x: "0vw", outX: "8vw", rotation: 5, outRotation: 13, alpha: 0.7 },
  ];

  const photoPasses = [
    { start: 4.0, fromY: "126vh", outY: "-126vh", x: "-6vw", outX: "-9vw", rotation: -8, outRotation: -13, scale: 1.08, alpha: 0.78 },
    { start: 4.22, fromY: "134vh", outY: "-134vh", x: "5vw", outX: "8vw", rotation: 6, outRotation: 11, scale: 1.1, alpha: 0.82 },
    { start: 4.44, fromY: "128vh", outY: "-120vh", x: "-8vw", outX: "-12vw", rotation: 4, outRotation: 8, scale: 1, alpha: 0.66 },
    { start: 4.66, fromY: "140vh", outY: "-126vh", x: "7vw", outX: "10vw", rotation: -5, outRotation: -10, scale: 1.02, alpha: 0.68 },
    { start: 4.88, fromY: "132vh", outY: "-140vh", x: "0vw", outX: "2vw", rotation: 3, outRotation: 7, scale: 0.96, alpha: 0.54 },
    { start: 5.1, fromY: "144vh", outY: "-136vh", x: "-7vw", outX: "-13vw", rotation: -4, outRotation: -8, scale: 1.08, alpha: 0.76 },
    { start: 5.32, fromY: "138vh", outY: "-146vh", x: "6vw", outX: "10vw", rotation: 8, outRotation: 13, scale: 1, alpha: 0.62 },
    { start: 5.54, fromY: "148vh", outY: "-128vh", x: "-3vw", outX: "-5vw", rotation: -7, outRotation: -11, scale: 0.94, alpha: 0.6 },
    { start: 5.74, fromY: "150vh", outY: "-140vh", x: "8vw", outX: "12vw", rotation: 5, outRotation: 10, scale: 1, alpha: 0.7 },
  ];

  gsap.set(stage, { backgroundColor: "#bdb4ef" });
  gsap.set(keywordTitle, { autoAlpha: 1, xPercent: -50, yPercent: -50, scale: 1 });
  gsap.set(photoTitle, { autoAlpha: 0, xPercent: -50, yPercent: -50, scale: 0.98 });
  gsap.set(insightCard, { autoAlpha: 0, xPercent: -50, yPercent: 118, scale: 0.985 });
  gsap.set(keywords, {
    autoAlpha: 0,
    x: (index) => keywordPasses[index]?.x ?? 0,
    y: (index) => keywordPasses[index]?.fromY ?? "-120vh",
    rotation: (index) => keywordPasses[index]?.rotation ?? 0,
    scale: 0.98,
  });
  gsap.set(photos, {
    autoAlpha: 0,
    x: (index) => photoPasses[index]?.x ?? 0,
    y: (index) => photoPasses[index]?.fromY ?? "124vh",
    rotation: (index) => photoPasses[index]?.rotation ?? 0,
    scale: (index) => photoPasses[index]?.scale ?? 0.9,
  });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: panel,
      start: "top top",
      end: () => `+=${Math.max(window.innerHeight * 3.15, panel.offsetHeight - window.innerHeight)}`,
      pin: stage,
      pinSpacing: false,
      anticipatePin: 1,
      scrub: true,
      invalidateOnRefresh: true,
    },
    defaults: { ease: "none" },
  });

  tl.to(keywordTitle, { scale: 0.985, duration: 1.3, ease: "power1.inOut" }, 0);

  keywords.forEach((keyword, index) => {
    const pass = keywordPasses[index];
    tl.to(keyword, {
      autoAlpha: pass.alpha,
      y: pass.outY,
      x: pass.outX,
      rotation: pass.outRotation,
      duration: 1.25,
      ease: "none",
    }, pass.start)
      .to(keyword, { autoAlpha: 0, duration: 0.18, ease: "none" }, pass.start + 1.08);
  });

  tl.to(keywordTitle, { yPercent: -126, scale: 0.68, duration: 0.56, ease: "none" }, 2.48)
    .to(insightCard, { autoAlpha: 1, yPercent: 0, scale: 1, duration: 0.72, ease: "none" }, 2.58)
    .to([keywordTitle, insightCard], { duration: 0.58, ease: "none" }, 3.26)
    .to(stage, { backgroundColor: "#0f5147", duration: 0.72, ease: "none" }, 3.74)
    .to(keywordTitle, { autoAlpha: 0, scale: 0.62, yPercent: -148, duration: 0.5, ease: "none" }, 3.76)
    .to(insightCard, { autoAlpha: 0, yPercent: -112, scale: 0.965, duration: 0.58, ease: "none" }, 3.78)
    .to(photoTitle, { autoAlpha: 1, scale: 1, duration: 0.5, ease: "none" }, 3.92);

  photos.forEach((photo, index) => {
    const pass = photoPasses[index];
    tl.to(photo, {
      autoAlpha: pass.alpha,
      y: pass.outY,
      x: pass.outX,
      rotation: pass.outRotation,
      scale: pass.scale,
      duration: 1.82,
      ease: "none",
    }, pass.start)
      .to(photo, { autoAlpha: 0, duration: 0.18, ease: "none" }, pass.start + 1.58);
  });

  tl.to(photoTitle, { scale: 0.985, duration: 3.6, ease: "none" }, 3.45)
    .to(photos, { autoAlpha: 0, duration: 0.12, ease: "none" }, 7.44)
    .to(photoTitle, { autoAlpha: 1, scale: 0.985, duration: 0.72, ease: "none" }, 7.52);
}

function setupTheoryCriteriaMotion() {
  if (!window.gsap || !window.ScrollTrigger) return;
  const panel = document.querySelector('[data-panel-theme="theory-criteria"]');
  if (!panel) return;

  const stage = panel.querySelector(".criteria-stage");
  const background = panel.querySelector('[data-animate="criteria-background"]');
  const report = panel.querySelector('[data-animate="criteria-report"]');
  const bridge = panel.querySelector('[data-animate="criteria-bridge"]');
  const synthesis = panel.querySelector('[data-animate="criteria-synthesis"]');
  const source = report?.querySelector(".criteria-report-source");
  const reportBody = report?.querySelector(".criteria-report-body");
  const bridgeParts = bridge ? Array.from(bridge.children) : [];
  const synthesisIntro = synthesis?.querySelector('[data-animate="criteria-synthesis-intro"]');
  const synthesisBoard = synthesis?.querySelector('[data-animate="criteria-synthesis-board"]');
  const rows = Array.from(panel.querySelectorAll("[data-criteria-row]"));
  const finalLine = panel.querySelector('[data-animate="criteria-final"]');
  const bgPapers = Array.from(panel.querySelectorAll("[data-criteria-bg]"));
  if (!stage || !background || !report || !bridge || !synthesis || !source || !reportBody || !synthesisIntro || !synthesisBoard || !rows.length || !finalLine || !bgPapers.length) return;

  gsap.set(background, { autoAlpha: 1, scale: 1.04, xPercent: 0, yPercent: 0 });
  gsap.set(bgPapers, {
    autoAlpha: 0,
    yPercent: (index) => [48, 32, 42, 30, 52][index],
    xPercent: (index) => [-16, -4, 7, 6, 18][index],
    rotation: (index) => [-24, -8, -25, 22, 36][index],
  });
  gsap.set(report, { autoAlpha: 0, y: 92, scale: 0.985 });
  gsap.set(source.children, { autoAlpha: 0, y: 16 });
  gsap.set(reportBody.children, { autoAlpha: 0, y: 24 });
  gsap.set(bridge, { autoAlpha: 0, yPercent: 100, rotation: -4 });
  gsap.set(bridgeParts, { autoAlpha: 0, y: 24 });
  gsap.set(synthesis, { autoAlpha: 0, yPercent: 104, rotation: 2 });
  gsap.set(synthesisIntro, { autoAlpha: 0, y: 22 });
  gsap.set(synthesisBoard, { autoAlpha: 0, y: 28, scale: 0.975, rotation: -2 });
  gsap.set(rows, { autoAlpha: 0, y: 28, scale: 0.985 });
  gsap.set(finalLine, { autoAlpha: 0, y: 22 });

  const highlightPaper = (row) => {
    const targetId = row?.dataset.relatedBg;
    bgPapers.forEach((paper) => paper.classList.toggle("is-highlighted", paper.dataset.criteriaBg === targetId));
  };

  const clearHighlight = () => {
    bgPapers.forEach((paper) => paper.classList.remove("is-highlighted"));
  };

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: panel,
      start: "top top",
      end: () => `+=${Math.max(window.innerHeight * 2.8, panel.offsetHeight - window.innerHeight)}`,
      pin: stage,
      pinSpacing: false,
      scrub: 0.85,
      invalidateOnRefresh: true,
      onLeave: clearHighlight,
      onLeaveBack: clearHighlight,
    },
    defaults: { ease: "power3.out" },
  });

  tl.to(bgPapers, {
    autoAlpha: 0.78,
    xPercent: 0,
    yPercent: 0,
    rotation: (index) => [-13, -1, -16, 11, 24][index],
    stagger: 0.08,
    duration: 0.9,
    ease: "power3.out",
  }, 0)
    .to(background, { scale: 0.98, yPercent: -4, duration: 4.2, ease: "none" }, 0)
    .to(bgPapers, { yPercent: (index) => [-8, -5, -10, -4, -7][index], duration: 4.2, ease: "none" }, 0.58)
    .to(report, { autoAlpha: 1, y: 0, scale: 1, duration: 0.72, ease: "power3.out" }, 0.42)
    .to(source.children, { autoAlpha: 1, y: 0, stagger: 0.12, duration: 0.38, ease: "power2.out" }, 0.82)
    .to(reportBody.children, { autoAlpha: 1, y: 0, stagger: 0.15, duration: 0.48, ease: "power2.out" }, 0.92)
    .to(bridge, { autoAlpha: 1, yPercent: 0, rotation: -1.8, duration: 0.86, ease: "power3.inOut" }, 1.55)
    .to(bridgeParts, { autoAlpha: 1, y: 0, stagger: 0.1, duration: 0.42, ease: "power2.out" }, 1.92)
    .to(report, { autoAlpha: 0.32, y: -18, scale: 0.97, duration: 0.72, ease: "power2.inOut" }, 1.7)
    .to(synthesis, { autoAlpha: 1, yPercent: 0, rotation: 0, duration: 0.9, ease: "power3.inOut" }, 2.55)
    .to(bridge, { autoAlpha: 0.18, yPercent: -14, duration: 0.86, ease: "power2.inOut" }, 2.65)
    .to(synthesisIntro, { autoAlpha: 1, y: 0, duration: 0.42, ease: "power2.out" }, 3.08)
    .to(synthesisBoard, { autoAlpha: 1, y: 0, scale: 1, rotation: -0.8, duration: 0.5, ease: "power2.out" }, 3.26)
    .to(rows.slice(0, 2), {
      autoAlpha: 1,
      y: 0,
      scale: 1,
      stagger: 0.14,
      duration: 0.42,
      ease: "power2.out",
      onStart: () => highlightPaper(rows[0]),
      onReverseComplete: clearHighlight,
    }, 3.62)
    .to(rows.slice(2, 4), {
      autoAlpha: 1,
      y: 0,
      scale: 1,
      stagger: 0.14,
      duration: 0.42,
      ease: "power2.out",
      onStart: () => highlightPaper(rows[2]),
      onReverseComplete: () => highlightPaper(rows[1]),
    }, 4.02)
    .to(rows[4], { autoAlpha: 1, y: 0, scale: 1, duration: 0.42, ease: "power2.out", onStart: () => highlightPaper(rows[4]), onReverseComplete: () => highlightPaper(rows[3]) }, 4.42)
    .to(finalLine, { autoAlpha: 1, y: 0, duration: 0.42, ease: "power2.out", onStart: clearHighlight }, 4.78)
    .to([synthesis, background], { duration: 0.95, ease: "none" }, 5.08);
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
    const nextPanel = panels[nextIndex];
    const shouldUseEntryStop = !(currentPanel?.dataset.panelTheme === "history-float" && nextPanel?.dataset.panelTheme === "literature-support");
    const entryStop = shouldUseEntryStop ? panelEntryStop(nextPanel) : null;
    if (entryStop) {
      stopAutoPlay();
      setActivePanel(nextIndex);
      scrollToTop(entryStop.top, { duration: entryStop.duration, ease: entryStop.ease });
      return;
    }
    const exitTransition = panelExitTransition(currentPanel);
    const duration = exitTransition?.duration ?? (currentPanel?.dataset.panelTheme === "literature-evidence" ? 3.2 : null);
    const ease = exitTransition?.ease ?? (currentPanel?.dataset.panelTheme === "literature-evidence" ? "none" : "power2.inOut");
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

window.addEventListener("scroll", updateTheoryCriteriaState, { passive: true });

setActivePanel(0);
updateTheoryCriteriaState();
prepareAnimations();
observePanels();
setupCommunityObjectMotion();
setupSilverEconomyMotion();
setupPeopleScrollMotion();
setupBusScrollMotion();
setupLiteratureEvidenceMotion();
setupHistoryFloatMotion();
setupLiteratureSupportMotion();
setupTheoryCriteriaMotion();
playPanel(panels[0]);
