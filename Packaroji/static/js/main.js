document.addEventListener("DOMContentLoaded", () => {

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

                        window.PackarojiCursor &&
                            window.PackarojiCursor.flash("happy");

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
    ========================================================== */

    const serverCartCount =
        document.body?.dataset?.cartCount;

    if (
        serverCartCount !== undefined &&
        serverCartCount !== ""
    ) {

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
                { el: leftPupil, cx: 458, cy: 300 },
                { el: rightPupil, cx: 600, cy: 289 }
            ];

            let mouseX = window.innerWidth / 2;
            let mouseY = window.innerHeight / 2;
            let raf = 0;

            const setEyes = () => {

                raf = 0;

                const rect =
                    svg.getBoundingClientRect();

                if (!rect.width || !rect.height) return;

                const mx =
                    (mouseX - rect.left) *
                    (860 / rect.width);

                const my =
                    (mouseY - rect.top) *
                    (590 / rect.height);

                pupils.forEach((pupil) => {

                    const dx =
                        mx - pupil.cx;

                    const dy =
                        my - pupil.cy;

                    const angle =
                        Math.atan2(dy, dx);

                    const distance =
                        Math.min(
                            7,
                            Math.max(
                                0,
                                Math.hypot(dx, dy) / 24
                            )
                        );

                    pupil.el.setAttribute(
                        "cx",
                        (
                            pupil.cx +
                            Math.cos(angle) *
                            distance
                        ).toFixed(2)
                    );

                    pupil.el.setAttribute(
                        "cy",
                        (
                            pupil.cy +
                            Math.sin(angle) *
                            distance
                        ).toFixed(2)
                    );
                });
            };

            const requestUpdate = () => {

                if (!raf) {
                    raf =
                        requestAnimationFrame(
                            setEyes
                        );
                }
            };

            const trackPointer = (event) => {

                mouseX = event.clientX;
                mouseY = event.clientY;

                requestUpdate();
            };

            window.addEventListener(
                "pointermove",
                trackPointer,
                { passive: true }
            );

            window.addEventListener(
                "mousemove",
                trackPointer,
                { passive: true }
            );

            window.addEventListener(
                "resize",
                requestUpdate,
                { passive: true }
            );

            requestUpdate();
        };

        if (document.readyState === "loading") {

            document.addEventListener(
                "DOMContentLoaded",
                initMascotEyes,
                { once: true }
            );

        } else {

            initMascotEyes();
        }

    })();


    /* =========================================================
       PRODUCT CAROUSEL — REFERENCE-STYLE DRAG ROW
       Homepage only.
========================================================= */

    (() => {
        const sliders = document.querySelectorAll(
            '.homepage-product-carousel[data-product-carousel]'
        );

        sliders.forEach((slider) => {
            const viewport = slider.querySelector('[data-product-viewport]');
            const track = slider.querySelector('[data-product-track]');
            const slides = Array.from(slider.querySelectorAll('[data-product-slide]'));

            if (!viewport || !track || slides.length < 2) return;

            let pointerActive = false;
            let pointerId = null;
            let startX = 0;
            let lastX = 0;
            let dragDistance = 0;
            let dragged = false;
            let pressedSlide = null;
            let suppressClick = false;

            const setDragging = (value) => {
                slider.classList.toggle('is-dragging', value);
                viewport.style.cursor = value ? 'grabbing' : 'grab';
            };

            const pointerDown = (event) => {
                if (event.pointerType === 'mouse' && event.button !== 0) return;

                pointerActive = true;
                pointerId = event.pointerId;
                startX = event.clientX;
                lastX = event.clientX;
                dragDistance = 0;
                dragged = false;
                pressedSlide = event.target.closest('[data-slide-url]') || null;

                setDragging(true);

                try { viewport.setPointerCapture(event.pointerId); } catch (_) {}
            };

            const pointerMove = (event) => {
                if (!pointerActive || event.pointerId !== pointerId) return;

                const dx = event.clientX - lastX;
                lastX = event.clientX;
                dragDistance += Math.abs(dx);

                if (dragDistance > 6) dragged = true;

                if (dragged) {
                    event.preventDefault();
                    track.style.transform = 'translate3d(' + (event.clientX - startX) + 'px,0,0)';
                }
            };

            const pointerUp = (event) => {
                if (!pointerActive || (event && event.pointerId !== pointerId)) return;

                const totalDx = lastX - startX;
                const wasDrag = dragged;
                const slide = pressedSlide;

                pointerActive = false;
                pointerId = null;
                pressedSlide = null;
                setDragging(false);

                try { if (event) viewport.releasePointerCapture(event.pointerId); } catch (_) {}

                if (wasDrag) {
                    suppressClick = true;
                    const threshold = Math.max(55, viewport.clientWidth * 0.045);

                    if (Math.abs(totalDx) >= threshold) {
                        if (totalDx < 0) {
                            const first = track.firstElementChild;
                            if (first) track.appendChild(first);
                        } else {
                            const last = track.lastElementChild;
                            if (last) track.insertBefore(last, track.firstElementChild);
                        }
                    }

                    track.style.transition = 'none';
                    track.style.transform = 'translate3d(0,0,0)';
                    window.setTimeout(() => { suppressClick = false; }, 80);
                    return;
                }

                track.style.transform = 'translate3d(0,0,0)';

                if (slide) {
                    const href = slide.dataset.slideUrl || slide.querySelector('a[href]')?.href;
                    if (href) window.location.assign(href);
                }
            };

            viewport.addEventListener('pointerdown', pointerDown, { passive: false });
            viewport.addEventListener('pointermove', pointerMove, { passive: false });
            viewport.addEventListener('pointerup', pointerUp, { passive: true });
            viewport.addEventListener('pointercancel', pointerUp, { passive: true });
            viewport.addEventListener('lostpointercapture', pointerUp, { passive: true });

            slider.addEventListener('click', (event) => {
                if (suppressClick) {
                    event.preventDefault();
                    event.stopPropagation();
                }
            }, true);

            slides.forEach((slide) => {
                const img = slide.querySelector('img');
                if (img) {
                    img.draggable = false;
                    img.addEventListener('dragstart', (event) => event.preventDefault());
                }
            });

            slider.addEventListener('keydown', (event) => {
                if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                event.preventDefault();

                if (event.key === 'ArrowLeft') {
                    const last = track.lastElementChild;
                    if (last) track.insertBefore(last, track.firstElementChild);
                } else {
                    const first = track.firstElementChild;
                    if (first) track.appendChild(first);
                }
            });
        });
    })();


    /* =========================================================
       PRODUCT CATEGORY FILTERS
    ========================================================== */

});
