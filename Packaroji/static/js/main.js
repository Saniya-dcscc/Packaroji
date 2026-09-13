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

                        // HOOK: add to cart — flash the happy emoji cursor.
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
                { el: leftPupil, cx: 458, cy: 300 },
                { el: rightPupil, cx: 600, cy: 289 },
            ];
            let mouseX = window.innerWidth / 2;
            let mouseY = window.innerHeight / 2;
            let raf = 0;

            const setEyes = () => {
                raf = 0;
                const rect = svg.getBoundingClientRect();
                if (!rect.width || !rect.height) return;

                // Convert the screen cursor position into the supplied mascot's 860x590 SVG space.
                const mx = (mouseX - rect.left) * (860 / rect.width);
                const my = (mouseY - rect.top) * (590 / rect.height);

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
       PRODUCT CAROUSEL — CONTINUOUS INFINITE 3D ARC (v37)
       Homepage only. Each physical copy has its own absolute position,
       so copies never sit on top of one another. The phase loops through
       the copies seamlessly while the cards continuously follow a shallow
       3D arc around the viewport center.
    ========================================================== */
    (() => {
        const sliders = document.querySelectorAll('.homepage-product-carousel[data-product-carousel]');
        if (!sliders.length) return;

        sliders.forEach((slider) => {
            const viewport = slider.querySelector('[data-product-viewport]');
            const track = slider.querySelector('[data-product-track]');
            const originalSlides = Array.from(slider.querySelectorAll('[data-product-slide]'));
            const prev = slider.querySelector('[data-product-prev]');
            const next = slider.querySelector('[data-product-next]');
            const dots = Array.from(slider.querySelectorAll('[data-product-dot]'));
            const current = slider.querySelector('[data-product-current]');
            if (!viewport || !track || originalSlides.length < 2) return;

            const count = originalSlides.length;
            const originals = originalSlides.map((slide) => slide.cloneNode(true));
            track.innerHTML = '';

            // Five complete copies give the animation enough runway on both edges.
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
            let hover = false;
            let focusInside = false;
            let draggedDistance = 0;
            let spacing = 0;
            let cardWidth = 0;
            let resizeTimer = 0;

            const metrics = () => {
                const w = viewport.clientWidth;
                if (w <= 600) {
                    cardWidth = Math.min(195, Math.max(165, w * 0.58));
                    spacing = cardWidth * 1.10;
                } else if (w <= 980) {
                    cardWidth = Math.min(205, Math.max(180, w * 0.33));
                    spacing = cardWidth * 1.10;
                } else {
                    cardWidth = Math.min(220, Math.max(205, w * 0.18));
                    spacing = cardWidth * 1.10;
                }
                viewport.style.setProperty('--carousel-card-width', `${cardWidth}px`);
                viewport.style.setProperty('--carousel-card-height', `${w <= 600 ? 315 : 350}px`);
            };

            const wrapPhase = () => {
                phase = ((phase % count) + count) % count;
            };

            const render = () => {
                if (!spacing) return;

                const center = viewport.clientWidth / 2;
                let nearestIndex = Math.round(phase) % count;
                if (nearestIndex < 0) nearestIndex += count;
                let nearestDistance = Infinity;

                slides.forEach((slide) => {
                    const absoluteIndex = Number(slide.dataset.carouselAbsolute);
                    const index = Number(slide.dataset.carouselIndex);
                    const d = absoluteIndex - phase;
                    const ad = Math.abs(d);

                    // Keep the physical copies parked outside the viewport instead
                    // of stacking duplicate copies at the same coordinates.
                    const x = center + d * spacing;
                    const curve = Math.min(1, ad / 2.35);
                    const sign = d === 0 ? 0 : (d < 0 ? -1 : 1);
                    const scale = 1 - Math.min(0.22, curve * 0.12);
                    const rotateY = sign * Math.min(30, curve * 25);
                    const rotateZ = sign * Math.min(3.2, curve * 2.8);
                    const y = Math.min(24, curve * curve * 20);
                    const z = Math.round(110 - curve * 65);
                    const opacity = Math.max(0.55, 1 - Math.max(0, curve - 0.78) * 0.85);

                    slide.style.left = `${x}px`;
                    slide.style.top = '50%';
                    slide.style.width = `${cardWidth}px`;
                    slide.style.transform = `translate3d(-50%, calc(-50% + ${y}px), ${z}px) scale(${scale}) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`;
                    slide.style.opacity = String(opacity);
                    slide.style.zIndex = String(1000 - Math.round(ad * 30));
                    slide.style.pointerEvents = ad < 2.7 ? 'auto' : 'none';

                    if (ad < nearestDistance) {
                        nearestDistance = ad;
                        nearestIndex = index;
                    }
                });

                if (current) current.textContent = `${nearestIndex + 1} / ${count}`;
                dots.forEach((dot, i) => {
                    const active = i === nearestIndex;
                    dot.classList.toggle('is-active', active);
                    dot.setAttribute('aria-current', active ? 'true' : 'false');
                });
            };

            const speed = () => window.innerWidth <= 600 ? 1.08 : window.innerWidth <= 980 ? 1.02 : 0.96;

            const animate = (now) => {
                raf = requestAnimationFrame(animate);
                const dt = Math.min(0.04, Math.max(0, (now - last) / 1000));
                last = now;
                if (!dragging) {
                    let s = speed();
                    if (hover || focusInside) s *= 0.58;
                    phase += s * dt;
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
                if (event.pointerType === 'mouse' && event.button !== 0) return;
                if (event.target && event.target.closest('a, button')) return;
                dragging = true;
                pointerId = event.pointerId;
                lastX = event.clientX;
                draggedDistance = 0;
                slider.classList.add('is-dragging');
                try { viewport.setPointerCapture(pointerId); } catch (_) {}
                event.preventDefault();
            };

            const onPointerMove = (event) => {
                if (!dragging || event.pointerId !== pointerId) return;
                const dx = event.clientX - lastX;
                lastX = event.clientX;
                draggedDistance += Math.abs(dx);
                phase -= dx / Math.max(1, spacing);
                wrapPhase();
                render();
                event.preventDefault();
            };

            const endDrag = (event) => {
                if (!dragging) return;
                if (event && pointerId !== null && event.pointerId !== pointerId) return;
                dragging = false;
                slider.classList.remove('is-dragging');
                try { if (pointerId !== null) viewport.releasePointerCapture(pointerId); } catch (_) {}
                pointerId = null;
                last = performance.now();
                if (draggedDistance < 8) draggedDistance = 0;
            };

            slider.querySelectorAll('[data-slide-url]').forEach((slide) => {
                slide.addEventListener('click', (event) => {
                    if (draggedDistance > 8) {
                        event.preventDefault();
                        draggedDistance = 0;
                    }
                }, true);
            });

            prev?.addEventListener('click', () => nudge(-1));
            next?.addEventListener('click', () => nudge(1));
            dots.forEach((dot) => dot.addEventListener('click', () => goToDot(Number(dot.dataset.productDot) || 0)));
            slider.addEventListener('keydown', (event) => {
                if (event.key === 'ArrowLeft') { event.preventDefault(); nudge(-1); }
                if (event.key === 'ArrowRight') { event.preventDefault(); nudge(1); }
            });
            slider.addEventListener('mouseenter', () => { hover = true; });
            slider.addEventListener('mouseleave', () => { hover = false; });
            slider.addEventListener('focusin', () => { focusInside = true; });
            slider.addEventListener('focusout', (event) => { if (!slider.contains(event.relatedTarget)) focusInside = false; });
            viewport.addEventListener('pointerdown', onPointerDown, { passive: false });
            viewport.addEventListener('pointermove', onPointerMove, { passive: false });
            viewport.addEventListener('pointerup', endDrag, { passive: true });
            viewport.addEventListener('pointercancel', endDrag, { passive: true });
            viewport.addEventListener('lostpointercapture', endDrag, { passive: true });

            const onResize = () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => { metrics(); render(); }, 80);
            };
            window.addEventListener('resize', onResize, { passive: true });

            slider.querySelectorAll('img').forEach((img) => {
                img.draggable = false;
                img.addEventListener('dragstart', (e) => e.preventDefault());
            });

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
