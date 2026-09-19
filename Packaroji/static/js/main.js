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
       PRODUCT CAROUSEL — STRAIGHT, SLOW, CURSOR-CONTROLLED
       Homepage only.
       - Cards stay on one straight horizontal line.
       - Auto-scroll is intentionally slow.
       - Moving the pointer anywhere over the carousel gently
         steers the cards left/right.
       - Leaving the carousel returns to the normal slow motion.
       - Dragging works from anywhere on a card or empty carousel
         area; no double-click or special gap is required.
    ========================================================== */

    (() => {

        const sliders = document.querySelectorAll(
            '.homepage-product-carousel[data-product-carousel]'
        );

        if (!sliders.length) return;

        sliders.forEach((slider) => {
            const viewport = slider.querySelector('[data-product-viewport]');
            const track = slider.querySelector('[data-product-track]');
            const originalSlides = Array.from(slider.querySelectorAll('[data-product-slide]'));
            const prev = slider.querySelector('[data-product-prev]');
            const next = slider.querySelector('[data-product-next]');

            if (!viewport || !track || originalSlides.length < 2) return;

            const count = originalSlides.length;
            const originals = originalSlides.map((slide) => slide.cloneNode(true));

            track.innerHTML = '';

            // Five copies keep the infinite carousel seamless in both directions.
            for (let copy = -2; copy <= 2; copy += 1) {
                originals.forEach((template, index) => {
                    const slide = template.cloneNode(true);
                    slide.dataset.carouselIndex = String(index);
                    slide.dataset.carouselAbsolute = String(index + copy * count);
                    track.appendChild(slide);
                });
            }

            const slides = Array.from(track.querySelectorAll('[data-product-slide]'));

            let phase = 0;
            let last = performance.now();
            let raf = 0;
            let dragging = false;
            let pointerId = null;
            let lastX = 0;
            let draggedDistance = 0;
            let pointerInside = false;
            let pointerBias = 0;
            let targetVelocity = 0.18;
            let velocity = 0.18;
            let spacing = 0;
            let cardWidth = 220;
            let cardHeight = 300;
            let resizeTimer = 0;

            const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

            const metrics = () => {
                const w = viewport.clientWidth;

                if (w <= 520) {
                    cardWidth = Math.min(185, Math.max(160, w * 0.64));
                    cardHeight = 275;
                } else if (w <= 700) {
                    cardWidth = Math.min(200, Math.max(175, w * 0.55));
                    cardHeight = 285;
                } else if (w <= 980) {
                    cardWidth = 205;
                    cardHeight = 295;
                } else {
                    cardWidth = 220;
                    cardHeight = 300;
                }

                // A modest gap keeps the cards clearly separated while still
                // allowing several cards to remain visible on desktop.
                spacing = cardWidth + (w <= 700 ? 16 : 26);

                viewport.style.setProperty('--carousel-card-width', `${cardWidth}px`);
                viewport.style.setProperty('--carousel-card-height', `${cardHeight}px`);
                viewport.style.setProperty('--carousel-spacing', `${spacing}px`);
            };

            const wrapPhase = () => {
                phase = ((phase % count) + count) % count;
            };

            const render = () => {
                if (!spacing) return;

                const center = viewport.clientWidth / 2;

                slides.forEach((slide) => {
                    const absoluteIndex = Number(slide.dataset.carouselAbsolute);
                    const d = absoluteIndex - phase;
                    const ad = Math.abs(d);

                    // Keep every card perfectly straight: no arc, tilt, rotation,
                    // vertical offset or scale changes.
                    const x = center + d * spacing;

                    slide.style.left = `${x}px`;
                    slide.style.top = '50%';
                    slide.style.width = `${cardWidth}px`;
                    slide.style.height = `${cardHeight}px`;
                    slide.style.transform = 'translate3d(-50%, -50%, 0)';
                    slide.style.opacity = ad < 3.8 ? '1' : '0';
                    slide.style.zIndex = String(1000 - Math.round(ad));
                    slide.style.pointerEvents = ad < 2.8 ? 'auto' : 'none';
                });
            };

            const baseSpeed = () => {
                // Deliberately slow. This is phase units per second.
                if (window.innerWidth <= 600) return 0.15;
                if (window.innerWidth <= 980) return 0.16;
                return 0.18;
            };

            const updateTargetVelocity = () => {
                const base = baseSpeed();

                if (!pointerInside || dragging) {
                    targetVelocity = base;
                    return;
                }

                // Pointer at the left => gently move the carousel left.
                // Pointer at the right => gently move it right.
                // The effect is intentionally restrained so it never shoots fast.
                targetVelocity = base - pointerBias * 0.42;
            };

            const animate = (now) => {
                raf = requestAnimationFrame(animate);

                const dt = Math.min(0.04, Math.max(0, (now - last) / 1000));
                last = now;

                updateTargetVelocity();

                // Smoothly approach the requested speed instead of snapping.
                velocity += (targetVelocity - velocity) * Math.min(1, dt * 5.5);

                if (!dragging) {
                    phase += velocity * dt;
                    wrapPhase();
                }

                render();
            };

            const nudge = (direction) => {
                // Small, controlled button movement.
                phase += direction * 0.65;
                wrapPhase();
                velocity = 0;
                targetVelocity = baseSpeed();
                render();
            };

            const onPointerMove = (event) => {
                const rect = viewport.getBoundingClientRect();
                if (!rect.width) return;

                if (dragging) {
                    if (event.pointerId !== pointerId) return;

                    const dx = event.clientX - lastX;
                    lastX = event.clientX;
                    draggedDistance += Math.abs(dx);

                    // Direct, predictable dragging from ANY point in the slider.
                    phase -= dx / Math.max(1, spacing);
                    wrapPhase();
                    render();
                    event.preventDefault();
                    return;
                }

                const normalized = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                pointerBias = clamp(normalized, -1, 1);
                pointerInside = true;
                updateTargetVelocity();
            };

            const onPointerDown = (event) => {
                if (event.pointerType === 'mouse' && event.button !== 0) return;

                dragging = true;
                pointerId = event.pointerId;
                lastX = event.clientX;
                draggedDistance = 0;
                velocity = 0;
                targetVelocity = 0;

                slider.classList.add('is-dragging');

                try {
                    viewport.setPointerCapture(pointerId);
                } catch (_) {}
            };

            const endDrag = (event) => {
                if (!dragging) return;
                if (event && pointerId !== null && event.pointerId !== pointerId) return;

                dragging = false;
                slider.classList.remove('is-dragging');

                try {
                    if (pointerId !== null) viewport.releasePointerCapture(pointerId);
                } catch (_) {}

                pointerId = null;
                targetVelocity = baseSpeed();
                velocity = 0;
            };

            slider.querySelectorAll('[data-slide-url]').forEach((slide) => {
                slide.addEventListener('click', (event) => {
                    // A normal tap/click opens the product. A real drag does not.
                    if (draggedDistance > 8) {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                    draggedDistance = 0;
                }, true);
            });

            prev?.addEventListener('click', () => nudge(-1));
            next?.addEventListener('click', () => nudge(1));

            slider.addEventListener('keydown', (event) => {
                if (event.key === 'ArrowLeft') {
                    event.preventDefault();
                    nudge(-1);
                } else if (event.key === 'ArrowRight') {
                    event.preventDefault();
                    nudge(1);
                }
            });

            slider.addEventListener('pointerenter', (event) => {
                pointerInside = true;
                const rect = viewport.getBoundingClientRect();
                pointerBias = clamp((((event.clientX - rect.left) / rect.width) * 2) - 1, -1, 1);
                updateTargetVelocity();
            });

            slider.addEventListener('pointerleave', () => {
                if (!dragging) {
                    pointerInside = false;
                    pointerBias = 0;
                    targetVelocity = baseSpeed();
                }
            });

            viewport.addEventListener('pointerdown', onPointerDown, { passive: false });
            viewport.addEventListener('pointermove', onPointerMove, { passive: false });
            viewport.addEventListener('pointerup', endDrag, { passive: true });
            viewport.addEventListener('pointercancel', endDrag, { passive: true });
            viewport.addEventListener('lostpointercapture', endDrag, { passive: true });

            slider.querySelectorAll('img').forEach((img) => {
                img.draggable = false;
                img.addEventListener('dragstart', (event) => event.preventDefault());
            });

            const onResize = () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    metrics();
                    render();
                }, 80);
            };

            window.addEventListener('resize', onResize, { passive: true });

            metrics();
            render();
            last = performance.now();
            raf = requestAnimationFrame(animate);
        });

    })();


    /* =========================================================
       PRODUCT CATEGORY FILTERS
    ========================================================== */

});
