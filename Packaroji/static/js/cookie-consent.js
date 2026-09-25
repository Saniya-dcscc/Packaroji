(function () {
    "use strict";

    var KEY = "packaroji_cookie_choice";
    var nativeAddEventListener = window.addEventListener.bind(window);

    window.addEventListener = function (type, listener, options) {
        if (type === "scroll" && typeof listener === "function") {
            var source = Function.prototype.toString.call(listener);
            if (source.indexOf("setVideoTime") !== -1 || source.indexOf("scrollToVideoTime") !== -1) {
                return;
            }
        }
        return nativeAddEventListener(type, listener, options);
    };

    function loadGlobalTheme() {
        if (document.querySelector('link[data-packaroji-global-theme]')) return;
        var stylesheet = document.createElement("link");
        stylesheet.rel = "stylesheet";
        stylesheet.href = "/static/css/global-theme.css?v=1";
        stylesheet.setAttribute("data-packaroji-global-theme", "true");
        document.head.appendChild(stylesheet);
    }

    function initCookieConsent() {
        loadGlobalTheme();

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

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initCookieConsent, { once: true });
    } else {
        initCookieConsent();
    }

    var controller = document.createElement("script");
    controller.src = "/static/js/packaging-layers-single-controller.js?v=2";
    controller.async = false;
    document.head.appendChild(controller);
})();
