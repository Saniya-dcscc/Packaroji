(function () {
  "use strict";

  var nativeAddEventListener = window.addEventListener.bind(window);
  var nativeRemoveEventListener = window.removeEventListener.bind(window);
  var legacyScrollBlocked = false;

  function isLegacyPackagingScrollHandler(type, listener) {
    if (type !== "scroll" || typeof listener !== "function") return false;
    var source = Function.prototype.toString.call(listener);
    return source.indexOf("setVideoTime") !== -1 || source.indexOf("scrollToVideoTime") !== -1;
  }

  window.addEventListener = function (type, listener, options) {
    if (isLegacyPackagingScrollHandler(type, listener)) {
      legacyScrollBlocked = true;
      return;
    }
    return nativeAddEventListener(type, listener, options);
  };

  function init() {
    var story = document.getElementById("packaging-layers");
    var film = document.getElementById("pkgLayerFilm");
    if (!story || !film) return;

    var panels = Array.prototype.slice.call(story.querySelectorAll(".pkg-layer-panel"));
    var progress = story.querySelector(".pkg-layer-progress span");
    var hint = story.querySelector(".pkg-layer-scroll-hint");
    var raf = 0;
    var duration = 10.125;
    var lastTime = -1;

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function ease(value) {
      return value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;
    }

    function videoTime(progressValue) {
      var p = clamp(progressValue, 0, 1);
      if (p <= 0.20) return p / 0.20 * 2;
      if (p <= 0.26) return 2;
      if (p <= 0.32) return 2 + (p - 0.26) / 0.06;
      if (p <= 0.48) return 3 + (p - 0.32) / 0.16 * 2;
      if (p <= 0.54) return 5;
      if (p <= 0.74) return 5 + (p - 0.54) / 0.20 * 2;
      if (p <= 0.78) return 7;
      if (p <= 0.96) return 7 + (p - 0.78) / 0.18 * 2.5;
      return 9.5;
    }

    function setVideoTime(time) {
      var target = clamp(time, 0, duration || 10.125);
      if (Math.abs(target - lastTime) < 0.008) return;
      lastTime = target;
      try {
        film.currentTime = target;
      } catch (error) {}
    }

    function render() {
      raf = 0;
      var rect = story.getBoundingClientRect();
      var total = Math.max(1, story.offsetHeight - window.innerHeight);
      var p = clamp(-rect.top / total, 0, 1);
      var time = videoTime(p);
      setVideoTime(time);

      var opacities = [0, 0, 0, 0];
      var offsets = [0, 8, 8, 8];

      if (time < 2) {
        opacities[0] = 1;
      } else if (time < 3) {
        var first = ease(clamp(time - 2, 0, 1));
        opacities[0] = 1 - first;
        opacities[1] = first;
        offsets[0] = -first * 5;
        offsets[1] = (1 - first) * 5;
      } else if (time < 5) {
        opacities[1] = 1;
      } else if (time < 7) {
        var second = ease(clamp(time - 5, 0, 1));
        opacities[1] = 1 - second;
        opacities[2] = second;
        offsets[1] = -second * 5;
        offsets[2] = (1 - second) * 5;
      } else {
        var third = ease(clamp((time - 7) / 0.35, 0, 1));
        opacities[2] = 1 - third;
        opacities[3] = third;
        offsets[2] = -third * 5;
        offsets[3] = (1 - third) * 5;
      }

      panels.forEach(function (panel, index) {
        var opacity = opacities[index] || 0;
        panel.style.zIndex = opacity > 0.01 ? String(10 + index) : "1";
        panel.style.opacity = String(opacity);
        panel.style.transform = "translate3d(0," + (offsets[index] || 0) + "%,0) scale(" + (0.99 + opacity * 0.01) + ")";
        panel.classList.toggle("is-active", opacity > 0.01);
        panel.setAttribute("aria-hidden", opacity > 0.01 ? "false" : "true");
      });

      if (progress) progress.style.transform = "scaleX(" + p + ")";
      if (hint) hint.style.opacity = p > 0.035 ? "0" : "1";
    }

    function request() {
      if (!raf) raf = window.requestAnimationFrame(render);
    }

    film.muted = true;
    film.setAttribute("muted", "");
    film.setAttribute("playsinline", "");
    film.setAttribute("webkit-playsinline", "");
    film.preload = "auto";
    film.pause();
    film.addEventListener("loadedmetadata", function () {
      duration = film.duration || 10.125;
      request();
    }, { once: true });

    nativeAddEventListener("scroll", request, { passive: true });
    nativeAddEventListener("resize", request, { passive: true });
    nativeAddEventListener("orientationchange", function () { window.setTimeout(request, 80); });
    request();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();