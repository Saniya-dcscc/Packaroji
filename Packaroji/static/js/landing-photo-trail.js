/* Packaroji landing-photo organic reveal trail. */
(function () {
  'use strict';

  function init() {
    var wrap = document.querySelector('.hero-template-landing-photo');
    if (!wrap) return;

    var baseImg = wrap.querySelector('img');
    if (!baseImg || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)) return;

    baseImg.classList.add('landing-trail-base');
    baseImg.style.filter = 'saturate(1.55) hue-rotate(-6deg) brightness(1.08) contrast(1.03)';

    var frontImg = baseImg.cloneNode(true);
    frontImg.classList.add('landing-trail-front');
    frontImg.removeAttribute('alt');
    frontImg.setAttribute('aria-hidden', 'true');
    frontImg.style.filter = 'none';
    frontImg.style.pointerEvents = 'none';
    wrap.appendChild(frontImg);

    var canvas = document.createElement('canvas');
    canvas.className = 'landing-trail-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    wrap.appendChild(canvas);

    var ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    var points = [];
    var hovering = false;
    var pointerX = 0, pointerY = 0;
    var lastSampleX = 0, lastSampleY = 0;
    var hasPointer = false;
    var headRadius = 0;
    var time = 0;
    var rafId = 0;
    var running = false;
    var cssW = 0, cssH = 0, dpr = 1;
    var imageReady = false;

    var MAX_POINTS = 60;
    var MOVE_THRESHOLD = 8;
    var BLOB_STEPS = 24;
    var TARGET_RADIUS = 86;

    function ensureRunning() {
      if (running) return;
      running = true;
      rafId = window.requestAnimationFrame(frame);
    }

    function stopWhenIdle() {
      if (!hovering && points.length === 0 && headRadius < 0.5) {
        running = false;
        if (rafId) window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    }

    function resize() {
      var rect = wrap.getBoundingClientRect();
      var w = Math.max(1, Math.round(rect.width));
      var h = Math.max(1, Math.round(rect.height));
      var nextDpr = Math.min(window.devicePixelRatio || 1, 1.5);
      if (w === cssW && h === cssH && nextDpr === dpr) return;
      cssW = w; cssH = h; dpr = nextDpr;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawFront();
    }

    function lerp(a, b, amount) { return a + (b - a) * amount; }
    function dist(a, b, c, d) { return Math.hypot(a - c, b - d); }

    function noise(seed, t) {
      return Math.sin(seed * 1.71 + t * 1.23) * 0.32 +
             Math.sin(seed * 2.37 - t * 0.91) * 0.21 +
             Math.cos(seed * 3.11 + t * 0.57) * 0.15 +
             Math.sin(seed * 5.03 + t * 1.87) * 0.12;
    }

    function drawBlob(pathCtx, point) {
      var pts = new Array(BLOB_STEPS);
      var t = time * 0.001;
      for (var i = 0; i < BLOB_STEPS; i += 1) {
        var angle = (Math.PI * 2 * i) / BLOB_STEPS;
        var n1 = noise(point.randomSeed + i * 0.17, t);
        var n2 = noise(point.randomSeed * 0.73 + i * 0.31, t * 0.63 + 7);
        var wave = Math.sin(angle * 3 + point.randomSeed * 1.37 + time * 0.0022) * 0.09;
        var radius = point.radius * (1 + n1 * 0.16 + n2 * 0.08 + wave);
        pts[i] = { x: point.x + Math.cos(angle) * radius, y: point.y + Math.sin(angle) * radius };
      }
      pathCtx.beginPath();
      for (var j = 0; j < BLOB_STEPS; j += 1) {
        var current = pts[j];
        var next = pts[(j + 1) % BLOB_STEPS];
        var midX = (current.x + next.x) * 0.5;
        var midY = (current.y + next.y) * 0.5;
        if (j === 0) {
          var previous = pts[BLOB_STEPS - 1];
          pathCtx.moveTo((previous.x + current.x) * 0.5, (previous.y + current.y) * 0.5);
        }
        pathCtx.quadraticCurveTo(current.x, current.y, midX, midY);
      }
      pathCtx.closePath();
      pathCtx.globalAlpha = Math.max(0, Math.min(1, point.alpha));
      pathCtx.fill();
    }

    function drawFront() {
      if (!imageReady || !cssW || !cssH) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      // Draw the duplicate normal image; destination-out holes reveal the richer bottom image.
      ctx.drawImage(frontImg, 0, 0, cssW, cssH);
      if (points.length) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = '#000';
        for (var i = 0; i < points.length; i += 1) {
          if (points[i].radius > 0.5 && points[i].alpha > 0.01) drawBlob(ctx, points[i]);
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }

    function addPoint(x, y) {
      points.push({ x: x, y: y, radius: Math.max(6, headRadius), alpha: 1, randomSeed: Math.random() * 1000 });
      if (points.length > MAX_POINTS) points.splice(0, points.length - MAX_POINTS);
    }

    function update() {
      headRadius = lerp(headRadius, hovering ? TARGET_RADIUS : 0, hovering ? 0.14 : 0.04);
      if (hovering && hasPointer && headRadius > 5) {
        if (!points.length || dist(pointerX, pointerY, lastSampleX, lastSampleY) > MOVE_THRESHOLD) {
          addPoint(pointerX, pointerY);
          lastSampleX = pointerX; lastSampleY = pointerY;
        }
      }
      for (var i = points.length - 1; i >= 0; i -= 1) {
        points[i].alpha *= 0.92;
        points[i].radius *= 0.995;
        if (points[i].alpha < 0.01) points.splice(i, 1);
      }
    }

    function frame(ts) {
      rafId = window.requestAnimationFrame(frame);
      time = ts;
      resize(); update(); drawFront(); stopWhenIdle();
    }

    function updatePointer(clientX, clientY) {
      var rect = baseImg.getBoundingClientRect();
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
        hovering = false; hasPointer = false; ensureRunning(); return;
      }
      pointerX = clientX - rect.left;
      pointerY = clientY - rect.top;
      hasPointer = true; hovering = true; ensureRunning();
    }

    function markReady() { imageReady = true; resize(); drawFront(); ensureRunning(); }
    if (baseImg.complete && baseImg.naturalWidth) markReady();
    else baseImg.addEventListener('load', markReady, { once: true });

    wrap.addEventListener('pointerenter', function (event) {
      if (event.pointerType && event.pointerType !== 'mouse') return;
      updatePointer(event.clientX, event.clientY);
    }, { passive: true });
    wrap.addEventListener('pointermove', function (event) {
      if (event.pointerType && event.pointerType !== 'mouse') return;
      updatePointer(event.clientX, event.clientY);
    }, { passive: true });
    wrap.addEventListener('pointerleave', function () { hovering = false; hasPointer = false; ensureRunning(); }, { passive: true });
    window.addEventListener('resize', function () { resize(); ensureRunning(); }, { passive: true });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { if (rafId) window.cancelAnimationFrame(rafId); rafId = 0; running = false; }
      else if (imageReady) ensureRunning();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
