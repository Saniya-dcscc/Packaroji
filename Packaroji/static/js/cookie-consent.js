(function () {
    "use strict";

    var KEY = "packaroji_cookie_choice";
    var banner = document.getElementById("cookie-banner");
    if (banner) {
        var saved = null;
        try { saved = window.localStorage.getItem(KEY); } catch (_) {}
        if (!saved) banner.hidden = false;
        banner.querySelectorAll("[data-cookie-choice]").forEach(function (button) {
            button.addEventListener("click", function () {
                var choice = button.getAttribute("data-cookie-choice") || "accept";
                try { window.localStorage.setItem(KEY, choice); } catch (_) {}
                banner.hidden = true;
            });
        });
    }

    function initPackagingVideo() {
        var story = document.getElementById("packaging-layers");
        var film = document.getElementById("pkgLayerFilm");
        if (!story || !film) return;

        var source = film.querySelector("source");
        // The repository contains this uploaded video at static root. The previously
        // referenced /static/videos/... file does not exist in the repository.
        var correctSrc = "/static/WhatsApp%20Video%202026-09-23%20at%2021.35.50.mp4";
        if (source && source.getAttribute("src") !== correctSrc) {
            source.setAttribute("src", correctSrc);
        }
        film.removeAttribute("autoplay");
        film.removeAttribute("loop");
        film.muted = true;
        film.defaultMuted = true;
        film.setAttribute("muted", "");
        film.setAttribute("playsinline", "");
        film.preload = "auto";

        var panels = Array.prototype.slice.call(story.querySelectorAll(".pkg-layer-panel"));
        var frame = film.closest(".pkg-layer-film") || film.parentElement;
        var step = -1;
        var busy = false;
        var raf = 0;
        var metadataReady = false;
        var starts = [0, 2, 4, 6];
        var ends = [2, 4, 6, 10];

        function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
        function setTime(value) {
            if (!metadataReady || !Number.isFinite(film.duration) || film.duration <= 0) return;
            try {
                film.currentTime = clamp(value, 0, Math.max(0, film.duration - 0.03));
            } catch (_) {}
        }
        function stop() {
            if (raf) cancelAnimationFrame(raf);
            raf = 0;
            film.pause();
        }
        function render(index) {
            panels.forEach(function (panel, i) {
                var active = i === index;
                panel.style.opacity = active ? "1" : "0";
                panel.style.visibility = active ? "visible" : "hidden";
                panel.style.transform = "none";
                panel.style.zIndex = active ? "10" : "1";
                panel.setAttribute("aria-hidden", active ? "false" : "true");
                panel.classList.toggle("is-active", active);
            });
            var progress = story.querySelector(".pkg-layer-progress span");
            if (progress) progress.style.transform = "scaleX(" + (index < 0 ? 0 : (index + 1) / 4) + ")";
            var hint = story.querySelector(".pkg-layer-scroll-hint");
            if (hint) hint.style.opacity = index < 0 ? "1" : "0";
            if (frame) {
                frame.style.visibility = "visible";
                frame.style.opacity = "1";
            }
        }
        function animate(index, reverse, done) {
            stop();
            if (!metadataReady) { if (done) done(); return; }
            var from = reverse ? ends[index] : starts[index];
            var to = reverse ? starts[index] : ends[index];
            var begin = null;
            function tick(timestamp) {
                if (begin === null) begin = timestamp;
                var ratio = clamp((timestamp - begin) / 1200, 0, 1);
                setTime(from + (to - from) * ratio);
                if (ratio >= 1) {
                    stop();
                    setTime(to);
                    if (done) done();
                } else {
                    raf = requestAnimationFrame(tick);
                }
            }
            raf = requestAnimationFrame(tick);
        }
        function pinned() {
            var rect = story.getBoundingClientRect();
            return rect.top <= 3 && rect.bottom >= window.innerHeight - 3;
        }
        function onWheel(event) {
            if (!pinned()) return;
            var direction = event.deltaY > 0 ? 1 : event.deltaY < 0 ? -1 : 0;
            if (!direction) return;
            if (busy) {
                event.preventDefault();
                event.stopImmediatePropagation();
                return;
            }
            if (direction > 0) {
                if (step >= 3) return;
                event.preventDefault();
                event.stopImmediatePropagation();
                busy = true;
                step += 1;
                render(step);
                animate(step, false, function () { busy = false; });
            } else {
                if (step <= 0) {
                    // Keep Layer 1 visible at the upper boundary instead of rendering
                    // an empty state while the user scrolls back up.
                    step = 0;
                    render(0);
                    setTime(0);
                    return;
                }
                event.preventDefault();
                event.stopImmediatePropagation();
                busy = true;
                var current = step;
                animate(current, true, function () {
                    step = current - 1;
                    render(step);
                    setTime(starts[step]);
                    busy = false;
                });
            }
        }

        film.addEventListener("loadedmetadata", function () {
            metadataReady = Number.isFinite(film.duration) && film.duration > 0;
            if (metadataReady) setTime(step < 0 ? 0 : starts[step]);
        });
        film.addEventListener("error", function () {
            metadataReady = false;
            if (window.console && console.error) console.error("Packaroji packaging video failed to load", film.error);
        });
        film.load();
        render(-1);
        window.addEventListener("wheel", onWheel, { capture: true, passive: false });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initPackagingVideo, { once: true });
    else initPackagingVideo();
})();
