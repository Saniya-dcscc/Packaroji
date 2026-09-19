(() => {
  "use strict";

  const story = document.getElementById("packaging-layers");
  if (!story) return;

  const panels = Array.from(story.querySelectorAll(".pkg-layer-panel"));
  const progress = story.querySelector(".pkg-layer-progress span");
  const counter = story.querySelector(".pkg-layer-counter b");
  const hint = story.querySelector(".pkg-layer-scroll-hint");

  if (!panels.length) return;

  const captions = [
    "FOOD WRAPPING",
    "MAIN PORTION PACKAGING",
    "TAKEOUT & DELIVERY",
    "BRANDING OPTIONS"
  ];

  const setLayerState = (active) => {
    panels.forEach((panel, index) => {
      const activeNow = index === active;
      panel.classList.toggle("is-active", activeNow);
      panel.setAttribute("aria-hidden", activeNow ? "false" : "true");
    });
    if (counter) counter.textContent = String(active + 1).padStart(2, "0");
  };

  // Respect accessibility first.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    setLayerState(0);
    return;
  }

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;

  // If a CDN is temporarily unavailable, keep a small native fallback
  // so the section is still usable rather than completely frozen.
  if (!gsap || !ScrollTrigger) {
    const fallback = () => {
      const rect = story.getBoundingClientRect();
      const total = Math.max(1, story.offsetHeight - window.innerHeight);
      const p = Math.max(0, Math.min(1, -rect.top / total));
      const pos = p * (panels.length - 1);
      const active = Math.min(panels.length - 1, Math.floor(pos));
      const local = pos - active;

      panels.forEach((panel, i) => {
        const y = i < active ? -105 : i === active ? -local * 105 : 105 - local * 105;
        const opacity = i === active ? 1 - local * 0.15 : i === active + 1 ? 0.25 + local * 0.75 : 0;
        panel.style.transform = `translate3d(0,${y}%,0) scale(${i === active ? 1 - local * .015 : .985 + local * .015})`;
        panel.style.opacity = opacity;
      });

      if (progress) progress.style.transform = `scaleX(${p})`;
      setLayerState(active);
    };

    let ticking = false;
    const request = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        fallback();
      });
    };

    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    fallback();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  const ctx = gsap.context(() => {
    // Initial states.
    gsap.set(panels, {
      autoAlpha: 0,
      yPercent: 105,
      scale: 0.985
    });
    gsap.set(panels[0], {
      autoAlpha: 1,
      yPercent: 0,
      scale: 1
    });

    panels.forEach((panel) => {
      const image = panel.querySelector(".pkg-layer-visual img");
      if (image) gsap.set(image, { scale: 1.035 });
    });

    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: story,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.8,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const raw = self.progress * (panels.length - 1);
          const active = Math.min(
            panels.length - 1,
            Math.floor(raw + 0.001)
          );

          setLayerState(active);

          if (progress) {
            progress.style.transform = `scaleX(${self.progress})`;
          }

          if (hint) {
            hint.style.opacity = self.progress > 0.035 ? "0" : "1";
          }
        }
      }
    });

    const transitionLength = 1.35;
    const holdLength = 1.15;

    panels.forEach((panel, index) => {
      if (index === 0) return;

      const start = (index - 1) * (transitionLength + holdLength);

      const previous = panels[index - 1];
      const previousImage = previous.querySelector(".pkg-layer-visual img");
      const currentImage = panel.querySelector(".pkg-layer-visual img");

      // The incoming layer rises from below while the outgoing layer
      // lifts away — the same visual rhythm as the supplied reference.
      tl.to(previous, {
        yPercent: -105,
        autoAlpha: 0,
        scale: 0.985,
        duration: transitionLength
      }, start);

      tl.fromTo(panel,
        { yPercent: 105, autoAlpha: 0, scale: 0.985 },
        { yPercent: 0, autoAlpha: 1, scale: 1, duration: transitionLength },
        start
      );

      if (previousImage) {
        tl.to(previousImage, {
          scale: 1.085,
          duration: transitionLength
        }, start);
      }

      if (currentImage) {
        tl.fromTo(currentImage,
          { scale: 1.09 },
          { scale: 1.035, duration: transitionLength },
          start
        );
      }

      // Small pause after each layer settles, matching the reference
      // where the content remains readable before the next transition.
      tl.to({}, { duration: holdLength }, start + transitionLength);
    });

    setLayerState(0);

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, story);

  window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
  window.addEventListener("resize", () => ScrollTrigger.refresh(), { passive: true });

  window.addEventListener("beforeunload", () => ctx.revert(), { once: true });
})();
