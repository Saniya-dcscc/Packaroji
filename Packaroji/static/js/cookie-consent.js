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

    /*
     * Packaging-layer video controller.
     * This controller continuously wins over the older inline scroll handler,
     * so the existing page cannot reset the video back to the old source/time.
     */
    function initPackagingLayerVideo() {
        var story = document.getElementById("packaging-layers");
        var film = document.getElementById("pkgLayerFilm");
        if (!story || !film || window.__packarojiLayerVideoController) return;
        window.__packarojiLayerVideoController = true;

        var panels = Array.from(story.querySelectorAll(".pkg-layer-panel"));
        var progress = story.querySelector(".pkg-layer-progress span");
        var hint = story.querySelector(".pkg-layer-scroll-hint");
        var videoPath = "/static/WhatsApp%20Video%202026-09-23%20at%2021.35.50.mp4";
        var duration = 10;
        var lastTime = -1;
        var raf = 0;

        function clamp(value, min, max) {
            return Math.max(min, Math.min(max, value));
        }

        function ease(value) {
            return value < 0.5
                ? 2 * value * value
                : 1 - Math.pow(-2 * value + 2, 2) / 2;
        }

        /* Use the uploaded file in both the source element and video element. */
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
            lastTime = -1;
            requestRender();
        });

        function targetTime(p) {
            /* Exact requested timing: 0–2, 2–4, 4–6, 6–10 seconds. */
            if (p <= 0.25) return (p / 0.25) * 2;
            if (p <= 0.50) return 2 + ((p - 0.25) / 0.25) * 2;
            if (p <= 0.75) return 4 + ((p - 0.50) / 0.25) * 2;
            return 6 + ((p - 0.75) / 0.25) * Math.max(0, Math.min(10, duration) - 6);
        }

        function setTime(time) {
            var safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 10;
            var target = clamp(time, 0, Math.max(0, safeDuration - 0.03));
            if (Math.abs(target - lastTime) < 0.006) return;
            lastTime = target;
            try { film.currentTime = target; } catch (_) {}
        }

        function renderPanels(p) {
            var opacity = [0, 0, 0, 0];
            var offsets = [0, 8, 8, 8];
            var active = Math.min(3, Math.floor(Math.min(p, 0.999999) * 4));
            var windowSize = 0.025;

            [0.25, 0.50, 0.75].forEach(function (boundary, index) {
                if (Math.abs(p - boundary) <= windowSize) {
                    var t = ease(clamp((p - boundary + windowSize) / (windowSize * 2), 0, 1));
                    opacity[index] = 1 - t;
                    opacity[index + 1] = t;
                    offsets[index] = -t * 5;
                    offsets[index + 1] = (1 - t) * 5;
                    active = t >= 0.5 ? index + 1 : index;
                }
            });

            if (!opacity.some(function (value) { return value > 0; })) opacity[active] = 1;

            panels.forEach(function (panel, index) {
                var value = opacity[index] || 0;
                var y = offsets[index] || 0;
                panel.style.zIndex = value > 0.01 ? String(10 + index) : "1";
                panel.style.opacity = String(value);
                panel.style.transform = "translate3d(0," + y + "%,0) scale(" + (0.99 + value * 0.01) + ")";
                panel.classList.toggle("is-active", value > 0.01);
                panel.setAttribute("aria-hidden", value > 0.01 ? "false" : "true");
            });

            if (progress) progress.style.transform = "scaleX(" + p + ")";
            if (hint) hint.style.opacity = p > 0.035 ? "0" : "1";
        }

        function render() {
            raf = 0;
            var rect = story.getBoundingClientRect();
            var total = Math.max(1, story.offsetHeight - window.innerHeight);
            var p = clamp(-rect.top / total, 0, 1);
            setTime(targetTime(p));
            renderPanels(p);
        }

        function requestRender() {
            if (!raf) raf = window.requestAnimationFrame(render);
        }

        /* Continuous rendering prevents the older inline handler from winning. */
        function keepSynced() {
            render();
            window.requestAnimationFrame(keepSynced);
        }

        window.addEventListener("scroll", requestRender, { passive: true });
        window.addEventListener("resize", requestRender, { passive: true });
        window.addEventListener("orientationchange", function () {
            window.setTimeout(requestRender, 80);
        });

        requestRender();
        window.requestAnimationFrame(keepSynced);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initPackagingLayerVideo, { once: true });
    } else {
        initPackagingLayerVideo();
    }
})();
