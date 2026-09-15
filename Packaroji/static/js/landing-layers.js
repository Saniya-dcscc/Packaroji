/* =========================================================
   PACKAROJI — LANDING LAYER SEQUENCE
   Scroll-scrubbed packaging animation:
     Layer 1  burger spins 360° and wraps itself
     Layer 2  wrapped burger drops into the container
     Layer 3  box closes, takes the logo, slides into the bag
     Layer 4  every layer lifts apart — brandable surfaces
========================================================= */

(function () {
    'use strict';

    var root = document.documentElement;
    root.classList.add('pk-js');

    var reduceMotion = window.matchMedia
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- tiny math helpers ---------- */

    function clamp(v, a, b) {
        return v < a ? a : (v > b ? b : v);
    }

    /* normalised position of p inside the window [a, b] */
    function span(p, a, b) {
        if (b <= a) return p >= b ? 1 : 0;
        return clamp((p - a) / (b - a), 0, 1);
    }

    function ease(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function q(scope, sel) {
        return scope ? scope.querySelector(sel) : null;
    }


    /* =====================================================
       HERO
    ===================================================== */

    var hero = document.querySelector('.pk-hero');
    var mosaic = q(hero, '.pk-mosaic');

    if (hero) {
        window.requestAnimationFrame(function () {
            hero.classList.add('is-ready');
        });
    }


    /* =====================================================
       LAYER STAGES
    ===================================================== */

    var stages = [];

    function collectStage(section) {
        var n = section.getAttribute('data-layer');
        var stage = q(section, '.pk-stage');
        var rail = q(section, '.pk-layer-rail');
        if (!stage) return null;

        var s = {
            section: section,
            stage: stage,
            rail: rail,
            n: n,
            p: 0,
            target: 0,
            el: {}
        };

        var nodes = stage.querySelectorAll('[data-el]');
        for (var i = 0; i < nodes.length; i += 1) {
            s.el[nodes[i].getAttribute('data-el')] = nodes[i];
        }
        return s;
    }

    var sections = document.querySelectorAll('.pk-layer');
    for (var i = 0; i < sections.length; i += 1) {
        var s = collectStage(sections[i]);
        if (s) stages.push(s);
    }


    /* ---------- per-layer renderers ---------- */

    function renderLayer1(e, p) {
        var spin = e.spin;
        var open = e.burgerOpen;
        var wrapped = e.burgerWrapped;
        var glow = e.glow;

        if (spin) {
            spin.style.transform = 'perspective(1500px) rotateY(' + (p * 360).toFixed(2) + 'deg)';
        }

        /* the wrap closes over the second half of the spin */
        var w = ease(span(p, 0.40, 0.82));
        var swell = Math.sin(p * Math.PI);

        if (open) {
            open.style.opacity = (1 - w).toFixed(3);
            open.style.transform =
                'translate(-50%, -50%) scale(' + (1 + swell * 0.07).toFixed(3) + ')';
        }
        if (wrapped) {
            wrapped.style.opacity = w.toFixed(3);
            wrapped.style.transform =
                'translate(-50%, -50%) scale(' + (0.9 + 0.12 * w).toFixed(3) + ')';
        }
        if (glow) {
            glow.style.opacity = (swell * 0.55).toFixed(3);
        }
    }

    function renderLayer2(e, p) {
        var box = e.box;
        var burger = e.burger;
        var landed = e.landed;

        /* burger falls fully opaque, no crossfade blur — it only ever
           overlaps the box, never the finished photo, so nothing looks cut. */
        var drop = ease(span(p, 0.06, 0.62));
        var swap = ease(span(p, 0.64, 0.78));
        var settle = ease(span(p, 0.78, 1));

        if (burger) {
            burger.style.opacity = (1 - swap).toFixed(3);
            burger.style.transform =
                'translate(-50%, -50%) translateY(' + (-118 + 118 * drop).toFixed(2) + '%)' +
                ' scale(' + (1.05 - 0.13 * drop).toFixed(3) + ')' +
                ' rotate(' + (-6 + 6 * drop).toFixed(2) + 'deg)';
        }
        if (box) {
            box.style.opacity = (1 - swap).toFixed(3);
            box.style.transform =
                'translate(-50%, -50%) scale(' + (0.97 + 0.03 * drop).toFixed(3) + ')';
        }
        if (landed) {
            landed.style.opacity = swap.toFixed(3);
            landed.style.transform =
                'translate(-50%, -50%) scale(' + (0.94 + 0.06 * settle).toFixed(3) + ')';
        }
    }

    function renderLayer3(e, p) {
        var open = e.open;
        var boxwrap = e.boxwrap;
        var logo = e.logo;
        var bagBack = e.bagBack;
        var bagFront = e.bagFront;

        var slide = ease(span(p, 0, 0.26));
        var close = span(p, 0.20, 0.34);
        var brand = ease(span(p, 0.34, 0.48));
        var bag = span(p, 0.40, 0.58);
        var into = ease(span(p, 0.54, 0.86));
        /* the logo rides the lid down, then fades out just before the
           box disappears into the bag mouth — never left poking out. */
        var vanish = ease(span(p, 0.72, 0.88));

        if (open) {
            open.style.opacity = (1 - close).toFixed(3);
            open.style.transform =
                'translate(-50%, -50%) translateY(' + (slide * 14).toFixed(2) + '%)' +
                ' scale(' + (1 - 0.06 * slide).toFixed(3) + ')';
        }
        if (boxwrap) {
            boxwrap.style.opacity = close.toFixed(3);
            boxwrap.style.transform =
                'translate(-50%, -50%) translateY(' + (into * 58).toFixed(2) + '%)' +
                ' scale(' + (1 - 0.4 * into).toFixed(3) + ')';
        }
        if (logo) {
            logo.style.opacity = (brand * (1 - vanish)).toFixed(3);
            logo.style.transform =
                'translate(-50%, -50%) scale(' + (0.7 + 0.3 * brand).toFixed(3) + ')';
        }
        if (bagBack) {
            bagBack.style.opacity = bag.toFixed(3);
            bagBack.style.transform =
                'translate(-50%, -50%) scale(' + (0.94 + 0.06 * bag).toFixed(3) + ')';
        }
        if (bagFront) {
            bagFront.style.opacity = bag.toFixed(3);
            bagFront.style.transform =
                'translate(-50%, -50%) scale(' + (0.94 + 0.06 * bag).toFixed(3) + ')';
        }
    }

    var LIFT = [
        { key: 'burger', from: 38, start: 0, hold: true },
        { key: 'box', from: 120, start: 0.12 },
        { key: 'bag', from: 200, start: 0.30 }
    ];

    function renderLayer4(e, p) {
        for (var k = 0; k < LIFT.length; k += 1) {
            var item = LIFT[k];
            var node = e[item.key];
            if (!node) continue;
            var t = ease(span(p, item.start, item.start + 0.58));
            node.style.opacity = item.hold ? '1' : t.toFixed(3);
            node.style.transform =
                'translate(-50%, -50%) translateY(' + ((1 - t) * item.from).toFixed(2) + '%)' +
                ' scale(' + (0.84 + 0.16 * t).toFixed(3) + ')';
        }
        if (e.logo) {
            var b = ease(span(p, 0.5, 0.82));
            e.logo.style.opacity = b.toFixed(3);
            e.logo.style.transform =
                'translate(-50%, -50%) scale(' + (0.6 + 0.4 * b).toFixed(3) + ')';
        }
    }

    var RENDERERS = {
        '1': renderLayer1,
        '2': renderLayer2,
        '3': renderLayer3,
        '4': renderLayer4
    };


    /* ---------- scroll loop ---------- */

    function targetProgress(section) {
        var rect = section.getBoundingClientRect();
        var travel = rect.height - window.innerHeight;
        if (travel <= 0) return rect.top <= 0 ? 1 : 0;
        return clamp(-rect.top / travel, 0, 1);
    }

    var ticking = false;

    function frame() {
        var moving = false;

        for (var k = 0; k < stages.length; k += 1) {
            var st = stages[k];
            st.target = targetProgress(st.section);

            if (reduceMotion) {
                st.p = st.target;
            } else {
                st.p += (st.target - st.p) * 0.16;
                if (Math.abs(st.target - st.p) > 0.0006) moving = true;
                else st.p = st.target;
            }

            var fn = RENDERERS[st.n];
            if (fn) fn(st.el, st.p);
            if (st.rail) st.rail.style.setProperty('--p', st.p.toFixed(3));
        }

        if (mosaic && !reduceMotion) {
            var y = clamp(window.pageYOffset, 0, 900);
            mosaic.style.transform = 'translate3d(0,' + (y * -0.055).toFixed(1) + 'px,0)';
        }

        if (moving) {
            window.requestAnimationFrame(frame);
        } else {
            ticking = false;
        }
    }

    function kick() {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(frame);
    }

    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', kick, { passive: true });
    window.addEventListener('load', kick);
    kick();


    /* =====================================================
       SECTION REVEALS
    ===================================================== */

    var revealables = document.querySelectorAll('.pk-reveal');

    if (!('IntersectionObserver' in window) || reduceMotion) {
        for (var r = 0; r < revealables.length; r += 1) {
            revealables[r].classList.add('is-in');
        }
    } else {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-in');
                    io.unobserve(entry.target);
                }
            });
        }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

        for (var v = 0; v < revealables.length; v += 1) {
            io.observe(revealables[v]);
        }
    }
})();
