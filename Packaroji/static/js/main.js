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
       HERO MASCOT — RESPONSIVE EYES FOLLOW POINTER/TOUCH (v54)
       Works with mouse, touch and stylus. Pupils are clamped
       so they remain inside the white eye circles.
    ========================================================== */
    (() => {
        const initMascotEyes = () => {
            const stage = document.getElementById("packaroji-mascot-stage");
            const svg = document.querySelector("#packaroji-mascot svg");
            const leftPupil = document.getElementById("pk-left-pupil");
            const rightPupil = document.getElementById("pk-right-pupil");

            if (!stage || !svg || !leftPupil || !rightPupil) return;

            const pupils = [
                { el: leftPupil, cx: 238, cy: 281 },
                { el: rightPupil, cx: 392, cy: 281 }
            ];

            const MAX_OFFSET = 14;
            let targetX = window.innerWidth / 2;
            let targetY = window.innerHeight / 2;
            let currentX = targetX;
            let currentY = targetY;
            let active = false;
            let raf = 0;

            const clamp = (value, min, max) =>
                Math.max(min, Math.min(max, value));

            const update = () => {
                raf = 0;

                const rect = svg.getBoundingClientRect();
                if (!rect.width || !rect.height) return;

                const scaleX = 620 / rect.width;
                const scaleY = 500 / rect.height;

                // Smooth interpolation gives the eyes a natural follow effect.
                currentX += (targetX - currentX) * 0.18;
                currentY += (targetY - currentY) * 0.18;

                pupils.forEach(({ el, cx, cy }) => {
                    const mx = (currentX - rect.left) * scaleX;
                    const my = (currentY - rect.top) * scaleY;

                    const dx = mx - cx;
                    const dy = my - cy;
                    const angle = Math.atan2(dy, dx);
                    const distance = Math.min(
                        MAX_OFFSET,
                        Math.hypot(dx, dy) * 0.08
                    );

                    const ox = Math.cos(angle) * distance;
                    const oy = Math.sin(angle) * distance;

                    // transform avoids changing the SVG eye geometry itself.
                    el.setAttribute(
                        "transform",
                        `translate(${ox.toFixed(2)} ${oy.toFixed(2)})`
                    );
                });

                if (
                    Math.abs(targetX - currentX) > 0.25 ||
                    Math.abs(targetY - currentY) > 0.25
                ) {
                    raf = requestAnimationFrame(update);
                }
            };

            const requestUpdate = () => {
                if (!raf) raf = requestAnimationFrame(update);
            };

            const trackPointer = (event) => {
                if (typeof event.clientX !== "number" ||
                    typeof event.clientY !== "number") return;

                targetX = event.clientX;
                targetY = event.clientY;
                active = true;
                requestUpdate();
            };

            const resetToCenter = () => {
                if (!active) return;
                const rect = stage.getBoundingClientRect();
                targetX = rect.left + rect.width / 2;
                targetY = rect.top + rect.height / 2;
                active = false;
                requestUpdate();
            };

            window.addEventListener("pointermove", trackPointer, { passive: true });
            window.addEventListener("pointerleave", resetToCenter, { passive: true });
            window.addEventListener("resize", requestUpdate, { passive: true });
            window.addEventListener("scroll", requestUpdate, { passive: true });

            // iOS/Android touch movement also updates the eyes.
            window.addEventListener("touchmove", (event) => {
                const touch = event.touches && event.touches[0];
                if (!touch) return;
                targetX = touch.clientX;
                targetY = touch.clientY;
                active = true;
                requestUpdate();
            }, { passive: true });

            // Start centered.
            requestUpdate();
        };

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", initMascotEyes, { once: true });
        } else {
            initMascotEyes();
        }
    })();


    /* =========================================================
       PRODUCT CAROUSEL — RECORDING-MATCHED, STRAIGHT + SMOOTH
       - Straight row, no curve/tilt/scale.
       - Slow continuous auto-motion.
       - Pointer anywhere over cards steers left/right gently.
       - Leaving returns to slow auto-motion.
       - Drag from anywhere; no double-click.
       - Click/tap still opens a card; real drags do not navigate.
       - Touch swipe supported.
    ========================================================== */
    (() => {
        const sliders = document.querySelectorAll('.homepage-product-carousel[data-product-carousel]');
        if (!sliders.length) return;

        sliders.forEach((slider) => {
            const viewport = slider.querySelector('[data-product-viewport]');
            const track = slider.querySelector('[data-product-track]');
            const originals = Array.from(slider.querySelectorAll('[data-product-slide]'));
            const prev = slider.querySelector('[data-product-prev]');
            const next = slider.querySelector('[data-product-next]');
            if (!viewport || !track || originals.length < 2) return;

            const count = originals.length;
            const templates = originals.map(s => s.cloneNode(true));
            track.innerHTML = '';

            for (let copy = -2; copy <= 2; copy++) {
                templates.forEach((template, index) => {
                    const slide = template.cloneNode(true);
                    slide.dataset.carouselIndex = String(index);
                    slide.dataset.carouselCopy = String(copy);
                    track.appendChild(slide);
                });
            }

            const slides = Array.from(track.querySelectorAll('[data-product-slide]'));
            let offset = 0;
            let lastTime = performance.now();
            let pointerInside = false;
            let pointerBias = 0;
            let dragging = false;
            let pointerId = null;
            let lastX = 0;
            let dragDistance = 0;
            let cardWidth = 286;
            let gap = 28;
            let step = 314;
            let resizeTimer = 0;

            const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

            function measure() {
                const w = viewport.clientWidth;
                if (w >= 1400) {
                    cardWidth = clamp(w * 0.16, 270, 300);
                    gap = 28;
                } else if (w >= 1000) {
                    cardWidth = clamp(w * 0.20, 245, 285);
                    gap = 24;
                } else if (w >= 700) {
                    cardWidth = clamp(w * 0.29, 205, 250);
                    gap = 20;
                } else {
                    cardWidth = clamp(w * 0.68, 175, 225);
                    gap = 16;
                }
                step = cardWidth + gap;
                viewport.style.setProperty('--carousel-card-width', `${cardWidth}px`);
                viewport.style.setProperty('--carousel-gap', `${gap}px`);
            }

            function normalize() {
                const cycle = count * step;
                if (!cycle) return;
                while (offset <= -cycle) offset += cycle;
                while (offset >= cycle) offset -= cycle;
            }

            function render() {
                const center = viewport.clientWidth / 2;
                const startX = center - ((count - 1) * step) / 2;

                slides.forEach((slide) => {
                    const index = Number(slide.dataset.carouselIndex);
                    const copy = Number(slide.dataset.carouselCopy);
                    const x = startX + index * step + copy * count * step + offset;

                    slide.style.left = `${x}px`;
                    slide.style.top = '50%';
                    slide.style.width = `${cardWidth}px`;
                    slide.style.height = 'auto';
                    slide.style.transform = 'translate(-50%, -50%)';
                    slide.style.opacity = '1';
                    slide.style.zIndex = '1';
                    slide.style.pointerEvents = 'auto';
                });
            }

            function autoSpeed() {
                if (window.innerWidth <= 600) return 13;
                if (window.innerWidth <= 980) return 16;
                return 19;
            }

            function desiredSpeed() {
                if (!pointerInside || dragging) return autoSpeed();
                return pointerBias * 34;
            }

            function animate(now) {
                requestAnimationFrame(animate);
                const dt = Math.min(0.04, Math.max(0, (now - lastTime) / 1000));
                lastTime = now;

                if (dragging) return;

                const desired = desiredSpeed();
                const current = Number(slider.dataset.currentSpeed || autoSpeed());
                const smoothing = 1 - Math.exp(-dt * 4.5);
                const speed = current + (desired - current) * smoothing;

                slider.dataset.currentSpeed = String(speed);
                offset += speed * dt;
                normalize();
                render();
            }

            function setBias(clientX) {
                const rect = viewport.getBoundingClientRect();
                if (!rect.width) return;
                pointerBias = clamp(((clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
                pointerInside = true;
            }

            function onPointerMove(event) {
                if (dragging) {
                    if (event.pointerId !== pointerId) return;
                    const dx = event.clientX - lastX;
                    lastX = event.clientX;
                    dragDistance += Math.abs(dx);
                    offset += dx;
                    normalize();
                    render();
                    event.preventDefault();
                    return;
                }
                setBias(event.clientX);
            }

            function onPointerDown(event) {
                if (event.pointerType === 'mouse' && event.button !== 0) return;
                dragging = true;
                pointerId = event.pointerId;
                lastX = event.clientX;
                dragDistance = 0;
                slider.dataset.currentSpeed = '0';
                slider.classList.add('is-dragging');
                try { viewport.setPointerCapture(pointerId); } catch (_) {}
                event.preventDefault();
            }

            function endDrag(event) {
                if (!dragging) return;
                if (event && pointerId !== null && event.pointerId !== pointerId) return;
                dragging = false;
                slider.classList.remove('is-dragging');
                slider.dataset.currentSpeed = '0';
                try { if (pointerId !== null) viewport.releasePointerCapture(pointerId); } catch (_) {}
                pointerId = null;
            }

            function nudge(direction) {
                offset += direction * step;
                normalize();
                render();
                slider.dataset.currentSpeed = '0';
            }

            slider.querySelectorAll('[data-slide-url]').forEach((slide) => {
                slide.addEventListener('click', (event) => {
                    if (dragDistance > 8) {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                    dragDistance = 0;
                }, true);
            });

            prev?.addEventListener('click', () => nudge(1));
            next?.addEventListener('click', () => nudge(-1));

            slider.addEventListener('pointerenter', (event) => setBias(event.clientX));
            slider.addEventListener('pointermove', onPointerMove, { passive: false });
            slider.addEventListener('pointerleave', () => {
                if (!dragging) {
                    pointerInside = false;
                    pointerBias = 0;
                }
            });

            viewport.addEventListener('pointerdown', onPointerDown, { passive: false });
            viewport.addEventListener('pointerup', endDrag, { passive: true });
            viewport.addEventListener('pointercancel', endDrag, { passive: true });
            viewport.addEventListener('lostpointercapture', endDrag, { passive: true });

            slider.addEventListener('keydown', (event) => {
                if (event.key === 'ArrowLeft') {
                    event.preventDefault();
                    nudge(1);
                } else if (event.key === 'ArrowRight') {
                    event.preventDefault();
                    nudge(-1);
                }
            });

            slider.querySelectorAll('img').forEach((img) => {
                img.draggable = false;
                img.addEventListener('dragstart', (event) => event.preventDefault());
            });

            window.addEventListener('resize', () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    measure();
                    normalize();
                    render();
                }, 80);
            }, { passive: true });

            measure();
            render();
            slider.dataset.currentSpeed = String(autoSpeed());
            lastTime = performance.now();
            requestAnimationFrame(animate);
        });
    })();


    /* =========================================================
       PRODUCT CATEGORY FILTERS
    ========================================================== */

});
