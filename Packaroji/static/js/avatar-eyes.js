/* Packaroji mascot eye tracking for collection hero avatars. */
(function () {
  'use strict';

  function init() {
    var avatars = document.querySelectorAll('[data-avatar-eyes]');
    if (!avatars.length) return;
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;

    avatars.forEach(function (avatar) {
      var svg = avatar.querySelector('svg');
      var left = avatar.querySelector('.avatar-pupil-left');
      var right = avatar.querySelector('.avatar-pupil-right');
      if (!svg || !left || !right) return;

      var pupils = [
        { el: left, cx: 484, cy: 305, max: 8 },
        { el: right, cx: 621, cy: 291, max: 8 }
      ];
      var mouseX = window.innerWidth / 2;
      var mouseY = window.innerHeight / 2;
      var raf = 0;

      function update() {
        raf = 0;
        var rect = svg.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        var mx = (mouseX - rect.left) * (860 / rect.width);
        var my = (mouseY - rect.top) * (590 / rect.height);

        pupils.forEach(function (pupil) {
          var dx = mx - pupil.cx;
          var dy = my - pupil.cy;
          var len = Math.hypot(dx, dy) || 1;
          var distance = Math.min(pupil.max, Math.hypot(dx, dy) / 18);
          pupil.el.setAttribute('cx', (pupil.cx + (dx / len) * distance).toFixed(2));
          pupil.el.setAttribute('cy', (pupil.cy + (dy / len) * distance).toFixed(2));
        });
      }

      function requestUpdate() {
        if (!raf) raf = requestAnimationFrame(update);
      }

      function trackPointer(event) {
        if (event.pointerType && event.pointerType !== 'mouse') return;
        mouseX = event.clientX;
        mouseY = event.clientY;
        requestUpdate();
      }

      window.addEventListener('pointermove', trackPointer, { passive: true });
      window.addEventListener('mousemove', trackPointer, { passive: true });
      window.addEventListener('resize', requestUpdate, { passive: true });
      requestUpdate();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
