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

    // Compatibility loader: keeps the existing base template untouched while
    // loading each independent frontend module from its own named file.
    ["packaging-layers.js", "landing-fixes.js"].forEach(function (file) {
        var selector = 'script[data-packaroji-module="' + file + '"]';
        if (document.querySelector(selector)) return;
        var script = document.createElement("script");
        script.src = "/static/js/" + file + "?v=1";
        script.async = false;
        script.setAttribute("data-packaroji-module", file);
        document.head.appendChild(script);
    });
})();
