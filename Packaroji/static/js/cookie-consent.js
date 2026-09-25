(function () {
    "use strict";

    /* =========================================================
       COOKIE CONSENT — existing behavior
    ========================================================== */
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

    /* =========================================================
       PACKAGING LAYERS — DISCRETE FOUR-STEP VIDEO CONTROLLER

       Step 1: layer 1 + video 0–2 seconds
       Step 2: layer 2 + video 2–4 seconds
       Step 3: layer 3 + video 4–6 seconds
       Step 4: layer 4 + video 6–10 seconds

       The old continuous scroll handler is intentionally not used here.
       One wheel gesture advances exactly one layer, and the next upward
       gesture reverses exactly one layer. The section remains otherwise
       unchanged.
    ========================================================== */
    function initPackagingLayerVideo() {
        var story = document.getElementById("packaging-layers");
        var film = document.getElementById("pkgLayerFilm");
        if (!story || !film || window.__packarojiDiscreteLayerController) return;
        window.__packarojiDiscreteLayerController = true;

        var panels = Array.from(story.querySelectorAll(".pkg-layer-panel"));
        var progress = story.querySelector(".pkg-layer-progress span");
        var hint = story.querySelector(".pkg-layer-scroll-hint");
        var videoPath = "/static/WhatsApp%20Video%202026-09-23%20at%2021.35.50.mp4";
        var duration = 10;
        var step = -1;
        var locked = false;
        var animationFrame = 0;
        var segmentStarts = [0, 2, 4, 6];
        var segmentEnds = [2, 4, 6, 10];

        function clamp(value, min, max) {
            return Math.max(min, Math.min(max, value));
        }

        function getEnd(index) {
            var actualDuration = Number.isFinite(duration) && duration > 0 ? duration : 10;
            return Math.min(segmentEnds[index], Math.max(segmentStarts[index], actualDuration - 0.03));
        }

        function setTime(time) {
            var actualDuration = Number.isFinite(duration) && duration > 0 ? duration : 10;
            var safeTime = clamp(time, 0, Math.max(0, actualDuration - 0.03));
            try { film.currentTime = safeTime; } catch (_) {}
        }

        function renderLayer(index) {
            var active = clamp(index, 0, 3);

            panels.forEach(function (panel, panelIndex) {
                var isActive = panelIndex === active;
                panel.style.zIndex = isActive ? "10" : "1";
                panel.style.opacity = isActive ? "1" : "0";
                panel.style.transform = "none";
                panel.classList.toggle("is-active", isActive);
                panel.setAttribute("aria-hidden", isActive ? "false" : "true");
            });

            if (progress) progress.style.transform = "scaleX(" + ((active + 1) / 4) + ")";
            if (hint) hint.style.opacity = active > 0 || step >= 0 ? "0" : "1";
        }

        function stopAnimation() {
            if (animationFrame) window.cancelAnimationFrame(animationFrame);
            animationFrame = 0;
            film.pause();
        }

        function playForward(index, done) {
            stopAnimation();

            var start = segmentStarts[index];
            var end = getEnd(index);
            setTime(start);

            var finished = false;
            function finish() {
                if (finished) return;
                finished = true;
                if (animationFrame) window.cancelAnimationFrame(animationFrame);
                animationFrame = 0;
                film.pause();
                setTime(end);
                if (done) done();
            }

            function monitor() {
                if (finished) return;
                if (film.currentTime >= end - 0.04 || film.ended) {
                    finish();
                    return;
                }
                animationFrame = window.requestAnimationFrame(monitor);
            }

            var playResult;
            try { playResult = film.play(); } catch (_) { playResult = null; }

            if (playResult && typeof playResult.catch === "function") {
                playResult.catch(function () {
                    /* Muted playback should work, but retain a seek fallback. */
                    var started = null;
                    function seekFallback(timestamp) {
                        if (finished) return;
                        if (started === null) started = timestamp;
                        var ratio = clamp((timestamp - started) / 700, 0, 1);
                        setTime(start + (end - start) * ratio);
                        if (ratio >= 1) finish();
                        else animationFrame = window.requestAnimationFrame(seekFallback);
                    }
                    animationFrame = window.requestAnimationFrame(seekFallback);
                });
            }

            animationFrame = window.requestAnimationFrame(monitor);
        }

        function playReverse(index, done) {
            stopAnimation();

            var start = segmentStarts[index];
            var end = getEnd(index);
            var started = null;
            var finished = false;

            setTime(end);

            function finish() {
                if (finished) return;
                finished = true;
                if (animationFrame) window.cancelAnimationFrame(animationFrame);
                animationFrame = 0;
                film.pause();
                setTime(start);
                if (done) done();
            }

            function reverse(timestamp) {
                if (finished) return;
                if (started === null) started = timestamp;
                var ratio = clamp((timestamp - started) / 700, 0, 1);
                setTime(end - (end - start) * ratio);
                if (ratio >= 1) finish();
                else animationFrame = window.requestAnimationFrame(reverse);
            }

            animationFrame = window.requestAnimationFrame(reverse);
        }

        function isStoryActive() {
            var rect = story.getBoundingClientRect();
            return rect.top <= 3 && rect.bottom >= window.innerHeight - 3;
        }

        function handleWheel(event) {
            if (!isStoryActive()) return;

            var direction = event.deltaY > 0 ? 1 : event.deltaY < 0 ? -1 : 0;
            if (!direction) return;

            if (locked) {
                event.preventDefault();
                event.stopImmediatePropagation();
                return;
            }

            if (direction > 0) {
                if (step >= 3) return;

                event.preventDefault();
                event.stopImmediatePropagation();
                locked = true;
                step += 1;
                renderLayer(step);
                playForward(step, function () {
                    locked = false;
                });
                return;
            }

            if (step < 0) return;

            event.preventDefault();
            event.stopImmediatePropagation();
            locked = true;
            var current = step;
            playReverse(current, function () {
                step = current - 1;
                renderLayer(Math.max(0, step));
                locked = false;
            });
        }

        var source = film.querySelector("source");
        if (source) source.setAttribute("src", videoPath);
        film.setAttribute("src", videoPath);
        film.muted = true;
        film.defaultMuted = true;
        film.setAttribute("muted", "");
        film.setAttribute("playsinline", "");
        film.setAttribute("webkit-playsinline", "");
        film.preload = "auto";
        film.pause();
        film.load();

        film.addEventListener("loadedmetadata", function () {
            if (Number.isFinite(film.duration) && film.duration > 0) duration = film.duration;
            setTime(0);
        });

        /* Capture the wheel gesture before the old inline scroll handler. */
        window.addEventListener("wheel", handleWheel, { capture: true, passive: false });

        /* Keep the first layer visible before the first step is triggered. */
        renderLayer(0);
        setTime(0);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initPackagingLayerVideo, { once: true });
    } else {
        initPackagingLayerVideo();
    }
})();
