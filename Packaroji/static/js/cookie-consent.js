(function () {
    "use strict";

    /* Keep the existing cookie-consent behavior unchanged. */
    var KEY = "packaroji_cookie_choice";
    var banner = document.getElementById("cookie-banner");

    if (banner) {
        var saved = null;
        try {
            saved = window.localStorage.getItem(KEY);
        } catch (_) {}

        if (!saved) banner.hidden = false;

        banner.querySelectorAll("[data-cookie-choice]").forEach(function (button) {
            button.addEventListener("click", function () {
                var choice = button.getAttribute("data-cookie-choice") || "accept";
                try {
                    window.localStorage.setItem(KEY, choice);
                } catch (_) {}
                banner.hidden = true;
            });
        });
    }

    /* =========================================================
       PACKAGING LAYERS — UPLOADED VIDEO + FOUR SCROLL STEPS
       Only targets the existing packaging-layer section.
    ========================================================== */
    function initPackagingLayerOverride() {
        var story = document.getElementById("packaging-layers");
        var film = document.getElementById("pkgLayerFilm");
        if (!story || !film || film.dataset.packarojiLayerOverride === "1") return;

        film.dataset.packarojiLayerOverride = "1";

        var panels = Array.from(story.querySelectorAll(".pkg-layer-panel"));
        var progress = story.querySelector(".pkg-layer-progress span");
        var hint = story.querySelector(".pkg-layer-scroll-hint");
        var uploadedVideo = "/static/WhatsApp%20Video%202026-09-23%20at%2021.35.50.mp4";
        var boundaries = [0, 0.25, 0.5, 0.75, 1];
        var duration = 10;
        var lastTime = -1;
        var frame = 0;
        var wheelLocked = false;

        function clamp(value, min, max) {
            return Math.max(min, Math.min(max, value));
        }

        function ease(value) {
            return value < 0.5
                ? 2 * value * value
                : 1 - Math.pow(-2 * value + 2, 2) / 2;
        }

        var source = film.querySelector("source");
        if (source) source.src = uploadedVideo;
        film.src = uploadedVideo;
        film.muted = true;
        film.setAttribute("muted", "");
        film.setAttribute("playsinline", "");
        film.setAttribute("webkit-playsinline", "");
        film.preload = "auto";
        film.pause();
        film.load();

        function videoEnd() {
            return Math.max(6, Math.min(10, duration || 10));
        }

        function videoTime(scrollProgress) {
            var p = clamp(scrollProgress, 0, 1);
            if (p <= 0.25) return (p / 0.25) * 2;
            if (p <= 0.5) return 2 + ((p - 0.25) / 0.25) * 2;
            if (p <= 0.75) return 4 + ((p - 0.5) / 0.25) * 2;
            return 6 + ((p - 0.75) / 0.25) * (videoEnd() - 6);
        }

        function setVideoTime(time) {
            var target = clamp(time, 0, duration || 10);
            if (Math.abs(target - lastTime) < 0.01) return;
            lastTime = target;
            try {
                film.currentTime = target;
            } catch (_) {}
        }

        function renderPanels(p) {
            var windowSize = 0.035;
            var opacity = [0, 0, 0, 0];
            var offsets = [0, 8, 8, 8];
            var active = Math.min(3, Math.floor(Math.min(p, 0.999999) * 4));

            [0.25, 0.5, 0.75].forEach(function (boundary, index) {
                if (Math.abs(p - boundary) <= windowSize) {
                    var t = ease(clamp((p - (boundary - windowSize)) / (windowSize * 2), 0, 1));
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
            frame = 0;
            var rect = story.getBoundingClientRect();
            var total = Math.max(1, story.offsetHeight - window.innerHeight);
            var p = clamp(-rect.top / total, 0, 1);
            setVideoTime(videoTime(p));
            renderPanels(p);
        }

        function requestRender() {
            if (!frame) frame = window.requestAnimationFrame(render);
        }

        function snapLayer(direction) {
            var rect = story.getBoundingClientRect();
            var total = Math.max(1, story.offsetHeight - window.innerHeight);
            var p = clamp(-rect.top / total, 0, 1);
            var current = Math.min(3, Math.max(0, Math.round(p * 4)));
            var next = current + direction;

            if (next < 0 || next > 3) return false;
            var targetTop = story.offsetTop + total * boundaries[next];
            window.scrollTo({ top: targetTop, behavior: "smooth" });
            return true;
        }

        film.addEventListener("loadedmetadata", function () {
            duration = film.duration || 10;
            lastTime = -1;
            requestRender();
        }, { once: true });

        story.addEventListener("wheel", function (event) {
            if (Math.abs(event.deltaY) < 8 || wheelLocked) return;

            var rect = story.getBoundingClientRect();
            if (rect.top > 2 || rect.bottom < window.innerHeight - 2) return;

            var moved = snapLayer(event.deltaY > 0 ? 1 : -1);
            if (!moved) return;

            event.preventDefault();
            wheelLocked = true;
            window.setTimeout(function () { wheelLocked = false; }, 520);
        }, { passive: false });

        window.addEventListener("scroll", requestRender, { passive: true });
        window.addEventListener("resize", requestRender, { passive: true });
        window.addEventListener("orientationchange", function () { window.setTimeout(requestRender, 80); });
        requestRender();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initPackagingLayerOverride, { once: true });
    } else {
        initPackagingLayerOverride();
    }
})();
