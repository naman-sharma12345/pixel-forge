/* Global bottom audio player. One <audio> element for the whole site, so only one sound plays at a time.
   Any button with [data-play] and data-url / data-title / data-creator / data-cover / data-id starts a track. */
(function () {
  'use strict';
  var bar = document.getElementById('player');
  if (!bar) return;
  var audio = new Audio();
  audio.preload = 'none';
  var $ = function (id) { return document.getElementById(id); };
  var els = { cover: $('player-cover'), title: $('player-title'), sub: $('player-sub'), toggle: $('player-toggle'), seek: $('player-seek'), time: $('player-time'), dur: $('player-dur'), vol: $('player-vol'), close: $('player-close') };
  var current = null;

  var fmt = function (s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  var savedVol = Number(localStorage.getItem('pf_volume'));
  audio.volume = isFinite(savedVol) && localStorage.getItem('pf_volume') !== null ? savedVol : 0.8;
  els.vol.value = Math.round(audio.volume * 100);

  function syncButtons() {
    var playing = !audio.paused && !!current;
    document.querySelectorAll('[data-track-id]').forEach(function (m) { m.classList.toggle('is-playing', playing && current && m.dataset.trackId === String(current.id)); });
    var play = els.toggle.querySelector('.i-play, [data-lucide=play], svg.lucide-play'), pause = els.toggle.querySelector('.i-pause, [data-lucide=pause], svg.lucide-pause');
    if (play) play.hidden = playing;
    if (pause) pause.hidden = !playing;
    els.toggle.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  }
  function show(track) {
    current = track;
    els.cover.src = track.cover || els.cover.src;
    els.title.textContent = track.title;
    els.sub.textContent = track.creator || '';
    bar.classList.add('is-open');
    document.body.classList.add('has-player');
  }
  function play(track) {
    if (current && String(current.id) === String(track.id)) { audio.paused ? audio.play() : audio.pause(); return; }
    window.dispatchEvent(new CustomEvent('pf:player-start')); // detail-page WaveSurfer listens and pauses itself
    show(track);
    audio.src = track.url;
    audio.play().catch(function () { /* autoplay blocked: user can press play */ });
  }
  window.pfPlayer = { play: play, pause: function () { audio.pause(); } };

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-play]');
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    play({ id: b.dataset.id, url: b.dataset.url, title: b.dataset.title, creator: b.dataset.creator, cover: b.dataset.cover });
  });
  // a waveform on the detail page starting should silence the global player
  window.addEventListener('pf:wave-start', function () { audio.pause(); });

  els.toggle.addEventListener('click', function () { if (current) audio.paused ? audio.play() : audio.pause(); });
  els.close.addEventListener('click', function () { audio.pause(); audio.removeAttribute('src'); current = null; bar.classList.remove('is-open'); document.body.classList.remove('has-player'); syncButtons(); });
  audio.addEventListener('play', syncButtons);
  audio.addEventListener('pause', syncButtons);
  audio.addEventListener('ended', function () { audio.currentTime = 0; syncButtons(); });
  audio.addEventListener('loadedmetadata', function () { els.dur.textContent = fmt(audio.duration); });
  audio.addEventListener('timeupdate', function () {
    els.time.textContent = fmt(audio.currentTime);
    if (audio.duration) els.seek.value = Math.round((audio.currentTime / audio.duration) * 1000);
  });
  els.seek.addEventListener('input', function () { if (audio.duration) audio.currentTime = (els.seek.value / 1000) * audio.duration; });
  els.vol.addEventListener('input', function () { audio.volume = els.vol.value / 100; try { localStorage.setItem('pf_volume', String(audio.volume)); } catch (e) { /* ignore */ } });
  document.addEventListener('keydown', function (e) {
    if (e.code === 'Space' && current && !/input|textarea|select|button|a/i.test((document.activeElement || {}).tagName || '') && !document.querySelector('.overlay.is-open')) {
      e.preventDefault(); audio.paused ? audio.play() : audio.pause();
    }
  });
})();
