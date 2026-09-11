/*
 * Packaroji temporary emoji cursor
 * ---------------------------------
 * Desktop mouse/pointer devices only. Touch devices are ignored.
 *
 * Back/shop action: 🥹
 * Successful cart add / successful order: 😁
 *
 * The cursor is drawn to a small PNG data URL because browsers do not
 * reliably accept an emoji directly in CSS cursor: url(...).
 */
(function () {
    "use strict";

    if (!window.matchMedia || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        return;
    }

    var STORAGE_KEY = "packaroji_cursor_effect";
    var EFFECT_MS = 1800;
    var timer = null;
    var moveHandler = null;

    function emojiToDataUrl(emoji) {
        var canvas = document.createElement("canvas");
        canvas.width = 48;
        canvas.height = 48;
        var ctx = canvas.getContext("2d");
        if (!ctx) return "";

        ctx.clearRect(0, 0, 48, 48);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = '34px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
        ctx.fillText(emoji, 24, 24);
        return canvas.toDataURL("image/png");
    }

    var cursorUrls = {
        back: emojiToDataUrl("🥹"),
        success: emojiToDataUrl("😁")
    };

    function clearCursor() {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        if (moveHandler) {
            window.removeEventListener("mousemove", moveHandler);
            moveHandler = null;
        }
        document.body.style.cursor = "";
    }

    function showCursor(type) {
        var dataUrl = cursorUrls[type];
        if (!dataUrl) return;

        clearCursor();
        document.body.style.cursor = 'url("' + dataUrl + '") 4 4, auto';

        // Restore on the next intentional mouse movement, or by timeout.
        moveHandler = function () {
            clearCursor();
        };
        window.addEventListener("mousemove", moveHandler, { once: true, passive: true });

        timer = window.setTimeout(clearCursor, EFFECT_MS);
    }

    function trigger(type) {
        try {
            sessionStorage.setItem(STORAGE_KEY, type);
        } catch (_) {}
        showCursor(type);
    }

    // Successful checkout redirects here with ?cursor=success.
    // Consume it immediately so refreshing the order page does not replay the effect.
    try {
        var params = new URLSearchParams(window.location.search);
        if (params.get("cursor") === "success") {
            showCursor("success");
            params.delete("cursor");
            var cleanQuery = params.toString();
            var cleanUrl = window.location.pathname + (cleanQuery ? "?" + cleanQuery : "") + window.location.hash;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    } catch (_) {}

    // A back/shop click may navigate immediately, so replay it on the destination page.
    try {
        var pending = sessionStorage.getItem(STORAGE_KEY);
        if (pending) {
            sessionStorage.removeItem(STORAGE_KEY);
            window.requestAnimationFrame(function () {
                showCursor(pending);
            });
        }
    } catch (_) {}

    // Back / go-back-to-shop hook: add data-cursor-back to an existing action.
    document.addEventListener("click", function (event) {
        var target = event.target.closest ? event.target.closest("[data-cursor-back]") : null;
        if (target) {
            trigger("back");
        }
    });

    // Public hooks for existing successful-cart / successful-order handlers.
    window.PackarojiCursor = {
        back: function () {
            trigger("back");
        },
        cartSuccess: function () {
            trigger("success");
        },
        orderSuccess: function () {
            trigger("success");
        }
    };
})();
