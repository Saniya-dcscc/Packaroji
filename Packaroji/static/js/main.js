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

                        // SUCCESS: show the happy cursor after the cart actually accepted the item.
                        window.packarojiCursor?.success();

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
       CONTINUOUS 3D PRODUCT CAROUSEL
       Uses the existing product cards/images. No framework.
    ========================================================== */

    function initInfiniteProductCarousels() {
        document.querySelectorAll("[data-product-carousel]").forEach(slider => {
            if (slider.dataset.infiniteReady === "true") return;

            const track = slider.querySelector("[data-product-track]");
            const slides = Array.from(slider.querySelectorAll("[data-product-slide]"));
            const prev = slider.querySelector("[data-product-prev]");
            const next = slider.querySelector("[data-product-next]");
            const dots = Array.from(slider.querySelectorAll("[data-product-dot]"));
            const current = slider.querySelector("[data-product-current]");

            if (!track || slides.length < 2) return;
            slider.dataset.infiniteReady = "true";

            let phase = 0;
            let lastTime = performance.now();
            let raf = 0;
            let dragging = false;
            let startX = 0;
            let startPhase = 0;
            let hovered = false;
            let focused = false;
            let speed = 0.115; // cards per second — deliberately slow/premium

            function modulo(value, length) {
                return ((value % length) + length) % length;
            }

            function shortestOffset(value, length) {
                let result = modulo(value, length);
                if (result > length / 2) result -= length;
                return result;
            }

            function layout() {
                const width = slider.clientWidth;
                const mobile = window.innerWidth <= 700;
                const tablet = window.innerWidth <= 980;
                const cardWidth = mobile ? 225 : tablet ? 250 : 278;
                const spacing = mobile ? 205 : tablet ? 226 : 258;
                const maxVisibleOffset = mobile ? 2.2 : tablet ? 2.8 : 3.4;
                const centerX = width / 2;
                const centerY = mobile ? 154 : tablet ? 158 : 170;

                slides.forEach((slide, i) => {
                    const offset = shortestOffset(i - phase, slides.length);
                    const distance = Math.abs(offset);
                    const x = centerX + offset * spacing - cardWidth / 2;
                    const curve = Math.min(distance, 3.4);
                    const y = centerY + curve * curve * (mobile ? 8 : 10);
                    const scale = Math.max(0.76, 1 - curve * (mobile ? 0.075 : 0.085));
                    const rotateY = Math.max(-34, Math.min(34, -offset * (mobile ? 8 : 11)));
                    const rotateZ = Math.max(-5, Math.min(5, offset * 1.5));
                    const opacity = distance > maxVisibleOffset ? 0 : Math.max(0.58, 1 - distance * 0.10);
                    const z = Math.round(100 - distance * 10);

                    slide.style.left = `${x}px`;
                    slide.style.top = `${y}px`;
                    slide.style.transform = `perspective(1200px) scale(${scale}) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`;
                    slide.style.opacity = String(opacity);
                    slide.style.zIndex = String(z);
                    slide.style.pointerEvents = opacity < 0.15 ? "none" : "auto";
                });

                const active = modulo(Math.round(phase), slides.length);
                if (current) current.textContent = `${active + 1} / ${slides.length}`;

                dots.forEach((dot, i) => {
                    const isActive = i === active;
                    dot.hidden = false;
                    dot.classList.toggle("is-active", isActive);
                    dot.setAttribute("aria-current", isActive ? "true" : "false");
                });
            }

            function tick(now) {
                const dt = Math.min(50, now - lastTime);
                lastTime = now;

                if (!dragging) {
                    const targetSpeed = (hovered || focused) ? 0.035 : speed;
                    phase = modulo(phase + targetSpeed * dt / 1000, slides.length);
                }

                layout();
                raf = requestAnimationFrame(tick);
            }

            function go(direction) {
                phase = modulo(Math.round(phase) + direction, slides.length);
                layout();
            }

            function pointerDown(event) {
                if (event.pointerType === "mouse" && event.button !== 0) return;
                dragging = true;
                startX = event.clientX;
                startPhase = phase;
                slider.classList.add("is-dragging");
                slider.setPointerCapture?.(event.pointerId);
            }

            function pointerMove(event) {
                if (!dragging) return;
                const mobile = window.innerWidth <= 700;
                const tablet = window.innerWidth <= 980;
                const spacing = mobile ? 205 : tablet ? 226 : 258;
                phase = modulo(startPhase - (event.clientX - startX) / spacing, slides.length);
                layout();
            }

            function pointerUp(event) {
                if (!dragging) return;
                dragging = false;
                slider.classList.remove("is-dragging");
                slider.releasePointerCapture?.(event.pointerId);
                lastTime = performance.now();
            }

            prev?.addEventListener("click", () => go(-1));
            next?.addEventListener("click", () => go(1));
            dots.forEach(dot => dot.addEventListener("click", () => {
                const target = Number(dot.dataset.productDot);
                if (!Number.isFinite(target)) return;
                let delta = target - modulo(Math.round(phase), slides.length);
                if (delta > slides.length / 2) delta -= slides.length;
                if (delta < -slides.length / 2) delta += slides.length;
                phase = modulo(phase + delta, slides.length);
                layout();
            }));

            slider.addEventListener("keydown", event => {
                if (event.key === "ArrowLeft") { event.preventDefault(); go(-1); }
                if (event.key === "ArrowRight") { event.preventDefault(); go(1); }
            });

            slider.addEventListener("pointerdown", pointerDown);
            slider.addEventListener("pointermove", pointerMove);
            slider.addEventListener("pointerup", pointerUp);
            slider.addEventListener("pointercancel", pointerUp);
            slider.addEventListener("mouseenter", () => { hovered = true; });
            slider.addEventListener("mouseleave", () => { hovered = false; });
            slider.addEventListener("focusin", () => { focused = true; });
            slider.addEventListener("focusout", event => {
                if (!slider.contains(event.relatedTarget)) focused = false;
            });
            window.addEventListener("resize", layout, { passive: true });

            layout();
            raf = requestAnimationFrame(tick);
            slider._packarojiCarouselRAF = raf;
        });
    }


    /* =========================================================
       EMOJI CURSOR — DESKTOP POINTERS ONLY
       Call window.packarojiCursor.back() or .success() from any
       existing action. The add-to-cart success hook is wired above.
    ========================================================== */

    function initPackarojiCursor() {
        const finePointer = window.matchMedia?.("(pointer: fine)")?.matches;
        if (!finePointer) {
            window.packarojiCursor = { back() {}, success() {} };
            return;
        }

        let timer = null;
        let active = false;

        function emojiCursor(emoji) {
            const canvas = document.createElement("canvas");
            canvas.width = 48;
            canvas.height = 48;
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, 48, 48);
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = '34px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
            ctx.fillText(emoji, 24, 24);
            return canvas.toDataURL("image/png");
        }

        const cursors = {
            back: emojiCursor("🥹"),
            success: emojiCursor("😁")
        };

        function clearCursor() {
            if (!active) return;
            active = false;
            clearTimeout(timer);
            document.body.style.removeProperty("cursor");
        }

        function show(kind) {
            active = true;
            clearTimeout(timer);
            document.body.style.cursor = `url("${cursors[kind]}" ) 4 4, auto`;
            timer = setTimeout(clearCursor, 1800);
        }

        // A real mouse movement after the action returns the normal cursor immediately.
        document.addEventListener("mousemove", () => {
            if (active) clearCursor();
        }, { passive: true });

        window.packarojiCursor = {
            back: () => show("back"),
            success: () => show("success")
        };

        // Automatically cover existing "back / shop" actions without changing their markup.
        document.querySelectorAll("a, button").forEach(element => {
            const text = (element.textContent || "").trim().toLowerCase();
            const href = (element.getAttribute("href") || "").toLowerCase();
            const isBack = /back|continue shopping|go back|back to shop/.test(text) ||
                /(^|\/)(products|food|bakery)(\/|$)/.test(href) && /continue|back|shop|products/.test(text);
            if (isBack) element.addEventListener("click", () => window.packarojiCursor.back(), { passive: true });
        });

        // Checkout success is marked by the server after the order is actually saved.
        const params = new URLSearchParams(window.location.search);
        if (params.get("order_success") === "1") {
            show("success");
            params.delete("order_success");
            const clean = `${window.location.pathname}${params.toString() ? `?${params}` : ""}${window.location.hash}`;
            window.history.replaceState(null, "", clean);
        }
    }


    initInfiniteProductCarousels();
    initPackarojiCursor();

});
