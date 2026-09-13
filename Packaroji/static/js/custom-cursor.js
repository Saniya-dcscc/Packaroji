/* =========================================================
   PACKAROJI — CUSTOM EMOJI CURSOR
   Vanilla JS, no frameworks, no dependencies.

   WHAT THIS DOES
   - "Back to shop" click (leaving a product/cart page toward
     the shop) -> cursor becomes 🥹 for ~1.8s, then reverts.
   - Add-to-cart success, or order placed successfully
     -> cursor becomes 😁 for ~1.8s, then reverts.
   - No popups, no sounds, no other visual changes.
   - Does nothing on touch devices (there's no cursor there).

   HOW IT'S WIRED INTO THIS SITE
   1. "Back to shop": any element with the attribute
      data-cursor-back triggers the 🥹 cursor when clicked.
      Already added to: cart.html "Continue Shopping",
      product.html "Back to <category>", order_detail.html
      "Continue Shopping".
   2. Add to cart: static/js/main.js calls
      window.PackarojiCursor.flash('happy') right after a
      successful /cart/add response. (search "HOOK: add to
      cart" in main.js)
   3. Order placed: templates/order_detail.html calls
      window.PackarojiCursor.flash('happy') on page load, but
      ONLY on the page load that immediately follows a
      successful checkout (guarded server-side by checking for
      the "order request has been received" flash message, so
      revisiting an old order later does not re-trigger it).

   Because #1 and #3 involve a full page navigation (this site
   is server-rendered, not a single-page app), the cursor can't
   just be set and left running through the page unload — it
   would never be seen. So a click on a data-cursor-back link
   "arms" a flag in sessionStorage right before the browser
   navigates away, and the very next page to load checks for
   that flag and shows the emoji there instead. That's the
   armCrossPageFlash / consumeCrossPageFlash pair below.

   DROP-IN USE ELSEWHERE
   Call window.PackarojiCursor.flash('happy') or
   window.PackarojiCursor.flash('sad') from any click handler
   that does NOT navigate away immediately, or call
   window.PackarojiCursor.armCrossPageFlash('sad'|'happy')
   right before a click that does navigate / submits a form.
========================================================== */
(function () {
    "use strict";

    // --- Skip entirely on touch/coarse-pointer devices. ---
    var isTouchDevice = (function () {
        if (window.matchMedia && window.matchMedia("(any-pointer: fine)").matches) {
            return false;
        }
        return true;
    })();

    var EMOJI = {
        sad: "\u{1F979}",   // 🥹  used for "back to shop"
        happy: "\u{1F601}"  // 😁  used for add-to-cart / order placed
    };

    var CURSOR_SIZE = 48;      // px, square cursor image
    var REVERT_MS = 1800;      // revert after this long
    var MOVE_GRACE_MS = 300;   // ignore mousemove events for this long after
                                // arming, so the same click/move that
                                // triggered the flash doesn't instantly
                                // cancel it — then revert on the next move.

    var cache = {};
    var revertTimer = null;
    var moveHandler = null;
    var armedAt = 0;

    function buildCursorUrl(emoji) {
        if (cache[emoji]) return cache[emoji];
        var canvas = document.createElement("canvas");
        canvas.width = CURSOR_SIZE;
        canvas.height = CURSOR_SIZE;
        var ctx = canvas.getContext("2d");
        if (!ctx) return "";
        ctx.clearRect(0, 0, CURSOR_SIZE, CURSOR_SIZE);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = (CURSOR_SIZE - 6) + "px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
        ctx.fillText(emoji, CURSOR_SIZE / 2, CURSOR_SIZE / 2 + 2);
        var url = canvas.toDataURL("image/png");
        cache[emoji] = url;
        return url;
    }

    function clearRevert() {
        if (revertTimer) {
            clearTimeout(revertTimer);
            revertTimer = null;
        }
        if (moveHandler) {
            document.removeEventListener("mousemove", moveHandler);
            moveHandler = null;
        }
    }

    function revertCursor() {
        clearRevert();
        document.body.style.cursor = "";
    }

    // Show `emoji` as the cursor for `ms` milliseconds (or until the user
    // moves the mouse again, whichever comes first — see MOVE_GRACE_MS).
    function flashEmoji(emoji, ms) {
        if (isTouchDevice || !emoji) return;
        ms = ms || REVERT_MS;

        var url = buildCursorUrl(emoji);
        if (!url) return; // canvas unsupported — silently do nothing

        clearRevert();
        document.body.style.cursor =
            "url('" + url + "') " + (CURSOR_SIZE / 2) + " " + (CURSOR_SIZE / 2) + ", auto";
        armedAt = Date.now();

        revertTimer = setTimeout(revertCursor, ms);

        moveHandler = function () {
            if (Date.now() - armedAt > MOVE_GRACE_MS) revertCursor();
        };
        document.addEventListener("mousemove", moveHandler);
    }

    // kind: 'happy' or 'sad'
    function flash(kind, ms) {
        flashEmoji(EMOJI[kind] || kind, ms);
    }

    // ---- Cross-page persistence, for actions that navigate away ----
    var STORAGE_KEY = "packarojiCursorPending";
    var STALE_AFTER_MS = 6000; // ignore a flag left over from a much older click

    function armCrossPageFlash(kind) {
        if (isTouchDevice) return;
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ kind: kind, ts: Date.now() }));
        } catch (e) {
            /* sessionStorage unavailable (private mode etc.) — ignore */
        }
    }

    function consumeCrossPageFlash() {
        try {
            var raw = sessionStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            sessionStorage.removeItem(STORAGE_KEY);
            var data = JSON.parse(raw);
            if (data && data.kind && Date.now() - data.ts < STALE_AFTER_MS) {
                flash(data.kind);
            }
        } catch (e) {
            /* malformed or unavailable storage — ignore */
        }
    }

    window.PackarojiCursor = {
        flash: flash,
        flashEmoji: flashEmoji,
        armCrossPageFlash: armCrossPageFlash
    };

    document.addEventListener("DOMContentLoaded", function () {
        // HOOK: "back to shop" links/buttons anywhere on the site.
        // Add the attribute data-cursor-back to any element that sends the
        // customer back toward the shop/landing page to wire it up.
        document.querySelectorAll("[data-cursor-back]").forEach(function (el) {
            el.addEventListener("click", function () {
                armCrossPageFlash("sad");
            });
        });

        // If the previous page armed a flash right before navigating here
        // (a data-cursor-back click, or a checkout redirect), show it now.
        consumeCrossPageFlash();
    });
})();
