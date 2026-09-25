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
        var starts = [0, 2, 4, 6];
        var ends = [2, 4, 6, 10];
        var step = -1;
        var locked = false;
        var completed = false;
        var animationFrame = 0;

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
            var from = reverse ? end : start;
            var to = reverse ? start : end;
            var finished = false;
            var animationStart = null;
            var playbackMilliseconds = 1200;

            setTime(from);

            function finish() {
                if (finished) return;
                finished = true;
                stopPlayback();
                setTime(to);
                if (done) done();
            }

            function frame(timestamp) {
                if (finished) return;
                if (animationStart === null) animationStart = timestamp;
                var ratio = clamp((timestamp - animationStart) / playbackMilliseconds, 0, 1);
                setTime(from + (to - from) * ratio);
                if (ratio >= 1) finish();
                else animationFrame = window.requestAnimationFrame(frame);
            }

            animationFrame = window.requestAnimationFrame(frame);
        }

        function isPinned() {
            var rect = story.getBoundingClientRect();
            return rect.top <= 3 && rect.bottom >= window.innerHeight - 3;
        }

        function resetBeforeLeavingBackwards() {
            stopPlayback();
            locked = false;
            completed = false;
            step = -1;
            renderLayer(-1);
            setTime(0);
        }

        function finishStoryForward() {
            completed = true;
            stopPlayback();
            setTime(10);
            film.pause();
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
                if (step >= 3) {
                    finishStoryForward();
                    return;
                }
                event.preventDefault();
                event.stopImmediatePropagation();
                completed = false;
                locked = true;
                step += 1;
                renderLayer(step);
                playSegment(step, false, function () { locked = false; });
                return;
            }
            if (step < 0) return;

            if (step === 0) {
                resetBeforeLeavingBackwards();
                return;
            }

            event.preventDefault();
            event.stopImmediatePropagation();
            completed = false;
            locked = true;
            var current = step;
            playSegment(current, true, function () {
                step = current - 1;
                renderLayer(step);
                setTime(starts[Math.max(0, step)]);
                locked = false;
            });
        }

        film.muted = true;
        film.defaultMuted = true;
        film.autoplay = false;
        film.removeAttribute("autoplay");
        film.setAttribute("muted", "");
        film.setAttribute("playsinline", "");
        film.setAttribute("webkit-playsinline", "");
        film.preload = "auto";
        film.addEventListener("play", function () {
            if (completed) film.pause();
        });
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
        if (!image) return;
        image.src = "/static/images/packaging-hero-new.jpg";
        image.style.visibility = "visible";
        var style = document.getElementById("packaroji-hero-image-fix");
        if (!style) {
            style = document.createElement("style");
            style.id = "packaroji-hero-image-fix";
            style.textContent = ".new-landing-hero{background:#f5f0e3!important;}.new-landing-media{z-index:0!important;}.new-landing-inner{position:relative!important;z-index:1!important;} .new-landing-media img{object-fit:cover!important;object-position:center center!important;}";
            document.head.appendChild(style);
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