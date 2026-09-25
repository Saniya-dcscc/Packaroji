(function () {
    "use strict";

    var KEY = "packaroji_cookie_choice";
    var banner = document.getElementById("cookie-banner");

    if (!banner) return;

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
})();
