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
       PACKAROJI LAYER CAROUSEL — STRAIGHT 3D LOOP
       Exactly four layers. The row stays horizontally straight;
       only the cards rotate/scale on the Y axis toward the edges.
       Includes drag + touch, inertia/friction, arrows and looping.
    ========================================================== */
    (() => {
        const sliders = document.querySelectorAll(
            '.homepage-product-carousel[data-product-carousel]'
        );
        if (!sliders.length) return;

        sliders.forEach((slider) => {
            const viewport = slider.querySelector('[data-product-viewport]');
            const track = slider.querySelector('[data-product-track]');
            const originals = Array.from(track?.querySelectorAll('[data-product-slide]') || []);
            const prev = slider.querySelector('[data-product-prev]');
            const next = slider.querySelector('[data-product-next]');
            if (!viewport || !track || originals.length !== 4) return;

            const templates = originals.map((el) => el.cloneNode(true));
            const count = 4;
            const copies = 9;
            track.innerHTML = '';
            for (let copy = 0; copy < copies; copy++) {
                templates.forEach((template, index) => {
                    const slide = template.cloneNode(true);
                    slide.dataset.carouselIndex = String(index);
                    slide.dataset.carouselAbsolute = String(index + copy * count);
                    track.appendChild(slide);
                });
            }

            const slides = Array.from(track.querySelectorAll('[data-product-slide]'));
            let cardWidth = 280;
            let gap = 22;
            let step = 302;
            let position = count * 3 + 1.5;
            let velocity = 0;
            let dragging = false;
            let pointerId = null;
            let lastX = 0;
            let lastMoveTime = 0;
            let dragDistance = 0;
            let hover = false;
            let focusInside = false;
            let lastTime = performance.now();
            let raf = 0;
            let resizeTimer = 0;
            let settleUntil = 0;

            const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

            function metrics() {
                const w = viewport.clientWidth;
                if (w >= 1200) {
                    cardWidth = clamp(w * 0.215, 255, 290);
                    gap = clamp(w * 0.018, 18, 28);
                } else if (w >= 900) {
                    cardWidth = clamp(w * 0.27, 225, 270);
                    gap = 18;
                } else if (w >= 600) {
                    cardWidth = clamp(w * 0.43, 215, 255);
                    gap = 16;
                } else {
                    cardWidth = clamp(w * 0.78, 235, 285);
                    gap = 14;
                }
                step = cardWidth + gap;
                slider.style.setProperty('--carousel-card-width', `${cardWidth}px`);
                slider.style.setProperty('--carousel-gap', `${gap}px`);
            }

            function normalize() {
                const low = count * 2;
                const high = count * 6;
                while (position < low) position += count;
                while (position > high) position -= count;
            }

            function render() {
                const center = (viewport.clientWidth - cardWidth) / 2;
                const visibleRange = window.innerWidth <= 600 ? 2.15 : 2.85;

                slides.forEach((slide) => {
                    const absolute = Number(slide.dataset.carouselAbsolute);
                    let d = absolute - position;
                    // choose the nearest repeated copy
                    d -= Math.round(d / count) * count;

                    const ad = Math.abs(d);
                    const x = center + d * step;
                    const edge = clamp(ad / visibleRange, 0, 1);
                    const rotateY = clamp(d * -18, -30, 30);
                    const scale = 1 - edge * 0.075;
                    const z = Math.round(80 - edge * 70);
                    const opacity = 1 - edge * 0.08;

                    slide.style.left = `${x}px`;
                    slide.style.top = '50%';
                    slide.style.width = `${cardWidth}px`;
                    slide.style.transform = `translate3d(0, -50%, ${z}px) scale(${scale}) rotateY(${rotateY}deg)`;
                    slide.style.opacity = String(opacity);
                    slide.style.zIndex = String(1000 - Math.round(ad * 20));
                    slide.style.pointerEvents = ad < 2.3 ? 'auto' : 'none';
                });
            }

            function nudge(direction) {
                // direction -1 = previous, +1 = next
                position += direction;
                velocity = direction * 0.35;
                settleUntil = performance.now() + 420;
                normalize();
                render();
            }

            function onPointerDown(event) {
                if (event.pointerType === 'mouse' && event.button !== 0) return;
                if (event.target?.closest('a, button')) return;

                dragging = true;
                pointerId = event.pointerId;
                lastX = event.clientX;
                lastMoveTime = performance.now();
                dragDistance = 0;
                velocity = 0;
                slider.classList.add('is-dragging');
                try { viewport.setPointerCapture(pointerId); } catch (_) {}
                event.preventDefault();
            }

            function onPointerMove(event) {
                if (!dragging || event.pointerId !== pointerId) return;
                const now = performance.now();
                const dx = event.clientX - lastX;
                const dt = Math.max(8, now - lastMoveTime);
                lastX = event.clientX;
                lastMoveTime = now;
                dragDistance += Math.abs(dx);

                const movement = dx / Math.max(1, step);
                position -= movement;
                velocity = (-movement / (dt / 16.67));
                velocity = clamp(velocity, -0.55, 0.55);
                normalize();
                render();
                event.preventDefault();
            }

            function endDrag(event) {
                if (!dragging) return;
                if (event && pointerId !== null && event.pointerId !== pointerId) return;
                dragging = false;
                slider.classList.remove('is-dragging');
                try { if (pointerId !== null) viewport.releasePointerCapture(pointerId); } catch (_) {}
                pointerId = null;
                settleUntil = performance.now() + 900;
                lastTime = performance.now();
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

            prev?.addEventListener('click', () => nudge(-1));
            next?.addEventListener('click', () => nudge(1));

            slider.addEventListener('keydown', (event) => {
                if (event.key === 'ArrowLeft') { event.preventDefault(); nudge(-1); }
                if (event.key === 'ArrowRight') { event.preventDefault(); nudge(1); }
            });

            slider.addEventListener('mouseenter', () => { hover = true; });
            slider.addEventListener('mouseleave', () => { hover = false; });
            slider.addEventListener('focusin', () => { focusInside = true; });
            slider.addEventListener('focusout', (event) => {
                if (!slider.contains(event.relatedTarget)) focusInside = false;
            });

            viewport.addEventListener('pointerdown', onPointerDown, { passive: false });
            viewport.addEventListener('pointermove', onPointerMove, { passive: false });
            viewport.addEventListener('pointerup', endDrag, { passive: true });
            viewport.addEventListener('pointercancel', endDrag, { passive: true });
            viewport.addEventListener('lostpointercapture', endDrag, { passive: true });

            window.addEventListener('resize', () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => { metrics(); render(); }, 80);
            }, { passive: true });

            slider.querySelectorAll('img').forEach((img) => {
                img.draggable = false;
                img.addEventListener('dragstart', (e) => e.preventDefault());
            });

            function animate(now) {
                raf = requestAnimationFrame(animate);
                const dt = Math.min(0.04, Math.max(0, (now - lastTime) / 1000));
                lastTime = now;

                if (!dragging) {
                    if (Math.abs(velocity) > 0.002) {
                        position += velocity * dt * 60;
                        // Strong friction gives natural glide after release.
                        velocity *= Math.pow(0.035, dt);
                    } else if (now > settleUntil && !hover && !focusInside) {
                        // Very gentle automatic loop, so the four layers keep moving.
                        const auto = window.innerWidth <= 600 ? 0.055 : 0.07;
                        position += auto * dt * 60;
                    }
                    normalize();
                }
                render();
            }

            metrics();
            render();
            if (!raf) raf = requestAnimationFrame(animate);
        });
    })();


    /* =========================================================
       PRODUCT CATEGORY FILTERS
    ========================================================== */

});
