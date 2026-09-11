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
       PRODUCT CAROUSEL — CONTINUOUS INFINITE 3D ARC (v31)
       Only controls [data-product-carousel].
    ========================================================== */
    (() => {
        const sliders = document.querySelectorAll(".homepage-product-carousel[data-product-carousel]");
        if (!sliders.length) return;

        sliders.forEach((slider) => {
            const track = slider.querySelector("[data-product-track]");
            const viewport = slider.querySelector("[data-product-viewport]");
            const originalSlides = Array.from(slider.querySelectorAll("[data-product-slide]"));
            const prev = slider.querySelector("[data-product-prev]");
            const next = slider.querySelector("[data-product-next]");
            const dots = Array.from(slider.querySelectorAll("[data-product-dot]"));
            const current = slider.querySelector("[data-product-current]");

            if (!track || !viewport || originalSlides.length < 2) return;

            // Build three identical sets. The middle set is the starting point;
            // the animation can therefore wrap by exactly one set with no visual jump.
            const originals = originalSlides.map((slide) => slide.cloneNode(true));
            const leftSet = originals.map((slide) => slide.cloneNode(true));
            const rightSet = originals.map((slide) => slide.cloneNode(true));
            const leftFragment = document.createDocumentFragment();
            leftSet.forEach((slide) => { slide.dataset.carouselClone = "left"; leftFragment.appendChild(slide); });
            track.insertBefore(leftFragment, track.firstChild);
            const rightFragment = document.createDocumentFragment();
            rightSet.forEach((slide) => { slide.dataset.carouselClone = "right"; rightFragment.appendChild(slide); });
            track.appendChild(rightFragment);

            const slides = Array.from(track.querySelectorAll("[data-product-slide]"));
            const count = originalSlides.length;
            let slideWidth = 0;
            let cycleWidth = 0;
            let offset = 0;
            let lastTime = performance.now();
            let raf = 0;
            let dragging = false;
            let pointerId = null;
            let dragX = 0;
            let hover = false;
            let focusInside = false;
            let resizeTimer = 0;

            const getSpeed = () => {
                // Pixels/second: deliberately slow and premium.
                return window.innerWidth <= 700 ? 26 : window.innerWidth <= 980 ? 32 : 40;
            };

            const wrapOffset = () => {
                if (!cycleWidth) return;
                // Keep the middle copy under the viewport while continuously moving.
                while (offset <= -cycleWidth) offset += cycleWidth;
                while (offset > 0) offset -= cycleWidth;
            };

            const setSlideSize = () => {
                const visible = window.innerWidth <= 700 ? 1.45 : window.innerWidth <= 980 ? 2.15 : 3.15;
                slideWidth = viewport.clientWidth / visible;
                cycleWidth = slideWidth * count;
                slides.forEach((slide) => {
                    slide.style.flex = `0 0 ${slideWidth}px`;
                    slide.style.width = `${slideWidth}px`;
                    slide.style.boxSizing = "border-box";
                });
                // Start at the middle copy.
                if (!slider.dataset.carouselReady) {
                    offset = -cycleWidth;
                    slider.dataset.carouselReady = "true";
                } else {
                    // Preserve relative position after resize.
                    wrapOffset();
                }
                render();
            };

            const render = () => {
                if (!slideWidth) return;
                track.style.transform = `translate3d(${offset}px,0,0)`;

                const viewportRect = viewport.getBoundingClientRect();
                const centerX = viewportRect.left + viewportRect.width / 2;
                const perspective = Math.max(500, viewportRect.width * 0.72);

                let closestIndex = 0;
                let closestDistance = Infinity;

                slides.forEach((slide, i) => {
                    const rect = slide.getBoundingClientRect();
                    const cardCenter = rect.left + rect.width / 2;
                    const distance = cardCenter - centerX;
                    const normalized = Math.max(-1.35, Math.min(1.35, distance / (viewportRect.width * 0.46)));
                    const abs = Math.min(1, Math.abs(normalized));

                    // Center = straight/largest. Edges = smaller and rotated outward.
                    const scale = 1.055 - (abs * 0.22);
                    const rotateY = normalized * -25;
                    const curveY = Math.pow(abs, 2) * 34;
                    const z = (1 - abs) * 80;
                    const opacity = 1 - Math.max(0, abs - 0.82) * 0.75;

                    slide.style.transform = `translate3d(0, ${curveY}px, ${z}px) scale(${scale}) rotateY(${rotateY}deg)`;
                    slide.style.opacity = String(Math.max(0.72, opacity));
                    slide.style.zIndex = String(Math.round(100 - abs * 50));
                    slide.style.transformOrigin = "center center";

                    const d = Math.abs(distance);
                    if (d < closestDistance) {
                        closestDistance = d;
                        closestIndex = i % count;
                    }
                });

                if (current) {
                    current.textContent = `${closestIndex + 1} / ${count}`;
                }
                dots.forEach((dot, i) => {
                    const active = i === closestIndex;
                    dot.classList.toggle("is-active", active);
                    dot.setAttribute("aria-current", active ? "true" : "false");
                    dot.hidden = false;
                });
            };

            const animate = (now) => {
                raf = requestAnimationFrame(animate);
                const dt = Math.min(0.035, Math.max(0, (now - lastTime) / 1000));
                lastTime = now;

                if (!dragging) {
                    let speed = getSpeed();
                    if (hover || focusInside) speed *= 0.24;
                    offset -= speed * dt;
                    wrapOffset();
                }
                render();
            };

            const nudge = (direction) => {
                offset += direction * slideWidth * 0.72;
                wrapOffset();
                render();
            };

            const goToDot = (target) => {
                if (!cycleWidth) return;
                const middleStart = -cycleWidth;
                // Find the nearest equivalent position for the requested original slide.
                const desired = middleStart - (target * slideWidth);
                const currentCycle = Math.round((offset - desired) / cycleWidth);
                offset = desired + currentCycle * cycleWidth;
                wrapOffset();
                render();
            };

            const onPointerDown = (event) => {
                if (event.pointerType === "mouse" && event.button !== 0) return;
                dragging = true;
                pointerId = event.pointerId;
                dragX = event.clientX;
                slider.classList.add("is-dragging");
                try { slider.setPointerCapture(pointerId); } catch (_) {}
                event.preventDefault();
            };

            const onPointerMove = (event) => {
                if (!dragging || event.pointerId !== pointerId) return;
                const dx = event.clientX - dragX;
                dragX = event.clientX;
                offset += dx;
                wrapOffset();
                render();
                event.preventDefault();
            };

            const endDrag = (event) => {
                if (!dragging) return;
                if (event && pointerId !== null && event.pointerId !== pointerId) return;
                dragging = false;
                slider.classList.remove("is-dragging");
                try { if (pointerId !== null) slider.releasePointerCapture(pointerId); } catch (_) {}
                pointerId = null;
                lastTime = performance.now();
            };

            if (prev) prev.addEventListener("click", () => nudge(1));
            if (next) next.addEventListener("click", () => nudge(-1));
            dots.forEach((dot) => dot.addEventListener("click", () => goToDot(Number(dot.dataset.productDot) || 0)));

            slider.addEventListener("keydown", (event) => {
                if (event.key === "ArrowLeft") { event.preventDefault(); nudge(1); }
                if (event.key === "ArrowRight") { event.preventDefault(); nudge(-1); }
            });

            slider.addEventListener("mouseenter", () => { hover = true; });
            slider.addEventListener("mouseleave", () => { hover = false; });
            slider.addEventListener("focusin", () => { focusInside = true; });
            slider.addEventListener("focusout", (event) => {
                if (!slider.contains(event.relatedTarget)) focusInside = false;
            });

            viewport.addEventListener("pointerdown", onPointerDown, { passive: false });
            viewport.addEventListener("pointermove", onPointerMove, { passive: false });
            viewport.addEventListener("pointerup", endDrag, { passive: true });
            viewport.addEventListener("pointercancel", endDrag, { passive: true });
            viewport.addEventListener("lostpointercapture", endDrag, { passive: true });

            const onResize = () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(setSlideSize, 80);
            };
            window.addEventListener("resize", onResize, { passive: true });

            setSlideSize();
            lastTime = performance.now();
            raf = requestAnimationFrame(animate);

            // Prevent the browser's native image dragging from fighting the slider.
            slider.querySelectorAll("img").forEach((img) => {
                img.draggable = false;
                img.addEventListener("dragstart", (e) => e.preventDefault());
            });
        });
    })();


    /* =========================================================
       PRODUCT CATEGORY FILTERS
    ========================================================== */


});
