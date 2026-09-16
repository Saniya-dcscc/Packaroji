/* Packaroji landing-photo organic reveal trail. */
(function () {
  'use strict';

  function init() {
    var wrap = document.querySelector('.hero-template-landing-photo');
    if (!wrap) return;

    var backImg = wrap.querySelector('img');
    if (!backImg || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)) return;

    /* The existing image is the back/revealed layer. Do not replace it. */
    backImg.classList.add('landing-trail-back');
    backImg.style.position = 'absolute';
    backImg.style.inset = '0';
    backImg.style.width = '100%';
    backImg.style.height = '100%';
    backImg.style.objectFit = 'cover';
    backImg.style.zIndex = '1';
    backImg.style.filter = 'saturate(1.55) hue-rotate(-6deg) brightness(1.08) contrast(1.03)';

    /* Create a true front layer wrapper, then duplicate the exact same image inside it. */
    var frontLayer = document.createElement('div');
    frontLayer.className = 'landing-trail-front-layer';
    frontLayer.setAttribute('aria-hidden', 'true');
    frontLayer.style.position = 'absolute';
    frontLayer.style.inset = '0';
    frontLayer.style.width = '100%';
    frontLayer.style.height = '100%';
    frontLayer.style.zIndex = '2';
    frontLayer.style.pointerEvents = 'none';
    frontLayer.style.backgroundRepeat = 'no-repeat';
    frontLayer.style.backgroundPosition = 'center';
    frontLayer.style.backgroundSize = 'cover';

    var frontImg = backImg.cloneNode(true);
    frontImg.classList.remove('landing-trail-back');
    frontImg.classList.add('landing-trail-front');
    frontImg.removeAttribute('alt');
    frontImg.setAttribute('aria-hidden', 'true');
    frontImg.style.position = 'absolute';
    frontImg.style.inset = '0';
    frontImg.style.width = '100%';
    frontImg.style.height = '100%';
    frontImg.style.objectFit = 'cover';
    frontImg.style.opacity = '0';
    frontImg.style.pointerEvents = 'none';
    frontLayer.appendChild(frontImg);
    wrap.appendChild(frontLayer);

    /* Offscreen render surface. It is never shown directly. */
    var off = document.createElement('canvas');
    var offCtx = off.getContext('2d', { alpha: true });
    if (!offCtx) return;

    var points = [];
    var hovering = false;
    var headX = 0;
    var headY = 0;
    var lastSample = null;
    var headRadius = 0;
    var time = 0;
    var width = 0;
    var height = 0;
    var frontImgReady = false;
    var resizeQueued = true;

    var MAX_POINTS = 60;
    var TRAIL_SAMPLE_DIST = 8;
    var TRAIL_HEAD_R = 140;
    var TRAIL_BLOB_PTS = 24;
    var TRAIL_FADE_SPEED = 0.92;
    var TRAIL_NOISE_AMP = 28;

    function resizeOffIfNeeded() {
      var rect = wrap.getBoundingClientRect();
      var w = Math.max(1, Math.round(rect.width));
      var h = Math.max(1, Math.round(rect.height));
      if (!resizeQueued && w === width && h === height) return;
      width = w;
      height = h;
      off.width = width;
      off.height = height;
      resizeQueued = false;
    }

    function localPointer(clientX, clientY) {
      var rect = wrap.getBoundingClientRect();
      if (
        clientX < rect.left || clientX > rect.right ||
        clientY < rect.top || clientY > rect.bottom
      ) {
        return null;
      }
      return { x: clientX - rect.left, y: clientY - rect.top };
    }

    function setPointer(clientX, clientY) {
      var local = localPointer(clientX, clientY);
      if (!local) return;
      headX = local.x;
      headY = local.y;
      hovering = true;
    }

    function drawMorphBlobOn(c, cx, cy, radius, t, seed) {
      if (radius < 2) return;

      var pts = new Array(TRAIL_BLOB_PTS);
      var scale = radius / TRAIL_HEAD_R;

      for (var i = 0; i < TRAIL_BLOB_PTS; i += 1) {
        var angle = (i / TRAIL_BLOB_PTS) * Math.PI * 2;
        var n1 = Math.sin(angle * 3 + t * 1.4 + seed) * 0.45;
        var n2 = Math.sin(angle * 5 - t * 0.9 + seed * 2.3) * 0.30;
        var n3 = Math.cos(angle * 2 + t * 1.8 + seed * 0.7) * 0.25;
        var wave = Math.sin(angle * 7 + t * 2.2 + seed * 1.1) * 0.12;
        var noise = (n1 + n2 + n3 + wave) * TRAIL_NOISE_AMP * scale;
        var r = radius + noise;

        pts[i] = {
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r
        };
      }

      c.beginPath();
      for (var j = 0; j < pts.length; j += 1) {
        var current = pts[j];
        var next = pts[(j + 1) % pts.length];
        var midX = (current.x + next.x) * 0.5;
        var midY = (current.y + next.y) * 0.5;
        if (j === 0) {
          c.moveTo(midX, midY);
        } else {
          c.quadraticCurveTo(current.x, current.y, midX, midY);
        }
      }
      c.closePath();
      c.fill();
    }

    function renderFront() {
      if (!frontImgReady || width < 1 || height < 1) return;

      offCtx.setTransform(1, 0, 0, 1, 0, 0);
      offCtx.clearRect(0, 0, width, height);
      offCtx.globalCompositeOperation = 'source-over';
      offCtx.globalAlpha = 1;

      /* Draw the normal front image into the offscreen canvas. */
      offCtx.drawImage(frontImg, 0, 0, width, height);

      /* Cut irregular transparent holes from the front image. */
      offCtx.globalCompositeOperation = 'destination-out';
      offCtx.fillStyle = '#fff';

      for (var i = 0; i < points.length; i += 1) {
        var p = points[i];
        if (p.r > 0.5 && p.alpha > 0.01) {
          offCtx.globalAlpha = p.alpha;
          drawMorphBlobOn(offCtx, p.x, p.y, p.r, time, p.seed);
        }
      }

      offCtx.globalAlpha = 1;
      offCtx.globalCompositeOperation = 'source-over';

      /* Use the rendered transparent canvas as the visible front layer background. */
      var dataUrl;
      try {
        dataUrl = off.toDataURL('image/webp', 0.86);
        if (dataUrl.indexOf('data:image/webp') !== 0) {
          dataUrl = off.toDataURL('image/png');
        }
      } catch (e) {
        dataUrl = off.toDataURL('image/png');
      }
      frontLayer.style.backgroundImage = 'url("' + dataUrl + '")';
    }

    function update() {
      var targetR = hovering ? TRAIL_HEAD_R : 0;
      headRadius += (targetR - headRadius) * (hovering ? 0.14 : 0.04);

      if (hovering && headRadius > 5) {
        if (!lastSample || Math.hypot(headX - lastSample.x, headY - lastSample.y) > TRAIL_SAMPLE_DIST) {
          points.push({
            x: headX,
            y: headY,
            r: headRadius,
            alpha: 1,
            seed: Math.random() * 1000
          });
          lastSample = { x: headX, y: headY };
          if (points.length > MAX_POINTS) points.shift();
        }
      }

      for (var i = points.length - 1; i >= 0; i -= 1) {
        points[i].alpha *= TRAIL_FADE_SPEED;
        points[i].r *= 0.995;
        if (points[i].alpha < 0.01) points.splice(i, 1);
      }

      time += 0.016;
    }

    function frame(ts) {
      resizeOffIfNeeded();
      update();
      renderFront();
      window.requestAnimationFrame(frame);
    }

    function markReady() {
      frontImgReady = true;
      resizeQueued = true;
    }

    if (frontImg.complete && frontImg.naturalWidth) {
      markReady();
    } else {
      frontImg.addEventListener('load', markReady, { once: true });
    }

    /* Mouse tracking is scoped to the photo container only. */
    wrap.addEventListener('mouseenter', function (event) {
      setPointer(event.clientX, event.clientY);
    }, { passive: true });

    wrap.addEventListener('mousemove', function (event) {
      setPointer(event.clientX, event.clientY);
    }, { passive: true });

    wrap.addEventListener('mouseleave', function () {
      hovering = false;
      lastSample = null;
    }, { passive: true });

    window.addEventListener('resize', function () {
      resizeQueued = true;
    }, { passive: true });

    window.requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
