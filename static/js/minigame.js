/* 404 mini-game: jump over pixel blocks. Space / Up arrow / click / tap to jump. */
(function () {
  'use strict';
  var cv = document.getElementById('minigame');
  if (!cv) return;
  var ctx = cv.getContext('2d'), W = cv.width, H = cv.height, GROUND = H - 28;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var scoreEl = document.getElementById('mg-score'), bestEl = document.getElementById('mg-best'), hint = document.getElementById('mg-hint');
  var best = Number(localStorage.getItem('pf_mg_best') || 0);
  bestEl.textContent = best;
  var player, blocks, speed, score, frame, running, over, raf, spawn;

  function reset() {
    player = { x: 40, y: GROUND - 16, w: 16, h: 16, vy: 0, grounded: true };
    blocks = []; speed = reduce ? 2.4 : 3; score = 0; frame = 0; spawn = 70; over = false; running = true;
    scoreEl.textContent = '0';
  }
  function jump() {
    if (over) { reset(); loop(); return; }
    if (!running) { reset(); loop(); return; }
    if (player.grounded) { player.vy = -7.6; player.grounded = false; }
    hint.textContent = '';
  }
  document.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.code === 'ArrowUp') { if (document.activeElement === cv || !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); jump(); } }
  });
  cv.addEventListener('pointerdown', function (e) { e.preventDefault(); jump(); });
  cv.tabIndex = 0;

  function px(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
  function drawPlayer() {
    var p = player;
    px(p.x, p.y, p.w, p.h, '#8B5CF6'); px(p.x, p.y, p.w, 3, '#C9B8FF'); px(p.x + p.w - 4, p.y + 4, 3, 4, '#fff'); px(p.x + p.w - 3, p.y + 5, 2, 2, '#0b0a14');
    var step = Math.floor(frame / 6) % 2;
    if (p.grounded) { px(p.x + 2 + step * 4, p.y + p.h, 4, 2, '#4C1D95'); px(p.x + 9 - step * 4, p.y + p.h, 4, 2, '#4C1D95'); }
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    px(0, 0, W, H, '#05050a');
    for (var i = 0; i < 24; i++) px((i * 71 + frame * 0.2) % W, (i * 37) % (GROUND - 20), 2, 2, 'rgba(237,237,245,' + (0.2 + (i % 4) * 0.12) + ')');
    px(0, GROUND, W, H - GROUND, '#161622'); px(0, GROUND, W, 2, '#22D3EE');
    for (var g = 0; g < W; g += 16) px(((g - frame * speed) % (W + 16) + W + 16) % (W + 16), GROUND + 8, 8, 2, '#262636');
    blocks.forEach(function (b) { px(b.x, GROUND - b.h, b.w, b.h, '#F472B6'); px(b.x, GROUND - b.h, b.w, 3, '#FDD5EA'); px(b.x, GROUND - 3, b.w, 3, '#A8306F'); });
    drawPlayer();
    if (over) { px(0, 0, W, H, 'rgba(5,5,10,.6)'); ctx.fillStyle = '#EDEDF5'; ctx.font = '12px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.fillText('GAME OVER', W / 2, H / 2 - 4); ctx.font = '8px "Press Start 2P", monospace'; ctx.fillText('tap or press space to retry', W / 2, H / 2 + 16); }
  }
  function update() {
    frame++;
    player.vy += 0.42; player.y += player.vy;
    if (player.y >= GROUND - player.h) { player.y = GROUND - player.h; player.vy = 0; player.grounded = true; }
    spawn--;
    if (spawn <= 0) { var h = 14 + Math.floor(Math.random() * 3) * 6; blocks.push({ x: W + 10, w: 14 + Math.floor(Math.random() * 2) * 6, h: h }); spawn = 55 + Math.floor(Math.random() * 55) - Math.min(25, score / 8); }
    blocks.forEach(function (b) { b.x -= speed; });
    if (blocks.length && blocks[0].x + blocks[0].w < 0) { blocks.shift(); score++; scoreEl.textContent = score; speed = Math.min(7, speed + 0.06); }
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      if (player.x + player.w - 2 > b.x && player.x + 2 < b.x + b.w && player.y + player.h > GROUND - b.h) {
        over = true; running = false;
        if (score > best) { best = score; bestEl.textContent = best; try { localStorage.setItem('pf_mg_best', best); } catch (e) { /* ignore */ } }
      }
    }
  }
  function loop() { update(); draw(); if (!over) raf = requestAnimationFrame(loop); }
  reset(); draw(); running = false; hint.textContent = 'Press space, ↑ or tap the canvas to start';
})();
