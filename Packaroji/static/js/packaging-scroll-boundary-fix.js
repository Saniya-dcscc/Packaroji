/* Packaroji packaging-layer scroll boundary fix. */
(function () {
  "use strict";

  function init() {
    const story = document.getElementById("packaging-layers");
    const film = document.getElementById("pkgLayerFilm");
    if (!story || !film || story.dataset.boundaryFixReady === "true") return;
    story.dataset.boundaryFixReady = "true";

    const panels = Array.from(story.querySelectorAll(".pkg-layer-panel"));
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    let duration = 10.125;
    let frame = 0;
    let lastBoundary = "";

    film.loop = false;
    film.pause();

    function updateDuration() {
      if (Number.isFinite(film.duration) && film.duration > 0) duration = film.duration;
    }

    function seekSafely(time) {
      const bounded = clamp(Number(time) || 0, 0, duration);
      try {
        film.currentTime = bounded;
      } catch (_) {}
    }

    function normalizeScrollRange() {
      if (!panels.length) return;
      // One viewport for the pinned scene plus one viewport of scroll space
      // per layer. This prevents an oversized section from producing blank
      // pages after Layer 4 before the next homepage section begins.
      const targetHeight = Math.max(window.innerHeight * (panels.length + 1), window.innerHeight + 1);
      story.style.height = `${Math.round(targetHeight)}px`;
      story.style.minHeight = `${Math.round(targetHeight)}px`;
    }

    function getRawProgress() {
      const range = Math.max(1, story.offsetHeight - window.innerHeight);
      return -story.getBoundingClientRect().top / range;
    }

    function enforceBoundary() {
      frame = 0;
      updateDuration();
      normalizeScrollRange();

      const rawProgress = getRawProgress();
      let boundary = "inside";
      if (rawProgress <= 0) boundary = "top";
      else if (rawProgress >= 1) boundary = "bottom";

      if (boundary === "inside") {
        lastBoundary = "";
        return;
      }

      if (lastBoundary !== boundary) {
        seekSafely(boundary === "top" ? 0 : duration);
        film.pause();
        lastBoundary = boundary;
      }
    }

    function scheduleBoundaryCheck() {
      if (frame) return;
      frame = window.requestAnimationFrame(enforceBoundary);
    }

    film.addEventListener("loadedmetadata", function () {
      updateDuration();
      normalizeScrollRange();
      scheduleBoundaryCheck();
    }, { passive: true });

    window.addEventListener("scroll", scheduleBoundaryCheck, { passive: true });
    window.addEventListener("resize", scheduleBoundaryCheck, { passive: true });
    window.addEventListener("orientationchange", scheduleBoundaryCheck, { passive: true });

    normalizeScrollRange();
    scheduleBoundaryCheck();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
