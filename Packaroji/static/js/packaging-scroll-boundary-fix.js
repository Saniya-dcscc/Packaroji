/* Packaroji packaging-layer scroll boundary fix.
 *
 * The homepage layer animation owns the normal in-range scrubbing. This file
 * only handles the two outside-boundary states, and does so in a trailing
 * requestAnimationFrame so the original renderer cannot immediately overwrite
 * the boundary frame in the same scroll event.
 */
(function () {
  "use strict";

  function init() {
    const story = document.getElementById("packaging-layers");
    const film = document.getElementById("pkgLayerFilm");
    if (!story || !film || story.dataset.boundaryFixReady === "true") return;
    story.dataset.boundaryFixReady = "true";

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    let duration = Number.isFinite(film.duration) && film.duration > 0 ? film.duration : 10.125;
    let frame = 0;
    let lastBoundary = "";

    film.loop = false;
    film.pause();

    function updateDuration() {
      if (Number.isFinite(film.duration) && film.duration > 0) {
        duration = film.duration;
      }
    }

    function seekSafely(time) {
      const bounded = clamp(Number(time) || 0, 0, duration);
      try {
        if (typeof film.fastSeek === "function") film.fastSeek(bounded);
        else film.currentTime = bounded;
      } catch (_) {
        try { film.currentTime = bounded; } catch (__) {}
      }
    }

    function getRawProgress() {
      const range = Math.max(1, story.offsetHeight - window.innerHeight);
      return -story.getBoundingClientRect().top / range;
    }

    function enforceBoundary() {
      frame = 0;
      updateDuration();

      const rawProgress = getRawProgress();
      let boundary = "inside";
      if (rawProgress <= 0) boundary = "top";
      else if (rawProgress >= 1) boundary = "bottom";

      if (boundary === "inside") {
        lastBoundary = "";
        return;
      }

      // Apply each boundary only when entering it. This prevents repeated
      // seeks on every scroll event and avoids a visible replay/reset.
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
      scheduleBoundaryCheck();
    }, { passive: true });

    window.addEventListener("scroll", scheduleBoundaryCheck, { passive: true });
    window.addEventListener("resize", scheduleBoundaryCheck, { passive: true });
    window.addEventListener("orientationchange", scheduleBoundaryCheck, { passive: true });
    scheduleBoundaryCheck();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
