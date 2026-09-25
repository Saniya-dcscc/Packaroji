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

    function preserveVideoFrame() {
        var style = document.getElementById("packaroji-video-frame-fix");
        if (style) return;
        style = document.createElement("style");
        style.id = "packaroji-video-frame-fix";
        style.textContent = [
            "#packaging-layers .pkg-layer-film-video{object-fit:contain!important;object-position:center center!important;width:100%!important;height:100%!important;transform:none!important;scale:1!important;}",
            "#packaging-layers .pkg-layer-film{background:#111!important;}",
            "@media(max-width:800px){#packaging-layers .pkg-layer-film-video{object-fit:contain!important;object-position:center center!important;}}"
        ].join("");
        document.head.appendChild(style);
    }

    function initPackagingLayerVideo() {
        var story = document.getElementById("packaging-layers");
        var film = document.getElementById("pkgLayerFilm");
        if (!story || !film || window.__packarojiDiscreteLayerController) return;
        window.__packarojiDiscreteLayerController = true;
        preserveVideoFrame();

        var panels = Array.from(story.querySelectorAll(".pkg-layer-panel"));
        var progress = story.querySelector(".pkg-layer-progress span");
        var hint = story.querySelector(".pkg-layer-scroll-hint");
        var videoPath = "/static/WhatsApp%20Video%202026-09-23%20at%2021.35.50.mp4";
        var starts = [0, 2, 4, 6];
        var ends = [2, 4, 6, 10];
        var step = -1;
        var locked = false;
        var animationFrame = 0;
        var duration = 10;

        function clamp(value, min, max) {
            return Math.max(min, Math.min(max, value));
        }

        function setTime(value) {
            var maxTime = Number.isFinite(film.duration) && film.duration > 0 ? film.duration - 0.03 : 10;
            try { film.currentTime = clamp(value, 0, Math.max(0, maxTime)); } catch (_) {}
        }

        function stopPlayback() {
            if (animationFrame) window.cancelAnimationFrame(animationFrame);
            animationFrame = 0;
            film.pause();
        }

        function renderLayer(activeIndex) {
            panels.forEach(function (panel, index) {
                var visible = index === activeIndex;
                panel.classList.toggle("is-active", visible);
                panel.style.opacity = visible ? "1" : "0";
                panel.style.visibility = visible ? "visible" : "hidden";
                panel.style.transform = "none";
                panel.style.zIndex = visible ? "10" : "1";
                panel.setAttribute("aria-hidden", visible ? "false" : "true");
            });
            if (progress) progress.style.transform = "scaleX(" + (activeIndex < 0 ? 0 : (activeIndex + 1) / 4) + ")";
            if (hint) hint.style.opacity = activeIndex < 0 ? "1" : "0";
        }

        function playSegment(index, reverse, done) {
            stopPlayback();
            var start = starts[index];
            var end = Math.min(ends[index], Number.isFinite(film.duration) && film.duration > 0 ? film.duration : ends[index]);
            var to = reverse ? start : end;
            var finished = false;
            setTime(reverse ? end : start);

            function finish() {
                if (finished) return;
                finished = true;
                stopPlayback();
                setTime(to);
                if (done) done();
            }

            if (reverse) {
                var reverseStart = null;
                function reverseFrame(timestamp) {
                    if (finished) return;
                    if (reverseStart === null) reverseStart = timestamp;
                    var ratio = clamp((timestamp - reverseStart) / 900, 0, 1);
                    setTime(end - (end - start) * ratio);
                    if (ratio >= 1) finish();
                    else animationFrame = window.requestAnimationFrame(reverseFrame);
                }
                animationFrame = window.requestAnimationFrame(reverseFrame);
                return;
            }

            var playResult = null;
            try { playResult = film.play(); } catch (_) {}
            if (playResult && typeof playResult.catch === "function") {
                playResult.catch(function () {
                    var fallbackStart = null;
                    function fallbackFrame(timestamp) {
                        if (finished) return;
                        if (fallbackStart === null) fallbackStart = timestamp;
                        var ratio = clamp((timestamp - fallbackStart) / Math.max(1, (end - start) * 1000), 0, 1);
                        setTime(start + (end - start) * ratio);
                        if (ratio >= 1) finish();
                        else animationFrame = window.requestAnimationFrame(fallbackFrame);
                    }
                    animationFrame = window.requestAnimationFrame(fallbackFrame);
                });
            }

            function monitor() {
                if (finished) return;
                if (film.currentTime >= end - 0.04 || film.ended) {
                    finish();
                    return;
                }
                animationFrame = window.requestAnimationFrame(monitor);
            }
            animationFrame = window.requestAnimationFrame(monitor);
        }

        function isPinned() {
            var rect = story.getBoundingClientRect();
            return rect.top <= 3 && rect.bottom >= window.innerHeight - 3;
        }

        function onWheel(event) {
            if (!isPinned()) return;
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
                playSegment(step, false, function () { locked = false; });
                return;
            }
            if (step < 0) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            locked = true;
            var current = step;
            playSegment(current, true, function () {
                step = current - 1;
                renderLayer(step);
                setTime(step < 0 ? 0 : starts[Math.max(0, step)]);
                locked = false;
            });
        }

        film.src = videoPath;
        film.muted = true;
        film.defaultMuted = true;
        film.setAttribute("muted", "");
        film.setAttribute("playsinline", "");
        film.setAttribute("webkit-playsinline", "");
        film.preload = "auto";
        film.load();
        film.addEventListener("loadedmetadata", function () {
            setTime(0);
        });

        window.addEventListener("wheel", onWheel, { capture: true, passive: false });
        renderLayer(-1);
        setTime(0);
    }

    function swapLandingHeroImage() {
        var image = document.querySelector(".new-landing-media img");
        if (image) {
            image.src = "/static/images/packaging-hero-new.jpg";
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            initPackagingLayerVideo();
            swapLandingHeroImage();
        }, { once: true });
    } else {
        initPackagingLayerVideo();
        swapLandingHeroImage();
    }
})();
