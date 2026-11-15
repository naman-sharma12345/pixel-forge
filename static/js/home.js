/* Home page: drifting pixel field behind the hero (brightens near the mouse, pauses off-screen / reduced motion)
   and a gentle 3D tilt on the floating card stack. */
(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = document.getElementById('pixel-field');
  if (canvas) {
    var ctx = canvas.getContext('2d'), w = 0, h = 0, px = [], mouse = { x: -9999, y: -9999 }, raf = 0, visible = true;
    var COLORS = ['139,92,246', '34,211,238', '244,114,182', '163,230,53', '251,191,36'];
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var seed = function () {
      var n = Math.min(140, Math.floor((w * h) / 14000));
      px = [];
      for (var i = 0; i < n; i++) px.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.15, s: Math.random() < 0.8 ? 2 : 3, c: COLORS[i % 5], ph: Math.random() * 6.28 });
    };
    var resize = function () {
      var r = canvas.getBoundingClientRect();
      w = r.width; h = r.height; canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); seed(); draw(0);
    };
    var draw = function (t) {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < px.length; i++) {
        var p = px[i];
        if (!reduce) { p.x += p.vx; p.y += p.vy; if (p.x < 0) p.x = w; if (p.x > w) p.x = 0; if (p.y < 0) p.y = h; if (p.y > h) p.y = 0; }
        var d = Math.hypot(p.x - mouse.x, p.y - mouse.y), near = Math.max(0, 1 - d / 160);
        var a = 0.18 + 0.12 * Math.sin(t / 1200 + p.ph) + near * 0.7;
        ctx.fillStyle = 'rgba(' + p.c + ',' + Math.min(1, a).toFixed(2) + ')';
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s + (near > 0.5 ? 1 : 0), p.s + (near > 0.5 ? 1 : 0));
      }
    };
    var loop = function (t) { draw(t); if (visible && !reduce) raf = requestAnimationFrame(loop); };
    window.addEventListener('resize', pf.debounce(resize, 150));
    if (!reduce) {
      var hero = canvas.parentElement;
      hero.addEventListener('mousemove', function (e) { var r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
      hero.addEventListener('mouseleave', function () { mouse.x = mouse.y = -9999; });
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) { cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); } }).observe(canvas);
    }
    resize();
    if (!reduce) raf = requestAnimationFrame(loop);
  }

  var stack = document.getElementById('hero-stack');
  if (stack && !reduce) {
    var items = Array.prototype.slice.call(stack.querySelectorAll('.card-float'));
    var base = items.map(function (el) { return el.style.transform; });
    window.addEventListener('mousemove', function (e) {
      var nx = (e.clientX / window.innerWidth) * 2 - 1, ny = (e.clientY / window.innerHeight) * 2 - 1;
      stack.style.transform = 'rotateX(' + (-ny * 8).toFixed(2) + 'deg) rotateY(' + (nx * 10).toFixed(2) + 'deg)';
    }, { passive: true });
    stack.style.transition = 'transform .15s ease-out'; stack.style.transformStyle = 'preserve-3d';
    void base;
  }
})();
