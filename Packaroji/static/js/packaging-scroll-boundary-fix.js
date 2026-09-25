/* Packaroji packaging-layer scroll boundary fix.
 *
 * This module is intentionally standalone. It guards the existing custom
 * scroll implementation against time wrapping and boundary overshoot.
 * Load it after the homepage layer script.
 */
(function () {
  "use strict";

  function init() {
    const story = document.getElementById("packaging-layers");
    const film = document.getElementById("pkgLayerFilm");
    if (!story || !film) return;

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    let duration = Number.isFinite(film.duration) && film.duration > 0 ? film.duration : 10.125;

    film.addEventListener("loadedmetadata", function () {
      if (Number.isFinite(film.duration) && film.duration > 0) duration = film.duration;
    });

    function safeSeek(progress) {
      const boundedProgress = clamp(progress, 0, 1);
      const boundedTime = clamp(boundedProgress * duration, 0, duration);
      if (!Number.isFinite(boundedTime)) return;
      try {
        if (typeof film.fastSeek === "function") film.fastSeek(boundedTime);
        else film.currentTime = boundedTime;
      } catch (_) {
        try { film.currentTime = boundedTime; } catch (__) {}
      }
    }

    // Prevent accidental looping/restarts caused by invalid time assignments.
    film.loop = false;
    film.addEventListener("timeupdate", function () {
      if (film.currentTime < 0) film.currentTime = 0;
      if (film.currentTime > duration) film.currentTime = duration;
    });

    // Keep the video on its final frame after leaving downward and at the
    // first frame after leaving upward; never wrap progress back to zero.
    function enforceBoundary() {
      const rect = story.getBoundingClientRect();
      const scrollRange = Math.max(1, story.offsetHeight - window.innerHeight);
      const rawProgress = -rect.top / scrollRange;
      if (rawProgress >= 1) safeSeek(1);
      else if (rawProgress <= 0) safeSeek(0);
    }

    window.addEventListener("scroll", enforceBoundary, { passive: true });
    window.addEventListener("resize", enforceBoundary, { passive: true });
    enforceBoundary();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
