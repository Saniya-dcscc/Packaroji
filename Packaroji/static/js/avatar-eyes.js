/* Packaroji mascot eye tracking for collection hero avatars. */
(function () {
  'use strict';

  function init() {
    var avatars = document.querySelectorAll('[data-avatar-eyes]');
    if (!avatars.length) return;
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;

    avatars.forEach(function (avatar) {
      var left = avatar.querySelector('.avatar-pupil-left');
      var right = avatar.querySelector('.avatar-pupil-right');
      if (!left || !right) return;

      var targetX = 0, targetY = 0, currentX = 0, currentY = 0, raf = 0;
      var MAX_X = 10, MAX_Y = 8;

      function tick() {
        raf = 0;
        currentX += (targetX - currentX) * 0.14;
        currentY += (targetY - currentY) * 0.14;
        left.style.transform = 'translate(' + currentX.toFixed(2) + 'px,' + currentY.toFixed(2) + 'px)';
        right.style.transform = 'translate(' + currentX.toFixed(2) + 'px,' + currentY.toFixed(2) + 'px)';
        if (Math.abs(targetX-currentX) > 0.05 || Math.abs(targetY-currentY) > 0.05) raf = requestAnimationFrame(tick);
      }

      function setTarget(x, y) {
        var rect = avatar.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height * 0.52;
        var dx = x - cx, dy = y - cy;
        var len = Math.hypot(dx, dy) || 1;
        var scale = Math.min(1, len / Math.max(rect.width, rect.height));
        targetX = (dx / len) * MAX_X * scale;
        targetY = (dy / len) * MAX_Y * scale;
        if (!raf) raf = requestAnimationFrame(tick);
      }

      document.addEventListener('mousemove', function (e) { setTarget(e.clientX, e.clientY); }, { passive: true });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
