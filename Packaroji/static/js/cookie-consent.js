(function () {
    "use strict";

    var KEY = "packaroji_cookie_choice";

    function initCookieConsent() {
        var banner = document.getElementById("cookie-banner");
        if (!banner) return;

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

    function initPackagingScroll() {
        var story = document.getElementById("packaging-layers");
        var film = document.getElementById("pkgLayerFilm");
        if (!story || !film || story.dataset.packarojiScrollV2 === "1") return;

        story.dataset.packarojiScrollV2 = "1";

        var panels = Array.prototype.slice.call(
            story.querySelectorAll(".pkg-layer-panel")
        );
        var progress = story.querySelector(".pkg-layer-progress span");
        var hint = story.querySelector(".pkg-layer-scroll-hint");
        var filmFrame = film.closest(".pkg-layer-film") || film.parentElement;

        if (!panels.length) return;

        var raf = 0;
        var duration = 10;
        var lastTime = -1;
        var lastLayer = -1;

        function clamp(value, min, max) {
            return Math.max(min, Math.min(max, value));
        }

        function setStoryHeight() {
            var viewportHeight = Math.max(1, window.innerHeight);
            var totalHeight = viewportHeight * (panels.length + 1);

            story.style.height = Math.round(totalHeight) + "px";
            story.style.minHeight = Math.round(totalHeight) + "px";
            story.style.maxHeight = "none";
        }

        function updateDuration() {
            if (Number.isFinite(film.duration) && film.duration > 0) {
                duration = film.duration;
            }
        }

        function setVideoTime(value) {
            var maxTime = Math.max(0, (duration || 10) - 0.03);
            var target = clamp(Number(value) || 0, 0, maxTime);

            if (Math.abs(target - lastTime) < 0.008) return;
            lastTime = target;

            try {
                film.currentTime = target;
            } catch (_) {}
        }

        function renderPanels(layer) {
            panels.forEach(function (panel, index) {
                var active = index === layer;

                panel.style.opacity = active ? "1" : "0";
                panel.style.visibility = active ? "visible" : "hidden";
                panel.style.transform = "translate3d(0, 0, 0)";
                panel.style.zIndex = active ? "10" : "1";
                panel.classList.toggle("is-active", active);
                panel.setAttribute("aria-hidden", active ? "false" : "true");
            });

            if (progress) {
                progress.style.transform = "scaleX(" + ((layer + 1) / panels.length) + ")";
            }

            if (hint) {
                hint.style.opacity = layer < 0 ? "1" : "0";
            }

            if (filmFrame) {
                filmFrame.style.visibility = "visible";
                filmFrame.style.opacity = "1";
            }
        }

        function render() {
            raf = 0;

            var range = Math.max(1, story.offsetHeight - window.innerHeight);
            var rect = story.getBoundingClientRect();
            var progressValue = clamp(-rect.top / range, 0, 1);
            var segmentSize = 1 / panels.length;
            var layer = Math.min(
                panels.length - 1,
                Math.floor(progressValue / segmentSize)
            );

            if (progressValue >= 1) {
                layer = panels.length - 1;
            }

            var localProgress = clamp(
                (progressValue - layer * segmentSize) / segmentSize,
                0,
                1
            );

            var starts = [0, 2, 4, 6];
            var ends = [2, 4, 6, Math.max(6, duration)];
            var startTime = starts[Math.min(layer, starts.length - 1)];
            var endTime = ends[Math.min(layer, ends.length - 1)];
            var time = startTime + (endTime - startTime) * localProgress;

            setVideoTime(time);

            if (layer !== lastLayer) {
                renderPanels(layer);
                lastLayer = layer;
            }

            if (progress) {
                progress.style.transform = "scaleX(" + progressValue + ")";
            }

            if (hint) {
                hint.style.opacity = progressValue > 0.02 ? "0" : "1";
            }
        }

        function requestRender() {
            if (raf) return;
            raf = window.requestAnimationFrame(render);
        }

        film.muted = true;
        film.defaultMuted = true;
        film.loop = false;
        film.pause();
        film.preload = "auto";
        film.setAttribute("muted", "");
        film.setAttribute("playsinline", "");
        film.setAttribute("webkit-playsinline", "");

        film.addEventListener("loadedmetadata", function () {
            updateDuration();
            requestRender();
        });

        film.addEventListener("loadeddata", function () {
            updateDuration();
            requestRender();
        });

        window.addEventListener("scroll", requestRender, { passive: true });
        window.addEventListener("resize", function () {
            setStoryHeight();
            requestRender();
        }, { passive: true });
        window.addEventListener("orientationchange", function () {
            window.setTimeout(function () {
                setStoryHeight();
                requestRender();
            }, 80);
        }, { passive: true });

        setStoryHeight();
        renderPanels(0);
        lastLayer = 0;
        setVideoTime(0);
        requestRender();
    }

    function init() {
        initCookieConsent();
        initPackagingScroll();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
