(function () {
    "use strict";

    /* Existing cookie-consent behavior. */
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

    /*
     * PACKAGING LAYERS
     * One wheel gesture = one layer and one fixed video segment:
     * 1: 0-2s, 2: 2-4s, 3: 4-6s, 4: 6-10s.
     * No continuous scroll scrubbing is used.
     */
    function initPackagingLayerVideo() {
        var story = document.getElementById("packaging-layers");
        var film = document.getElementById("pkgLayerFilm");
        if (!story || !film || window.__packarojiDiscreteLayerController) return;
        window.__packarojiDiscreteLayerController = true;

        var panels = Array.from(story.querySelectorAll(".pkg-layer-panel"));
        var progress = story.querySelector(".pkg-layer-progress span");
        var hint = story.querySelector(".pkg-layer-scroll-hint");
        var videoPath = "/static/WhatsApp%20Video%202026-09-23%20at%2021.35.50.mp4";
        var starts = [0, 2, 4, 6];
        var ends = [2, 4, 6, 10];
        var duration = 10;
        var step = -1;
        var locked = false;
        var frame = 0;

        function clamp(value, min, max) {
            return Math.max(min, Math.min(max, value));
        }

        function safeEnd(index) {
            var actual = Number.isFinite(duration) && duration > 0 ? duration : 10;
            return Math.min(ends[index], Math.max(starts[index], actual - 0.04));
        }

        function setTime(value) {
            var actual = Number.isFinite(duration) && duration > 0 ? duration : 10;
            var safe = clamp(value, 0, Math.max(0, actual - 0.04));
            try { film.currentTime = safe; } catch (_) {}
        }

        function renderLayer(index) {
            var active = clamp(index, 0, 3);
            panels.forEach(function (panel, panelIndex) {
                var visible = panelIndex === active;
                panel.style.opacity = visible ? "1" : "0";
                panel.style.visibility = visible ? "visible" : "hidden";
                panel.style.transform = "none";
                panel.style.zIndex = visible ? "10" : "1";
                panel.classList.toggle("is-active", visible);
                panel.setAttribute("aria-hidden", visible ? "false" : "true");
            });
            if (progress) progress.style.transform = "scaleX(" + ((active + 1) / 4) + ")";
            if (hint) hint.style.opacity = step >= 0 ? "0" : "1";
        }

        function cancelAnimation() {
            if (frame) window.cancelAnimationFrame(frame);
            frame = 0;
            film.pause();
        }

        function playForward(index, done) {
            cancelAnimation();
            var start = starts[index];
            var end = safeEnd(index);
            var finished = false;
            var fallbackStart = null;
            setTime(start);

            function finish() {
                if (finished) return;
                finished = true;
                if (frame) window.cancelAnimationFrame(frame);
                frame = 0;
                film.pause();
                setTime(end);
                if (done) done();
            }

            function monitor(timestamp) {
                if (finished) return;
                if (film.currentTime >= end - 0.035 || film.ended) {
                    finish();
                    return;
                }
                if (fallbackStart !== null) {
                    var ratio = clamp((timestamp - fallbackStart) / 2000, 0, 1);
                    setTime(start + (end - start) * ratio);
                    if (ratio >= 1) {
                        finish();
                        return;
                    }
                }
                frame = window.requestAnimationFrame(monitor);
            }

            var promise = null;
            try { promise = film.play(); } catch (_) {}
            if (promise && typeof promise.catch === "function") {
                promise.catch(function () {
                    fallbackStart = performance.now();
                });
            }
            frame = window.requestAnimationFrame(monitor);
        }

        function playReverse(index, done) {
            cancelAnimation();
            var start = starts[index];
            var end = safeEnd(index);
            var began = null;
            var finished = false;
            setTime(end);

            function finish() {
                if (finished) return;
                finished = true;
                if (frame) window.cancelAnimationFrame(frame);
                frame = 0;
                film.pause();
                setTime(start);
                if (done) done();
            }

            function reverse(timestamp) {
                if (finished) return;
                if (began === null) began = timestamp;
                var ratio = clamp((timestamp - began) / 900, 0, 1);
                setTime(end - (end - start) * ratio);
                if (ratio >= 1) finish();
                else frame = window.requestAnimationFrame(reverse);
            }
            frame = window.requestAnimationFrame(reverse);
        }

        function storyIsPinned() {
            var rect = story.getBoundingClientRect();
            return rect.top <= 3 && rect.bottom >= window.innerHeight - 3;
        }

        function handleWheel(event) {
            if (!storyIsPinned()) return;
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
                playForward(step, function () { locked = false; });
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

        window.addEventListener("wheel", handleWheel, { capture: true, passive: false });
        renderLayer(0);
        setTime(0);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initPackagingLayerVideo, { once: true });
    } else {
        initPackagingLayerVideo();
    }
})();
