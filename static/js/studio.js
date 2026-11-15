/* Creator Studio upload / edit wizard. Progressive enhancement: without JavaScript the five sections
   are simply stacked and the form posts normally. With JavaScript: stepper, slide transitions, live preview,
   inline file validation, audio duration detection, draft autosave and an XHR upload with a pixel progress bar. */
(function () {
  'use strict';
  var form = document.getElementById('asset-form');
  if (!form) return;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mode = form.dataset.mode, fee = Number(form.dataset.fee || 10), draftKey = form.dataset.draftKey;
  var MAX = 25 * 1024 * 1024;
  // mirrors catalog/forms.py (which mirrors the legacy upload.js)
  var IMAGE = ['png', 'jpg', 'jpeg', 'webp', 'gif'], AUDIO = ['mp3', 'wav', 'ogg', 'webm', 'flac'];
  var PREVIEW = IMAGE.concat(['mp3', 'wav', 'ogg', 'webm']);
  var PRODUCT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'psd', 'aseprite', 'ase', 'zip', '7z', 'rar', 'wav', 'mp3', 'ogg', 'flac', 'ttf', 'otf', 'woff', 'woff2', 'glb', 'gltf', 'fbx', 'obj', 'blend', 'tmx', 'tsx', 'json', 'txt', 'pdf'];
  var STEP_OF = { title: 0, category: 0, description: 0, thumbnail: 1, previews: 1, file: 1, tag_list: 2, file_formats: 2, resolution: 2, frames: 2, duration_sec: 2, bpm: 2, loopable: 2, price: 3, license: 3, __all__: 0 };

  var steps = $$('.fieldset-card[data-step]', form), stepper = $('#stepper'), nav = $('#wizard-nav'), prevBtn = $('#prev-step'), nextBtn = $('#next-step'), live = $('#live-preview');
  var cur = 0, reached = mode === 'edit' ? steps.length - 1 : 0;
  var el = function (id) { return document.getElementById(id); };
  var f = { title: el('id_title'), desc: el('id_description'), thumb: el('id_thumbnail'), previews: el('id_previews'), file: el('id_file'), tags: el('id_tag_list'), formats: el('id_file_formats'), res: el('id_resolution'), frames: el('id_frames'), dur: el('id_duration_sec'), bpm: el('id_bpm'), loop: el('id_loopable'), price: el('id_price'), free: el('is-free') };
  var ext = function (n) { var i = n.lastIndexOf('.'); return i < 0 ? '' : n.slice(i + 1).toLowerCase(); };
  var mb = function (n) { return (n / 1024 / 1024).toFixed(1) + ' MB'; };
  var category = function () { var r = $('input[name=category]:checked', form); return r ? { id: r.value, kind: r.dataset.kind, name: r.dataset.name, icon: r.dataset.icon } : null; };
  var rupees = function (n) { return '₹' + Number(n).toLocaleString('en-IN'); };
  var earn = function (p) { return p - Math.round(p * fee / 100); };

  /* ---------- inline errors ---------- */
  function fieldOf(node) { return node.closest ? node.closest('.field') : null; }
  function setErr(node, msg) {
    var field = fieldOf(node) || node;
    clearErr(field);
    field.classList.add('has-error');
    var p = document.createElement('p'); p.className = 'error js-err'; p.setAttribute('role', 'alert'); p.textContent = msg; field.appendChild(p);
  }
  function clearErr(node) {
    var field = node.classList && node.classList.contains('field') ? node : fieldOf(node);
    if (!field) return;
    field.classList.remove('has-error');
    $$('.js-err', field).forEach(function (n) { n.remove(); });
  }
  form.addEventListener('input', function (e) { clearErr(e.target); }, true);
  form.addEventListener('change', function (e) { clearErr(e.target); }, true);

  /* ---------- stepper + slide transition ---------- */
  function renderStepper() {
    stepper.innerHTML = steps.map(function (s, i) {
      var cls = i === cur ? 'is-current' : (i < reached || i < cur ? 'is-done' : '');
      var label = ['Basics', 'Media', 'Details', 'Pricing', 'Review'][i];
      return (i ? '<span style="flex:1;height:2px;background:var(--border);min-width:12px"></span>' : '') +
        '<a href="#" class="' + cls + '" data-go="' + i + '" ' + (i === cur ? 'aria-current="step"' : '') + '><b>' + (cls === 'is-done' ? '✓' : i + 1) + '</b><span class="stepper-label">' + label + '</span></a>';
    }).join('');
  }
  stepper.addEventListener('click', function (e) {
    var a = e.target.closest('[data-go]');
    if (!a) return;
    e.preventDefault();
    var i = Number(a.dataset.go);
    if (i <= Math.max(reached, cur)) go(i);
  });
  function go(i) {
    var dir = i > cur ? 1 : -1;
    steps.forEach(function (s, n) {
      s.hidden = n !== i;
      if (n === i && !reduce) s.animate([{ opacity: 0, transform: 'translateX(' + dir * 28 + 'px)' }, { opacity: 1, transform: 'none' }], { duration: 250, easing: 'cubic-bezier(.22,1,.36,1)' });
    });
    cur = i;
    prevBtn.style.visibility = i === 0 ? 'hidden' : 'visible';
    nextBtn.hidden = i === steps.length - 1;
    if (i === steps.length - 1) buildReview();
    renderStepper();
    window.scrollTo({ top: Math.max(0, form.getBoundingClientRect().top + window.scrollY - 150), behavior: reduce ? 'auto' : 'smooth' });
  }
  prevBtn.addEventListener('click', function () { if (cur > 0) go(cur - 1); });
  nextBtn.addEventListener('click', function () {
    var errs = validate(cur);
    if (errs) { var first = $('.has-error', steps[cur]); if (first) { var inp = $('input,textarea,select', first); if (inp) inp.focus(); } return; }
    reached = Math.max(reached, cur + 1);
    go(cur + 1);
  });

  /* ---------- validation ---------- */
  function validate(i) {
    var bad = false, fail = function (node, msg) { setErr(node, msg); bad = true; };
    var s = steps[i];
    if (i === 0) {
      if (f.title.value.trim().length < 3) fail(f.title, 'Give it a title of at least 3 characters');
      if (!category()) fail($('.cat-pick', s), 'Pick the category buyers will find it in');
      if (f.desc.value.trim().length < 20) fail(f.desc, 'Describe what’s included (' + Math.max(0, 20 - f.desc.value.trim().length) + ' more characters needed)');
    }
    if (i === 1) {
      if (mode === 'create' && !f.thumb.files.length) fail(f.thumb, 'Add a thumbnail. It’s the first thing buyers see.');
      if (mode === 'create' && !f.file.files.length) fail(f.file, 'Add the file buyers will download');
      var c = category();
      if (c && c.kind === 'audio') {
        var hasAudio = previewFiles.some(function (p) { return AUDIO.indexOf(ext(p.name)) >= 0; });
        var mainAudio = f.file.files[0] ? AUDIO.indexOf(ext(f.file.files[0].name)) >= 0 : (form.dataset.existingFile && AUDIO.indexOf(ext(form.dataset.existingFile)) >= 0);
        if (!hasAudio && !mainAudio && !(mode === 'edit' && !previewFiles.length)) fail(f.previews, 'Audio assets need an audio preview, or an audio file as the main file.');
      }
    }
    if (i === 2) {
      var tags = f.tags.value.split(',').map(function (t) { return t.trim(); }).filter(Boolean);
      if (tags.length > 10) fail(f.tags, 'Use at most 10 tags');
      else if (tags.some(function (t) { return t.length > 24; })) fail(f.tags, 'Each tag must be 24 characters or fewer');
      if (f.frames.value && (!/^\d+$/.test(f.frames.value) || Number(f.frames.value) < 1)) fail(f.frames, 'Frames must be a whole number of at least 1');
    }
    if (i === 3 && !f.free.checked) {
      var p = f.price.value.trim();
      if (!/^\d+$/.test(p) || Number(p) < 1 || Number(p) > 50000) fail(f.price, 'Price must be between ₹1 and ₹50,000');
    }
    return bad;
  }

  /* ---------- kind-aware sections ---------- */
  function syncKind() {
    var c = category();
    $$('[data-kind-group]', form).forEach(function (g) { g.hidden = !c || g.dataset.kindGroup !== c.kind; });
    var note = el('audio-note'); if (note) note.hidden = !(c && c.kind === 'audio');
    if (c) { var cat = el('lp-cat'); if (cat) cat.textContent = c.name; var ic = $('.chip-top i, .chip-top svg', live); if (ic) ic.outerHTML = '<i data-lucide="' + c.icon + '"></i>'; pf.icons(); }
    detectDuration();
  }
  $$('input[name=category]', form).forEach(function (r) { r.addEventListener('change', syncKind); });

  /* ---------- thumbnail ---------- */
  var thumbUrl = '';
  f.thumb.addEventListener('change', function () {
    var file = f.thumb.files[0], msg = '';
    if (!file) return;
    if (IMAGE.indexOf(ext(file.name)) < 0) msg = '“' + file.name + '” isn’t a PNG, JPG, WebP or GIF image.';
    else if (file.size > MAX) msg = '“' + file.name + '” is ' + mb(file.size) + '. The limit is 25 MB per file.';
    if (msg) { f.thumb.value = ''; setErr(f.thumb, msg); return; }
    if (thumbUrl) URL.revokeObjectURL(thumbUrl);
    thumbUrl = URL.createObjectURL(file);
    el('thumb-name').textContent = file.name + ' · ' + mb(file.size);
    el('thumb-preview-wrap').hidden = false;
    var img = el('thumb-preview'); img.src = thumbUrl; el('lp-img').src = thumbUrl; el('lp-img').classList.add('pixelated');
    var probe = new Image();
    probe.onload = function () { el('thumb-warn').hidden = probe.naturalWidth === probe.naturalHeight; };
    probe.src = thumbUrl;
  });

  /* ---------- previews (merge selections, remove, reorder via arrows) ---------- */
  var previewFiles = [], MAXP = 6;
  function syncPreviewInput() {
    var dt = new DataTransfer();
    previewFiles.forEach(function (p) { dt.items.add(p); });
    f.previews.files = dt.files;
    el('prev-count').textContent = '(' + previewFiles.length + '/' + MAXP + ')';
  }
  function renderPreviews() {
    var grid = el('preview-grid');
    grid.innerHTML = '';
    previewFiles.forEach(function (file, i) {
      var wrap = document.createElement('div'); wrap.style.cssText = 'position:relative';
      var isAudio = AUDIO.indexOf(ext(file.name)) >= 0;
      if (isAudio) { var au = document.createElement('div'); au.className = 'au'; au.textContent = '♪ ' + ext(file.name); wrap.appendChild(au); }
      else { var img = document.createElement('img'); img.src = URL.createObjectURL(file); img.alt = file.name; wrap.appendChild(img); }
      var rm = document.createElement('button'); rm.type = 'button'; rm.setAttribute('aria-label', 'Remove preview ' + (i + 1));
      rm.style.cssText = 'position:absolute;top:-6px;right:-6px;width:22px;height:22px;border-radius:50%;background:var(--surface-3);border:1px solid var(--border-strong);color:var(--text);font-size:14px;line-height:1';
      rm.innerHTML = '&times;';
      rm.addEventListener('click', function () { previewFiles.splice(i, 1); syncPreviewInput(); renderPreviews(); detectDuration(); });
      wrap.appendChild(rm);
      if (i > 0) { var mv = document.createElement('button'); mv.type = 'button'; mv.setAttribute('aria-label', 'Move preview ' + (i + 1) + ' earlier'); mv.style.cssText = 'position:absolute;bottom:4px;left:4px;padding:2px 6px;border-radius:6px;background:rgba(8,8,13,.8);color:var(--text);font-size:11px'; mv.textContent = '←'; mv.addEventListener('click', function () { var t = previewFiles[i]; previewFiles[i] = previewFiles[i - 1]; previewFiles[i - 1] = t; syncPreviewInput(); renderPreviews(); }); wrap.appendChild(mv); }
      grid.appendChild(wrap);
    });
  }
  f.previews.addEventListener('change', function () {
    var incoming = Array.prototype.slice.call(f.previews.files), msg = '';
    incoming.forEach(function (file) {
      if (previewFiles.length >= MAXP) { msg = 'Only ' + MAXP + ' previews are allowed, so the extra files were skipped.'; return; }
      if (PREVIEW.indexOf(ext(file.name)) < 0) { msg = '“' + file.name + '” isn’t supported. Previews can be PNG, JPG, WebP, GIF, MP3, WAV, OGG or WebM.'; return; }
      if (file.size > MAX) { msg = '“' + file.name + '” is ' + mb(file.size) + '. The limit is 25 MB per file.'; return; }
      previewFiles.push(file);
    });
    syncPreviewInput(); renderPreviews();
    if (msg) setErr(f.previews, msg);
    detectDuration();
  });

  /* ---------- main file ---------- */
  f.file.addEventListener('change', function () {
    var file = f.file.files[0], msg = '';
    if (!file) return;
    var e = ext(file.name);
    if (PRODUCT.indexOf(e) < 0) msg = '.' + (e || '?') + ' files can’t be sold here. Allowed: ' + PRODUCT.map(function (x) { return '.' + x; }).join(' ') + '. Tip: put anything else inside a .zip.';
    else if (file.size > MAX) msg = '“' + file.name + '” is ' + mb(file.size) + '. The limit is 25 MB per file.';
    if (msg) { f.file.value = ''; setErr(f.file, msg); return; }
    el('file-name').textContent = file.name + ' · ' + mb(file.size) + ' · .' + e;
    var formats = f.formats.value.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    if (formats.indexOf(e) < 0 && formats.length < 10) { formats.push(e); f.formats.value = formats.join(', '); }
    detectDuration();
  });

  /* ---------- audio duration auto-detect (Audio element) ---------- */
  var durUrl = '';
  function detectDuration() {
    var c = category();
    if (!c || c.kind !== 'audio') return;
    var src = previewFiles.filter(function (p) { return AUDIO.indexOf(ext(p.name)) >= 0; })[0] || (f.file.files[0] && AUDIO.indexOf(ext(f.file.files[0].name)) >= 0 ? f.file.files[0] : null);
    if (!src) return;
    if (durUrl) URL.revokeObjectURL(durUrl);
    durUrl = URL.createObjectURL(src);
    var a = new Audio(); a.preload = 'metadata';
    a.onloadedmetadata = function () {
      if (isFinite(a.duration) && a.duration > 0) { f.dur.value = (Math.round(a.duration * 10) / 10).toString(); var h = el('dur-hint'); if (h) h.textContent = '· detected from your audio'; updateLive(); }
    };
    a.src = durUrl;
  }

  /* ---------- tags ---------- */
  function renderTags() {
    var box = el('tag-chips'); if (!box) return;
    var tags = f.tags.value.split(',').map(function (t) { return t.trim(); }).filter(Boolean);
    box.innerHTML = '';
    tags.forEach(function (t, i) {
      var chip = document.createElement('span'); chip.className = 'chip is-active'; chip.textContent = '#' + t.replace(/^#/, '') + ' ';
      var x = document.createElement('button'); x.type = 'button'; x.setAttribute('aria-label', 'Remove ' + t); x.innerHTML = '&times;'; x.style.marginLeft = '4px';
      x.addEventListener('click', function () { tags.splice(i, 1); f.tags.value = tags.join(', '); renderTags(); });
      chip.appendChild(x); box.appendChild(chip);
    });
  }
  f.tags.setAttribute('list', 'tag-suggestions'); f.tags.addEventListener('input', renderTags); renderTags();

  /* ---------- pricing ---------- */
  function syncPrice() {
    var free = f.free.checked;
    el('price-box').style.display = free ? 'none' : '';
    if (free) f.price.value = '0';
    else if (f.price.value === '0') f.price.value = '';
    var p = free ? 0 : Number(f.price.value || 0);
    el('earn-amount').textContent = rupees(earn(p));
    el('earn-text').innerHTML = p > 0 ? 'You earn <b>' + rupees(earn(p)) + '</b> per sale after the ' + fee + '% platform fee (' + rupees(p - earn(p)) + ').' : 'Free assets earn followers, reviews and visibility instead of rupees.';
    el('lp-price').innerHTML = p > 0 ? '<span class="price">' + rupees(p) + '</span>' : '<span class="price-free">FREE</span>';
    el('lp-price2').textContent = p > 0 ? rupees(p) : 'Free'; el('lp-earn').textContent = rupees(earn(p));
  }
  f.free.addEventListener('change', syncPrice);
  f.price.addEventListener('input', syncPrice);
  $$('[data-price]', form).forEach(function (b) { b.addEventListener('click', function () { f.free.checked = false; f.price.value = b.dataset.price; syncPrice(); clearErr(f.price); }); });
  f.free.checked = f.price.value === '0';

  /* ---------- live preview + review ---------- */
  function updateLive() { el('lp-title').textContent = f.title.value.trim() || 'Untitled asset'; }
  f.title.addEventListener('input', updateLive);
  function buildReview() {
    var c = category(), p = f.free.checked ? 0 : Number(f.price.value || 0), lic = $('input[name=license]:checked', form);
    var rows = [
      ['Title', f.title.value.trim() || '–'], ['Category', c ? c.name : '–'],
      ['Thumbnail', f.thumb.files[0] ? f.thumb.files[0].name : (mode === 'edit' ? 'Keeping current' : '–')],
      ['Previews', previewFiles.length ? previewFiles.length + ' new' : (mode === 'edit' ? 'Keeping current' : 'Automatic')],
      ['Main file', f.file.files[0] ? f.file.files[0].name + ' · ' + mb(f.file.files[0].size) : (mode === 'edit' ? 'Keeping current' : '–')],
      ['Tags', f.tags.value.trim() || 'None'], ['Formats', f.formats.value.trim() || 'From main file'],
      ['Price', p ? rupees(p) : 'Free'], ['You earn', rupees(earn(p)) + ' per sale'], ['License', lic ? lic.closest('label').querySelector('b').textContent : '–'],
    ];
    el('review-list').innerHTML = '';
    rows.forEach(function (r) { var d = document.createElement('div'), t = document.createElement('dt'), v = document.createElement('dd'); t.textContent = r[0]; v.textContent = r[1]; v.style.maxWidth = '60%'; d.appendChild(t); d.appendChild(v); el('review-list').appendChild(d); });
  }

  /* ---------- draft autosave (text fields only, never files) ---------- */
  var DRAFT_FIELDS = ['title', 'description', 'tag_list', 'file_formats', 'resolution', 'frames', 'duration_sec', 'bpm', 'price'];
  function readDraft() { try { var d = JSON.parse(localStorage.getItem(draftKey)); return d && (d.title || d.description) ? d : null; } catch (e) { return null; } }
  var pendingDraft = mode === 'create' ? readDraft() : null;
  function saveDraft() {
    if (mode !== 'create' || pendingDraft) return;
    var d = { savedAt: new Date().toISOString(), free: f.free.checked, loopable: f.loop && f.loop.checked };
    DRAFT_FIELDS.forEach(function (n) { var node = form.elements[n]; if (node) d[n] = node.value; });
    var c = $('input[name=category]:checked', form); d.category = c ? c.value : '';
    var l = $('input[name=license]:checked', form); d.license = l ? l.value : '';
    if (!d.title && !d.description) return;
    try { localStorage.setItem(draftKey, JSON.stringify(d)); el('draft-status').textContent = 'Draft autosaved'; } catch (e) { /* storage unavailable */ }
  }
  form.addEventListener('input', pf.debounce(saveDraft, 500));
  form.addEventListener('change', pf.debounce(saveDraft, 500));
  if (pendingDraft) {
    var banner = el('draft-banner');
    banner.hidden = false; banner.style.display = 'flex';
    el('draft-info').textContent = '“' + (pendingDraft.title || 'Untitled') + '” from ' + new Date(pendingDraft.savedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + '. Files aren’t saved, so you’ll add them again.';
    el('draft-discard').addEventListener('click', function () { try { localStorage.removeItem(draftKey); } catch (e) { /* ignore */ } pendingDraft = null; banner.hidden = true; });
    el('draft-resume').addEventListener('click', function () {
      DRAFT_FIELDS.forEach(function (n) { var node = form.elements[n]; if (node && pendingDraft[n] !== undefined) node.value = pendingDraft[n]; });
      if (pendingDraft.category) { var r = $('input[name=category][value="' + pendingDraft.category + '"]', form); if (r) r.checked = true; }
      if (pendingDraft.license) { var l = $('input[name=license][value="' + pendingDraft.license + '"]', form); if (l) l.checked = true; }
      if (f.loop) f.loop.checked = !!pendingDraft.loopable;
      f.free.checked = !!pendingDraft.free;
      pendingDraft = null; banner.hidden = true; syncKind(); syncPrice(); updateLive(); renderTags();
      pf.toast('Draft restored. Add your files to continue.', 'success');
    });
  }

  /* ---------- submit: XHR upload with progress ---------- */
  var overlay = el('upload-overlay'), bar = el('up-bar'), pct = el('up-pct'), segs = 24;
  for (var s = 0; s < segs; s++) bar.appendChild(document.createElement('i'));
  function setProgress(p) {
    pct.textContent = Math.round(p) + '%'; bar.setAttribute('aria-valuenow', Math.round(p));
    var on = Math.round(p / 100 * segs);
    $$('i', bar).forEach(function (n, i) { n.classList.toggle('on', i < on); });
    el('up-state').textContent = p >= 100 ? 'Finishing up' : (mode === 'create' ? 'Forging your asset' : 'Saving changes');
  }
  function showServerErrors(errors) {
    var first = steps.length, firstNode = null;
    Object.keys(errors).forEach(function (name) {
      var node = form.elements[name] || (name === 'category' ? $('.cat-pick', form) : null) || (name === 'license' ? $('[aria-labelledby=lic-label]', form) : null) || steps[0];
      if (node && node.length > 1 && node[0]) node = node[0]; // RadioNodeList
      setErr(node, errors[name].join(' '));
      var st = STEP_OF[name] === undefined ? 0 : STEP_OF[name];
      if (st < first) { first = st; firstNode = node; }
    });
    reached = steps.length - 1;
    go(first === steps.length ? 0 : first);
    if (firstNode && firstNode.focus) firstNode.focus();
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    for (var i = 0; i < steps.length - 1; i++) {
      if (validate(i)) { reached = Math.max(reached, i); go(i); pf.toast('A few fields need attention before publishing.', 'error'); return; }
    }
    var xhr = new XMLHttpRequest();
    xhr.open('POST', form.getAttribute('action') || location.href);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.setRequestHeader('X-CSRFToken', pf.csrf());
    xhr.upload.onprogress = function (ev) { if (ev.lengthComputable) setProgress(ev.loaded / ev.total * 95); };
    xhr.onload = function () {
      var data = {};
      try { data = JSON.parse(xhr.responseText); } catch (err) { /* not JSON */ }
      if (xhr.status === 200 && data.ok) {
        setProgress(100);
        try { localStorage.removeItem(draftKey); } catch (err2) { /* ignore */ }
        setTimeout(function () { location.href = data.redirect; }, 350);
      } else {
        pf.closeModal(overlay);
        if (data.errors) { showServerErrors(data.errors); pf.toast('The server flagged a few fields.', 'error'); }
        else pf.toast('Upload failed. Please try again.', 'error');
      }
    };
    xhr.onerror = function () { pf.closeModal(overlay); pf.toast('Upload failed. Check your connection and try again.', 'error'); };
    setProgress(0); pf.openModal(overlay);
    xhr.send(new FormData(form));
  });

  /* ---------- go ---------- */
  stepper.hidden = false; nav.hidden = false; live.style.display = ''; live.classList.add('is-js');
  var errNode = $('.errorlist, .has-error', form);
  if (errNode) { var idx = steps.findIndex(function (s) { return s.contains(errNode); }); reached = steps.length - 1; cur = idx >= 0 ? idx : 0; }
  go(cur);
  syncKind(); syncPrice(); updateLive();
  window.scrollTo(0, 0);
})();
