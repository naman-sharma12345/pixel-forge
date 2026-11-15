/* Asset detail page: image viewer (zoom / pan / backgrounds / sprite animation), WaveSurfer audio player, tabs. */
(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---- tabs ---- */
  var tabs = $$('[role=tab]', document.getElementById('tabs') || document);
  function showTab(t) {
    tabs.forEach(function (x) {
      var on = x === t;
      x.setAttribute('aria-selected', String(on));
      var panel = document.getElementById(x.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
  }
  tabs.forEach(function (t) { t.addEventListener('click', function () { showTab(t); }); });
  var tabBar = $('.tabs[role=tablist]');
  if (tabBar) tabBar.addEventListener('keydown', function (e) {
    var i = tabs.indexOf(document.activeElement);
    if (i < 0 || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
    var n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    n.focus(); showTab(n);
  });
  if (/[?&]tab=/.test(location.search) || location.hash === '#tabs') { var tb = document.getElementById('tabs'); if (tb) tb.scrollIntoView(); }

  /* ---- copy link ---- */
  var copy = $('[data-copy-link]');
  if (copy) copy.addEventListener('click', function () {
    (navigator.clipboard ? navigator.clipboard.writeText(location.href.split('#')[0]) : Promise.reject())
      .then(function () { pf.toast('Link copied to clipboard', 'success'); })
      .catch(function () { pf.toast('Could not copy the link', 'error'); });
  });

  /* ---- image viewer ---- */
  var viewer = document.getElementById('viewer');
  if (viewer) {
    var stage = $('#stage'), inner = $('#stage-inner'), img = $('#stage-img'), anim = $('#sprite-anim');
    var frames = Number(viewer.dataset.frames || 0), scale = 1, x = 0, y = 0, drag = null;
    var zin = $('#zoom-in'), zout = $('#zoom-out'), zfit = $('#zoom-fit'), zlabel = $('#zoom-label');
    var animating = frames > 0, sheetMode = 'anim', fps = 12;
    var apply = function () {
      inner.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + scale + ')';
      zlabel.textContent = Math.round(scale * 100) + '%';
      zin.disabled = scale >= 8; zout.disabled = scale <= 1; zfit.disabled = scale === 1;
      stage.style.cursor = scale > 1 ? 'grab' : 'zoom-in';
    };
    var zoomAt = function (cx, cy, next) {
      next = Math.min(8, Math.max(1, next));
      var ratio = next / scale, dx = cx - stage.clientWidth / 2, dy = cy - stage.clientHeight / 2;
      if (next === 1) { x = 0; y = 0; } else { x = dx - (dx - x) * ratio; y = dy - (dy - y) * ratio; }
      scale = next; apply();
    };
    var center = function (f) { zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, scale * f); };
    zin.addEventListener('click', function () { center(1.25); });
    zout.addEventListener('click', function () { center(0.8); });
    zfit.addEventListener('click', function () { zoomAt(0, 0, 1); });
    stage.addEventListener('wheel', function (e) {
      e.preventDefault();
      var r = stage.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, scale * (e.deltaY < 0 ? 1.2 : 1 / 1.2));
    }, { passive: false });
    stage.addEventListener('pointerdown', function (e) { if (scale === 1) return; stage.setPointerCapture(e.pointerId); drag = { sx: e.clientX, sy: e.clientY, ox: x, oy: y }; inner.style.transition = 'none'; });
    stage.addEventListener('pointermove', function (e) { if (!drag) return; x = drag.ox + e.clientX - drag.sx; y = drag.oy + e.clientY - drag.sy; apply(); });
    stage.addEventListener('pointerup', function () { drag = null; inner.style.transition = ''; });
    stage.addEventListener('dblclick', function (e) { var r = stage.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, scale > 1 ? 1 : 3); });
    stage.addEventListener('keydown', function (e) {
      if (e.key === '+' || e.key === '=') center(1.25); else if (e.key === '-') center(0.8); else if (e.key === '0') zoomAt(0, 0, 1);
    });
    $$('[data-bg]', viewer).forEach(function (b) {
      b.addEventListener('click', function () {
        stage.classList.remove('bg-dark', 'bg-light', 'checker');
        if (b.dataset.bg) stage.classList.add(b.dataset.bg); else stage.classList.add('checker');
        $$('[data-bg]', viewer).forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      });
    });
    $$('.viewer__thumbs button', viewer).forEach(function (b, i) {
      b.addEventListener('click', function () {
        img.src = b.dataset.src;
        if (anim) anim.style.backgroundImage = "url('" + b.dataset.src + "')";
        $$('.viewer__thumbs button', viewer).forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
        animating = frames > 0 && i === 0;
        syncMode(); zoomAt(0, 0, 1);
      });
    });
    /* sprite sheet animation: CSS background-position stepped across the sheet with steps(frames) */
    function syncMode() {
      if (!frames) return;
      var showAnim = animating && sheetMode === 'anim';
      anim.hidden = !showAnim; img.hidden = showAnim;
      var controls = $('#anim-controls'); if (controls) controls.hidden = !showAnim;
      if (showAnim) {
        anim.style.animation = reduce ? 'none' : 'sheet ' + (frames / fps) + 's steps(' + frames + ', jump-none) infinite';
        anim.style.animationPlayState = playBtn.getAttribute('aria-pressed') === 'true' ? 'running' : 'paused';
      }
    }
    var playBtn = $('#anim-toggle');
    if (frames) {
      var modeA = $('#mode-anim'), modeS = $('#mode-sheet');
      var setMode = function (m) { sheetMode = m; modeA.setAttribute('aria-pressed', String(m === 'anim')); modeS.setAttribute('aria-pressed', String(m === 'sheet')); syncMode(); zoomAt(0, 0, 1); };
      modeA.addEventListener('click', function () { setMode('anim'); });
      modeS.addEventListener('click', function () { setMode('sheet'); });
      if (reduce) { playBtn.setAttribute('aria-pressed', 'false'); $('span', playBtn).textContent = 'Play'; }
      playBtn.addEventListener('click', function () {
        var on = playBtn.getAttribute('aria-pressed') !== 'true';
        playBtn.setAttribute('aria-pressed', String(on));
        $('span', playBtn).textContent = on ? 'Pause' : 'Play';
        anim.style.animationPlayState = on ? 'running' : 'paused';
        if (on && reduce) anim.style.animation = 'sheet ' + (frames / fps) + 's steps(' + frames + ', jump-none) infinite';
      });
      $('#anim-fps').addEventListener('input', function (e) { fps = Number(e.target.value); $('#anim-fps-label').textContent = fps; syncMode(); });
      syncMode();
    }
    apply();
  }

  /* ---- audio viewer (WaveSurfer.js 7) ---- */
  var av = document.getElementById('audio-viewer');
  if (av && window.WaveSurfer) {
    var first = document.getElementById('av-first');
    var playBtn2 = $('#av-play'), cur = $('#av-cur'), dur = $('#av-dur'), loopBtn = $('#av-loop'), vol = $('#av-vol'), state = $('#av-state'), trackName = $('#av-track');
    var loop = av.dataset.loop === '1', ws, autoplay = false;
    var fmt = function (s) { s = Math.floor(s || 0); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
    var mk = function (c, stops) { var g = c.createLinearGradient(0, 0, 0, 140); stops.forEach(function (s) { g.addColorStop(s[0], s[1]); }); return g; };
    function build(url) {
      if (ws) ws.destroy();
      var c = document.createElement('canvas').getContext('2d');
      ws = WaveSurfer.create({
        container: '#waveform', height: 140, barWidth: 3, barGap: 2, barRadius: 3, normalize: true, dragToSeek: true, cursorColor: '#EDEDF5', cursorWidth: 2,
        waveColor: mk(c, [[0, 'rgba(196,181,253,.55)'], [0.5, 'rgba(139,92,246,.35)'], [1, 'rgba(34,211,238,.25)']]),
        progressColor: mk(c, [[0, '#C4B5FD'], [0.5, '#8B5CF6'], [1, '#22D3EE']]), url: url,
      });
      ws.on('ready', function () { dur.textContent = fmt(ws.getDuration()); ws.setVolume(vol.value / 100); if (autoplay) { autoplay = false; ws.play(); } });
      ws.on('timeupdate', function (t) { cur.textContent = fmt(t); });
      ws.on('play', function () { window.dispatchEvent(new CustomEvent('pf:wave-start')); sync(true); });
      ws.on('pause', function () { sync(false); });
      ws.on('finish', function () { if (loop) { ws.setTime(0); ws.play(); } else sync(false); });
    }
    function sync(on) {
      playBtn2.classList.toggle('is-playing', on);
      playBtn2.setAttribute('aria-label', on ? 'Pause preview' : 'Play preview');
      var i1 = $('.i-play', playBtn2), i2 = $('.i-pause', playBtn2);
      if (i1) i1.hidden = on; if (i2) i2.hidden = !on;
      state.textContent = on ? 'Now playing' : 'Audio preview';
    }
    if (first) build(first.value);
    playBtn2.addEventListener('click', function () { if (ws) ws.playPause(); });
    loopBtn.addEventListener('click', function () { loop = !loop; loopBtn.setAttribute('aria-pressed', String(loop)); $('#av-loop-state').textContent = loop ? 'on' : 'off'; });
    vol.addEventListener('input', function () { if (ws) ws.setVolume(vol.value / 100); });
    window.addEventListener('pf:player-start', function () { if (ws) ws.pause(); }); // global player took over
    $$('[data-wave-src]', av).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('[data-wave-src]', av).forEach(function (o) { o.setAttribute('aria-current', String(o === b)); });
        trackName.textContent = b.dataset.name; autoplay = true; build(b.dataset.waveSrc);
      });
    });
    window.addEventListener('pagehide', function () { if (ws) ws.destroy(); });
  }
})();
