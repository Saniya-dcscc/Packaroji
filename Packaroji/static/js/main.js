
/* =========================================================
   PACKAROJI EMOJI CURSOR
   Desktop mouse only. Creates a real PNG cursor from an emoji.
   Use window.packarojiCursor("🥹", true) before navigation and
   window.packarojiCursor("😁", false) after a successful action.
========================================================= */
(() => {
    const isMouseDevice = () =>
        window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    const clearCursor = () => {
        document.body?.classList.remove("packaroji-emoji-cursor");
        if (document.body) document.body.style.cursor = "";
        window.removeEventListener("mousemove", clearCursor, true);
    };

    const makeEmojiCursor = (emoji) => {
        const canvas = document.createElement("canvas");
        canvas.width = 48;
        canvas.height = 48;
        const ctx = canvas.getContext("2d");
        if (!ctx) return "";
        ctx.clearRect(0, 0, 48, 48);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = '36px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
        ctx.fillText(emoji, 24, 25);
        return canvas.toDataURL("image/png");
    };

    window.packarojiCursor = (emoji, persistAcrossNavigation = false) => {
        if (!isMouseDevice() || !document.body) return;

        if (persistAcrossNavigation) {
            try {
                sessionStorage.setItem("packaroji-cursor", emoji);
            } catch (_) {}
        }

        const dataUrl = makeEmojiCursor(emoji);
        if (!dataUrl) return;

        document.body.classList.add("packaroji-emoji-cursor");
        document.body.style.cursor = `url(${dataUrl}) 4 4, auto`;

        window.removeEventListener("mousemove", clearCursor, true);
        window.addEventListener("mousemove", clearCursor, true);
        window.clearTimeout(window.__packarojiCursorTimer);
        window.__packarojiCursorTimer = window.setTimeout(clearCursor, 1800);
    };
})();

document.addEventListener("DOMContentLoaded", () => {


    /* =========================================================
       SUCCESSFUL ORDER CURSOR
    ========================================================== */
    if (document.querySelector("[data-order-success-cursor]")) {
        window.packarojiCursor?.("😁", false);
    }

    /* =========================================================
       RESTORE A CURSOR TRIGGERED BEFORE PAGE NAVIGATION
    ========================================================== */
    try {
        const pendingCursor = sessionStorage.getItem("packaroji-cursor");
        if (pendingCursor) {
            sessionStorage.removeItem("packaroji-cursor");
            window.packarojiCursor?.(pendingCursor, false);
        }
    } catch (_) {}

    /* =========================================================
       BACK / SHOP NAVIGATION CURSOR
       Explicit data attribute is used so unrelated links are untouched.
    ========================================================== */
    document.addEventListener("click", (event) => {
        const link = event.target.closest("a[data-packaroji-cursor='sad']");
        if (!link) return;
        window.packarojiCursor?.("🥹", true);
    }, true);

    /* =========================================================
       MOBILE NAVIGATION
    ========================================================== */

    const toggle = document.getElementById("navToggle");
    const nav = document.getElementById("mainNav");

    if (toggle && nav) {

        toggle.addEventListener("click", () => {
            const isOpen = nav.classList.toggle("open");

            toggle.setAttribute("aria-expanded", String(isOpen));
            toggle.setAttribute(
                "aria-label",
                isOpen ? "Close menu" : "Open menu"
            );
        });

        nav.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                nav.classList.remove("open");

                toggle.setAttribute("aria-expanded", "false");
                toggle.setAttribute("aria-label", "Open menu");
            });
        });
    }


    /* =========================================================
       NAVIGATION DROPDOWNS
    ========================================================== */

    document.querySelectorAll(".nav-dropdown-toggle").forEach(button => {

        button.addEventListener("click", event => {

            event.preventDefault();
            event.stopPropagation();

            const dropdown = button.closest(".nav-dropdown");

            if (!dropdown) return;

            const wasOpen = dropdown.classList.contains("open");

            document
                .querySelectorAll(".nav-dropdown.open")
                .forEach(other => {

                    if (other !== dropdown) {

                        other.classList.remove("open");

                        const otherButton =
                            other.querySelector(".nav-dropdown-toggle");

                        otherButton?.setAttribute(
                            "aria-expanded",
                            "false"
                        );
                    }
                });

            dropdown.classList.toggle("open", !wasOpen);

            button.setAttribute(
                "aria-expanded",
                String(!wasOpen)
            );
        });
    });


    /* =========================================================
       CLOSE DROPDOWNS WHEN CLICKING OUTSIDE
    ========================================================== */

    document.addEventListener("click", event => {

        if (!event.target.closest(".nav-dropdown")) {

            document
                .querySelectorAll(".nav-dropdown.open")
                .forEach(dropdown => {

                    dropdown.classList.remove("open");

                    dropdown
                        .querySelector(".nav-dropdown-toggle")
                        ?.setAttribute(
                            "aria-expanded",
                            "false"
                        );
                });
        }
    });


    /* =========================================================
       HEADER SCROLL EFFECT
    ========================================================== */

    const header = document.getElementById("siteHeader");

    const updateHeader = () => {

        if (header) {
            header.classList.toggle(
                "scrolled",
                window.scrollY > 20
            );
        }
    };

    window.addEventListener(
        "scroll",
        updateHeader,
        { passive: true }
    );

    updateHeader();


    /* =========================================================
       CLOSE MOBILE MENU WHEN WINDOW GETS WIDER
    ========================================================== */

    window.addEventListener("resize", () => {

        if (window.innerWidth > 900 && nav) {

            nav.classList.remove("open");

            toggle?.setAttribute(
                "aria-expanded",
                "false"
            );

            toggle?.setAttribute(
                "aria-label",
                "Open menu"
            );
        }
    });


    /* =========================================================
       SMOOTH INTERNAL LINKS
    ========================================================== */

    document
        .querySelectorAll('a[href^="#"]')
        .forEach(link => {

            link.addEventListener("click", event => {

                const targetId =
                    link.getAttribute("href");

                if (!targetId || targetId === "#") {
                    return;
                }

                const target =
                    document.querySelector(targetId);

                if (!target) {
                    return;
                }

                event.preventDefault();

                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

                try {
                    history.replaceState(
                        null,
                        "",
                        targetId
                    );
                } catch (error) {
                    console.warn(
                        "Could not update URL:",
                        error
                    );
                }
            });
        });


    /* =========================================================
       ADD TO CART
    ========================================================== */

    document
        .querySelectorAll("[data-add-to-cart]")
        .forEach(button => {

            button.addEventListener(
                "click",
                async event => {

                    event.preventDefault();

                    const productSlug =
                        button.dataset.productSlug;

                    const packagingType =
                        button.dataset.packagingType ||
                        "Food Packaging";

                    const quantityInput =
                        document.querySelector(
                            button.dataset.quantityTarget ||
                            "#productQuantity"
                        );

                    let quantity =
                        parseInt(
                            quantityInput?.value || "1",
                            10
                        );

                    if (
                        Number.isNaN(quantity) ||
                        quantity < 1
                    ) {
                        quantity = 1;
                    }

                    if (!productSlug) {

                        showToast(
                            "Product information is missing."
                        );

                        return;
                    }

                    const originalText =
                        button.textContent;

                    button.disabled = true;
                    button.textContent = "Adding…";

                    try {

                        const formData = new FormData();

                        formData.append(
                            "product",
                            productSlug
                        );

                        formData.append(
                            "packaging_type",
                            packagingType
                        );

                        formData.append(
                            "quantity",
                            String(quantity)
                        );

                        const response =
                            await fetch(
                                "/cart/add",
                                {
                                    method: "POST",
                                    body: formData
                                }
                            );

                        const data =
                            await response.json();

                        if (!response.ok || !data.ok) {

                            throw new Error(
                                data.message ||
                                "Unable to add product to cart."
                            );
                        }

                        updateCartBadges(
                            data.cart_count
                        );

                        showToast(
                            data.message ||
                            "Added to cart."
                        );

                        // Successful cart addition → happy cursor.
                        window.packarojiCursor?.("😁", false);

                        button.textContent = "✓ Added";

                        setTimeout(() => {
                            button.textContent =
                                originalText;
                        }, 1400);

                    } catch (error) {

                        console.error(
                            "Add to cart error:",
                            error
                        );

                        showToast(
                            error.message ||
                            "Something went wrong."
                        );

                        button.textContent =
                            originalText;

                    } finally {

                        button.disabled = false;
                    }
                }
            );
        });


    /* =========================================================
       CART BADGE UPDATE
       
       IMPORTANT:
       Never select [data-cart-count] globally because the
       <body> itself contains data-cart-count.
    ========================================================== */

    function updateCartBadges(count) {

        if (
            count === undefined ||
            count === null
        ) {
            return;
        }

        document
            .querySelectorAll(".cart-badge")
            .forEach(element => {

                element.textContent = String(count);

                element.classList.add("bump");

                setTimeout(() => {
                    element.classList.remove("bump");
                }, 180);
            });
    }


    /* =========================================================
       TOAST MESSAGE
    ========================================================== */

    function showToast(message) {

        let toast =
            document.getElementById(
                "packarojiToast"
            );

        if (!toast) {

            toast =
                document.createElement("div");

            toast.id =
                "packarojiToast";

            toast.className =
                "packaroji-js-toast";

            document.body.appendChild(toast);
        }

        toast.textContent = message;

        toast.classList.add("show");

        clearTimeout(toast._hideTimer);

        toast._hideTimer =
            setTimeout(() => {

                toast.classList.remove("show");

            }, 2500);
    }


    /* =========================================================
       QUANTITY VALIDATION
    ========================================================== */

    document
        .querySelectorAll('input[type="number"]')
        .forEach(input => {

            input.addEventListener(
                "input",
                () => {

                    const min =
                        parseInt(
                            input.getAttribute("min") || "0",
                            10
                        );

                    let value =
                        parseInt(
                            input.value,
                            10
                        );

                    if (Number.isNaN(value)) {
                        return;
                    }

                    if (value < min) {
                        input.value = min;
                    }
                }
            );
        });


    /* =========================================================
       FILE UPLOAD FEEDBACK
    ========================================================== */

    document
        .querySelectorAll('input[type="file"]')
        .forEach(input => {

            input.addEventListener(
                "change",
                () => {

                    const files =
                        Array.from(
                            input.files || []
                        );

                    let fileInfo =
                        input.parentElement
                            ?.querySelector(
                                ".selected-files"
                            );

                    if (!fileInfo) {

                        fileInfo =
                            document.createElement("div");

                        fileInfo.className =
                            "selected-files";

                        input.parentElement
                            ?.appendChild(fileInfo);
                    }

                    if (!files.length) {

                        fileInfo.textContent = "";

                        return;
                    }

                    fileInfo.textContent =
                        `${files.length} file${
                            files.length === 1
                                ? ""
                                : "s"
                        } selected`;
                }
            );
        });


    /* =========================================================
       ESCAPE KEY
    ========================================================== */

    document.addEventListener(
        "keydown",
        event => {

            if (event.key !== "Escape") {
                return;
            }

            nav?.classList.remove("open");

            toggle?.setAttribute(
                "aria-expanded",
                "false"
            );

            document
                .querySelectorAll(".modal.open")
                .forEach(modal => {

                    modal.classList.remove("open");

                    modal.setAttribute(
                        "aria-hidden",
                        "true"
                    );
                });
        }
    );


    /* =========================================================
       SIMPLE CART COUNT INITIALIZATION
       
       IMPORTANT:
       Read the body attribute, but DO NOT update the body
       itself.
    ========================================================== */

    const serverCartCount =
        document.body?.dataset?.cartCount;

    if (
        serverCartCount !== undefined &&
        serverCartCount !== ""
    ) {

        /*
         * Only update actual cart badge elements.
         * The <body> must never be selected here.
         */
        updateCartBadges(serverCartCount);
    }


    /* =========================================================
       TOAST STYLES
    ========================================================== */

    if (
        !document.getElementById(
            "packaroji-js-toast-style"
        )
    ) {

        const style =
            document.createElement("style");

        style.id =
            "packaroji-js-toast-style";

        style.textContent = `
            .packaroji-js-toast {
                position: fixed;
                left: 50%;
                bottom: 25px;
                transform: translate(-50%, 20px);
                z-index: 9999;
                max-width: min(90vw, 420px);
                padding: 13px 20px;
                border-radius: 12px;
                background: #20382a;
                color: #ffffff;
                font-size: 14px;
                font-weight: 700;
                text-align: center;
                box-shadow: 0 12px 35px rgba(0,0,0,.20);
                opacity: 0;
                pointer-events: none;
                transition:
                    opacity .25s ease,
                    transform .25s ease;
            }

            .packaroji-js-toast.show {
                opacity: 1;
                transform: translate(-50%, 0);
            }

            .cart-badge.bump {
                transform: scale(1.25);
            }

            @media (max-width: 620px) {
                .packaroji-js-toast {
                    bottom: 16px;
                    padding: 12px 16px;
                    font-size: 13px;
                }
            }
        `;

        document.head.appendChild(style);
    }



    /* =========================================================
       HERO MASCOT — RELIABLE EYES FOLLOW CURSOR (v27)
    ========================================================== */

    (() => {
        const initMascotEyes = () => {
            const svg = document.getElementById("heroMascot");
            const leftPupil = document.getElementById("heroLeftPupil");
            const rightPupil = document.getElementById("heroRightPupil");
            if (!svg || !leftPupil || !rightPupil) return;

            const pupils = [
                { el: leftPupil, cx: 106, cy: 118 },
                { el: rightPupil, cx: 154, cy: 118 },
            ];
            let mouseX = window.innerWidth / 2;
            let mouseY = window.innerHeight / 2;
            let raf = 0;

            const setEyes = () => {
                raf = 0;
                const rect = svg.getBoundingClientRect();
                if (!rect.width || !rect.height) return;

                // Convert the screen cursor position into the mascot's 260x260 SVG space.
                const mx = (mouseX - rect.left) * (260 / rect.width);
                const my = (mouseY - rect.top) * (260 / rect.height);

                pupils.forEach((pupil) => {
                    const dx = mx - pupil.cx;
                    const dy = my - pupil.cy;
                    const angle = Math.atan2(dy, dx);
                    // Small, clearly visible eye movement while keeping pupils inside the eyes.
                    const distance = Math.min(7, Math.max(0, Math.hypot(dx, dy) / 24));
                    pupil.el.setAttribute("cx", (pupil.cx + Math.cos(angle) * distance).toFixed(2));
                    pupil.el.setAttribute("cy", (pupil.cy + Math.sin(angle) * distance).toFixed(2));
                });
            };

            const requestUpdate = () => {
                if (!raf) raf = requestAnimationFrame(setEyes);
            };

            const trackPointer = (event) => {
                mouseX = event.clientX;
                mouseY = event.clientY;
                requestUpdate();
            };

            window.addEventListener("pointermove", trackPointer, { passive: true });
            window.addEventListener("mousemove", trackPointer, { passive: true });
            window.addEventListener("resize", requestUpdate, { passive: true });
            requestUpdate();
        };

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", initMascotEyes, { once: true });
        } else {
            initMascotEyes();
        }
    })();



    /* =========================================================
       PRODUCT CAROUSEL — CONTINUOUS INFINITE 3D ARC
       Every copy has a unique logical position. The cards are
       positioned individually from their live distance to center.
    ========================================================== */
    (() => {
        const sliders = document.querySelectorAll(
            ".homepage-product-carousel[data-product-carousel]"
        );
        if (!sliders.length) return;

        sliders.forEach((slider) => {
            const viewport = slider.querySelector("[data-product-viewport]");
            const track = slider.querySelector("[data-product-track]");
            const originals = Array.from(
                slider.querySelectorAll("[data-product-slide]")
            );
            const prev = slider.querySelector("[data-product-prev]");
            const next = slider.querySelector("[data-product-next]");
            const dots = Array.from(slider.querySelectorAll("[data-product-dot]"));
            const current = slider.querySelector("[data-product-current]");

            if (!viewport || !track || originals.length < 2) return;

            const count = originals.length;
            const templates = originals.map((slide) => slide.cloneNode(true));

            // Five complete copies give the viewport cards on both sides
            // throughout the entire continuous loop.
            track.innerHTML = "";
            for (let copy = -2; copy <= 2; copy++) {
                templates.forEach((template, index) => {
                    const slide = template.cloneNode(true);
                    slide.dataset.carouselIndex = String(index);
                    slide.dataset.carouselCopy = String(copy);
                    slide.setAttribute("aria-hidden", "true");
                    track.appendChild(slide);
                });
            }

            const slides = Array.from(track.querySelectorAll("[data-product-slide]"));

            let phase = 0;
            let spacing = 0;
            let cardWidth = 0;
            let dragging = false;
            let pointerId = null;
            let lastX = 0;
            let hover = false;
            let focusInside = false;
            let lastTime = performance.now();
            let raf = 0;
            let resizeTimer = 0;

            const metrics = () => {
                const w = viewport.clientWidth;

                if (w <= 600) {
                    cardWidth = Math.min(300, Math.max(245, w * 0.78));
                    spacing = cardWidth * 0.84;
                } else if (w <= 980) {
                    cardWidth = Math.min(335, Math.max(285, w * 0.43));
                    spacing = cardWidth * 0.86;
                } else {
                    cardWidth = Math.min(315, Math.max(285, w * 0.255));
                    spacing = cardWidth * 0.90;
                }

                viewport.style.setProperty("--carousel-card-width", `${cardWidth}px`);
            };

            const wrapPhase = () => {
                phase = ((phase % count) + count) % count;
            };

            const render = () => {
                if (!spacing || !viewport.clientWidth) return;

                const center = viewport.clientWidth / 2;
                let nearestIndex = 0;
                let nearestDistance = Infinity;

                slides.forEach((slide) => {
                    const index = Number(slide.dataset.carouselIndex);
                    const copy = Number(slide.dataset.carouselCopy);

                    // The copy number is essential: copies of the same product
                    // must occupy different positions instead of stacking.
                    const logicalPosition = copy * count + index;
                    const d = logicalPosition - phase;
                    const x = center + d * spacing;

                    const distance = Math.abs(d);
                    const normalized = Math.min(1.7, distance / 2.6);
                    const sign = d === 0 ? 0 : (d > 0 ? 1 : -1);

                    // Strongest focal treatment at the center, progressively
                    // curved as each card moves toward an edge.
                    const scale = 1.04 - Math.min(0.24, normalized * 0.145);
                    const rotateY = sign * Math.min(28, normalized * 22);
                    const rotateZ = sign * Math.min(2.8, normalized * 2.2);
                    const y = Math.min(42, normalized * normalized * 30);
                    const z = Math.round(180 - normalized * 80);
                    const opacity = Math.max(
                        0.25,
                        1 - Math.max(0, normalized - 0.65) * 0.72
                    );

                    slide.style.left = `${x}px`;
                    slide.style.top = "50%";
                    slide.style.width = `${cardWidth}px`;
                    slide.style.transform =
                        `translate3d(-50%, calc(-50% + ${y}px), ${z}px) ` +
                        `scale(${scale}) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`;
                    slide.style.opacity = String(opacity);
                    slide.style.zIndex = String(
                        10000 - Math.round(distance * 100)
                    );
                    slide.style.pointerEvents = distance < 3.05 ? "auto" : "none";
                    slide.setAttribute(
                        "aria-hidden",
                        distance > 0.55 ? "true" : "false"
                    );

                    if (distance < nearestDistance) {
                        nearestDistance = distance;
                        nearestIndex = index;
                    }
                });

                if (current) {
                    current.textContent = `${nearestIndex + 1} / ${count}`;
                }

                dots.forEach((dot, i) => {
                    const active = i === nearestIndex;
                    dot.classList.toggle("is-active", active);
                    dot.setAttribute("aria-current", active ? "true" : "false");
                });
            };

            const speed = () => {
                if (window.innerWidth <= 600) return 0.19;
                if (window.innerWidth <= 980) return 0.21;
                return 0.23;
            };

            const animate = (now) => {
                raf = requestAnimationFrame(animate);

                const dt = Math.min(
                    0.04,
                    Math.max(0, (now - lastTime) / 1000)
                );
                lastTime = now;

                if (!dragging) {
                    let velocity = speed();
                    if (hover || focusInside) velocity *= 0.18;
                    phase += velocity * dt;
                    wrapPhase();
                }

                render();
            };

            const nudge = (direction) => {
                phase += direction;
                wrapPhase();
                render();
            };

            const goToDot = (target) => {
                phase = target;
                wrapPhase();
                render();
            };

            const onPointerDown = (event) => {
                if (event.pointerType === "mouse" && event.button !== 0) return;
                dragging = true;
                pointerId = event.pointerId;
                lastX = event.clientX;
                slider.classList.add("is-dragging");

                try {
                    viewport.setPointerCapture(pointerId);
                } catch (_) {}

                event.preventDefault();
            };

            const onPointerMove = (event) => {
                if (!dragging || event.pointerId !== pointerId) return;

                const dx = event.clientX - lastX;
                lastX = event.clientX;

                phase -= dx / Math.max(1, spacing);
                wrapPhase();
                render();
                event.preventDefault();
            };

            const endDrag = (event) => {
                if (!dragging) return;
                if (
                    event &&
                    pointerId !== null &&
                    event.pointerId !== pointerId
                ) return;

                dragging = false;
                slider.classList.remove("is-dragging");

                try {
                    if (pointerId !== null) {
                        viewport.releasePointerCapture(pointerId);
                    }
                } catch (_) {}

                pointerId = null;
                lastTime = performance.now();
            };

            prev?.addEventListener("click", () => nudge(-1));
            next?.addEventListener("click", () => nudge(1));

            dots.forEach((dot) => {
                dot.addEventListener("click", () => {
                    goToDot(Number(dot.dataset.productDot) || 0);
                });
            });

            slider.addEventListener("keydown", (event) => {
                if (event.key === "ArrowLeft") {
                    event.preventDefault();
                    nudge(-1);
                }
                if (event.key === "ArrowRight") {
                    event.preventDefault();
                    nudge(1);
                }
            });

            slider.addEventListener("mouseenter", () => { hover = true; });
            slider.addEventListener("mouseleave", () => { hover = false; });
            slider.addEventListener("focusin", () => { focusInside = true; });
            slider.addEventListener("focusout", (event) => {
                if (!slider.contains(event.relatedTarget)) {
                    focusInside = false;
                }
            });

            viewport.addEventListener(
                "pointerdown",
                onPointerDown,
                { passive: false }
            );
            viewport.addEventListener(
                "pointermove",
                onPointerMove,
                { passive: false }
            );
            viewport.addEventListener(
                "pointerup",
                endDrag,
                { passive: true }
            );
            viewport.addEventListener(
                "pointercancel",
                endDrag,
                { passive: true }
            );
            viewport.addEventListener(
                "lostpointercapture",
                endDrag,
                { passive: true }
            );

            const onResize = () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    metrics();
                    render();
                }, 80);
            };

            window.addEventListener("resize", onResize, { passive: true });

            slider.querySelectorAll("img").forEach((img) => {
                img.draggable = false;
                img.addEventListener("dragstart", (event) => {
                    event.preventDefault();
                });
            });

            metrics();
            render();
            lastTime = performance.now();
            raf = requestAnimationFrame(animate);
        });
    })();


    /* =========================================================
       PRODUCT CATEGORY FILTERS
    ========================================================== */


});
