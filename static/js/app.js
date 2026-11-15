/* Pixel Forge: shared behaviour (vanilla JS, no build step).
   menus, modals + focus traps, toasts, fetch helper with CSRF, AJAX forms, command palette,
   count-ups, reveal, rails, confetti, small form helpers. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var pf = (window.pf = {});

  /* ---------- helpers ---------- */
  function cookie(name) {
    var m = document.cookie.match('(?:^|; )' + name + '=([^;]*)');
    return m ? decodeURIComponent(m[1]) : '';
  }
  pf.csrf = function () {
    var field = $('[name=csrfmiddlewaretoken]');
    return cookie('csrftoken') || (field ? field.value : '');
  };
  /** fetch() that sends the CSRF token and marks the request as AJAX. */
  pf.fetch = function (url, opts) {
    opts = opts || {};
    var headers = Object.assign({ 'X-Requested-With': 'XMLHttpRequest', 'X-CSRFToken': pf.csrf() }, opts.headers || {});
    return fetch(url, Object.assign({ credentials: 'same-origin' }, opts, { headers: headers }));
  };
  pf.icons = function () { if (window.lucide) window.lucide.createIcons(); };
  pf.debounce = function (fn, ms) {
    var t;
    return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); };
  };
  pf.formatNumber = function (n) { return Number(n).toLocaleString('en-IN'); };

  /* ---------- toasts ---------- */
  var TOAST_ICON = { success: 'check-circle-2', error: 'alert-circle', warning: 'alert-triangle', info: 'info', debug: 'info' };
  pf.toast = function (message, level, action) {
    level = TOAST_ICON[level] ? level : 'info';
    var box = $('#toasts');
    if (!box) return;
    var el = document.createElement('div');
    el.className = 'toast ' + level;
    el.setAttribute('role', level === 'error' ? 'alert' : 'status');
    var icon = document.createElement('i');
    icon.setAttribute('data-lucide', TOAST_ICON[level]);
    var text = document.createElement('span');
    text.textContent = message;
    el.appendChild(icon);
    el.appendChild(text);
    if (action && action.href) {
      var a = document.createElement('a');
      a.href = action.href;
      a.textContent = action.label;
      a.style.cssText = 'margin-left:8px;color:var(--primary);font-weight:600';
      text.appendChild(a);
    }
    var close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', 'Dismiss');
    close.innerHTML = '&times;';
    el.appendChild(close);
    box.appendChild(el);
    pf.icons();
    var remove = function () { el.classList.add('is-leaving'); setTimeout(function () { el.remove(); }, 250); };
    close.addEventListener('click', remove);
    setTimeout(remove, 5000);
  };
  // Django messages -> toasts
  (function () {
    var list = $('#django-messages');
    if (!list) return;
    $$('li', list).forEach(function (li) { pf.toast(li.textContent.trim(), li.dataset.level || 'info'); });
    list.hidden = true;
  })();

  /* ---------- modals / drawers with focus trap ---------- */
  var FOCUSABLE = 'a[href], button:not([disabled]), textarea, input:not([type=hidden]), select, [tabindex]:not([tabindex="-1"])';
  var openStack = [];
  pf.openModal = function (el, trigger) {
    if (!el || el.classList.contains('is-open')) return;
    el.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    openStack.push({ el: el, trigger: trigger || document.activeElement });
    setTimeout(function () {
      var first = $('[autofocus]', el) || $(FOCUSABLE.replace('a[href], ', ''), el.querySelector('.modal, .drawer, .palette') || el) || $(FOCUSABLE, el);
      if (first) first.focus();
    }, 30);
  };
  pf.closeModal = function (el) {
    el = el || (openStack.length && openStack[openStack.length - 1].el);
    if (!el) return;
    el.classList.remove('is-open');
    var idx = openStack.findIndex(function (o) { return o.el === el; });
    var entry = idx >= 0 ? openStack.splice(idx, 1)[0] : null;
    if (!openStack.length) document.body.style.overflow = '';
    if (entry && entry.trigger && entry.trigger.focus) entry.trigger.focus();
  };
  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-open]');
    if (opener) {
      e.preventDefault();
      pf.openModal(document.getElementById(opener.dataset.open), opener);
      return;
    }
    var closer = e.target.closest('[data-close]');
    if (closer) pf.closeModal(closer.closest('[data-modal]'));
  });
  document.addEventListener('keydown', function (e) {
    if (!openStack.length) return;
    var top = openStack[openStack.length - 1].el;
    if (e.key === 'Escape') { e.preventDefault(); pf.closeModal(top); return; }
    if (e.key === 'Tab') {
      var items = $$(FOCUSABLE, top).filter(function (n) { return n.offsetParent !== null; });
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- confirm dialog for destructive forms: <form data-confirm="Message"> ---------- */
  var confirmEl;
  function askConfirm(message, title, label) {
    return new Promise(function (resolve) {
      if (!confirmEl) {
        confirmEl = document.createElement('div');
        confirmEl.className = 'overlay';
        confirmEl.setAttribute('role', 'alertdialog');
        confirmEl.setAttribute('aria-modal', 'true');
        confirmEl.setAttribute('data-modal', '');
        confirmEl.innerHTML = '<div class="overlay__backdrop" data-close></div><div class="modal"><h2></h2><p class="muted" style="margin-top:8px;font-size:14px;line-height:1.6"></p><div class="modal-actions"><button type="button" class="btn btn-ghost" data-no>Cancel</button><button type="button" class="btn btn-danger" data-yes autofocus>Confirm</button></div></div>';
        document.body.appendChild(confirmEl);
      }
      $('h2', confirmEl).textContent = title || 'Are you sure?';
      $('p', confirmEl).textContent = message;
      $('[data-yes]', confirmEl).textContent = label || 'Confirm';
      var done = function (v) { confirmEl.removeEventListener('click', onClick); pf.closeModal(confirmEl); resolve(v); };
      var onClick = function (e) {
        if (e.target.closest('[data-yes]')) done(true);
        else if (e.target.closest('[data-no]') || e.target.closest('[data-close]')) done(false);
      };
      confirmEl.addEventListener('click', onClick);
      pf.openModal(confirmEl);
    });
  }
  document.addEventListener('submit', function (e) {
    var form = e.target.closest('form[data-confirm]');
    if (!form || form.dataset.confirmed) return;
    e.preventDefault();
    askConfirm(form.dataset.confirm, form.dataset.confirmTitle, form.dataset.confirmLabel).then(function (yes) {
      if (yes) { form.dataset.confirmed = '1'; if (form.requestSubmit) form.requestSubmit(); else form.submit(); }
    });
  }, true);

  /* ---------- dropdown menus ---------- */
  document.addEventListener('click', function (e) {
    var toggle = e.target.closest('[data-menu-toggle]');
    $$('[data-menu].is-open').forEach(function (m) {
      if (!toggle || toggle.closest('[data-menu]') !== m) { m.classList.remove('is-open'); var t = $('[data-menu-toggle]', m); if (t) t.setAttribute('aria-expanded', 'false'); }
    });
    if (toggle) {
      var menu = toggle.closest('[data-menu]');
      var open = menu.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      if (open) { var item = $('[role=menuitem]', menu); if (item) item.focus(); }
    }
  });
  document.addEventListener('keydown', function (e) {
    var menu = document.querySelector('[data-menu].is-open');
    if (!menu) return;
    var items = $$('[role=menuitem]', menu);
    var i = items.indexOf(document.activeElement);
    if (e.key === 'Escape') { menu.classList.remove('is-open'); var t = $('[data-menu-toggle]', menu); t.setAttribute('aria-expanded', 'false'); t.focus(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
  });

  /* ---------- navbar shadow, offline banner, campfire, newsletter ---------- */
  var nav = $('#nav');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('is-scrolled', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }
  var offline = $('#offline-banner');
  function syncOnline() { if (offline) offline.hidden = navigator.onLine; }
  window.addEventListener('online', syncOnline);
  window.addEventListener('offline', syncOnline);
  syncOnline();
  var fire = $('[data-campfire]');
  if (fire && !reduceMotion) {
    var frame = 0;
    setInterval(function () { frame = (frame + 1) % 4; fire.style.backgroundPositionX = (frame * 100 / 3) + '%'; }, 150);
  }
  var news = $('[data-newsletter]');
  if (news) news.addEventListener('submit', function (e) { e.preventDefault(); pf.toast("You're on the list. Pixel drops incoming.", 'success'); news.reset(); });

  /* ---------- heart burst + AJAX forms ---------- */
  function burst(el) {
    if (reduceMotion) return;
    var r = el.getBoundingClientRect();
    for (var i = 0; i < 6; i++) {
      var p = document.createElement('span');
      p.className = 'pf-particle';
      var ang = (Math.PI * 2 * i) / 6 + Math.random() * 0.5, dist = 22 + Math.random() * 16;
      p.style.left = r.left + r.width / 2 + 'px';
      p.style.top = r.top + r.height / 2 + 'px';
      p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
      p.style.background = ['#f472b6', '#fbbf24', '#22d3ee'][i % 3];
      document.body.appendChild(p);
      setTimeout(function (n) { n.remove(); }, 650, p);
    }
  }
  function setCartCount(n) {
    var badge = $('#cart-badge');
    if (!badge) return;
    badge.textContent = n;
    badge.hidden = !n;
    badge.classList.remove('bump');
    void badge.offsetWidth;
    badge.classList.add('bump');
  }
  pf.setCartCount = setCartCount;
  var handlers = {
    wishlist: function (form, data) {
      var heart = $('.heart', form);
      heart.classList.toggle('is-on', data.in_wishlist);
      heart.setAttribute('aria-pressed', String(data.in_wishlist));
      if (data.in_wishlist) burst(heart);
      pf.toast(data.message, 'success');
      if (!data.in_wishlist && form.hasAttribute('data-remove-card')) {
        var card = form.closest('.asset-card') || form.closest('[data-removable]');
        if (card) card.remove();
      }
    },
    cart: function (form, data) {
      setCartCount(data.cart_count);
      pf.toast(data.message, 'success', { href: data.cart_url, label: 'View cart' });
      if (form.hasAttribute('data-cart-swap')) {
        var link = document.createElement('a');
        link.href = data.cart_url; link.className = form.dataset.cartSwap;
        link.innerHTML = '<i data-lucide="check"></i> In cart: view cart';
        form.replaceWith(link); pf.icons();
      }
    },
    remove: function (form, data) {
      setCartCount(data.cart_count);
      var row = form.closest('[data-cart-row]');
      if (row) row.remove();
      if (data.reload) location.reload();
      pf.toast(data.message, 'success');
    },
  };
  document.addEventListener('submit', function (e) {
    var form = e.target.closest('form[data-ajax]');
    if (!form || e.defaultPrevented) return;
    var handler = handlers[form.dataset.ajax];
    if (!handler) return;
    e.preventDefault();
    var btn = $('button[type=submit]', form);
    if (btn) btn.disabled = true;
    pf.fetch(form.action, { method: 'POST', body: new FormData(form) })
      .then(function (res) { return res.json().then(function (data) { return { res: res, data: data }; }); })
      .then(function (o) {
        if (!o.res.ok || o.data.ok === false) pf.toast(o.data.message || 'Something went wrong.', 'error');
        else handler(form, o.data);
      })
      .catch(function () { form.submit(); }) // no JSON back (for example a login redirect): do the normal POST
      .finally(function () { if (btn) btn.disabled = false; });
  });

  /* ---------- command palette (AJAX search modal) ---------- */
  var palette = $('#palette');
  if (palette) {
    var input = $('#palette-input'), results = $('#palette-results'), recentBox = $('#palette-recent');
    var searchUrl = palette.dataset.searchUrl, exploreUrl = palette.dataset.exploreUrl;
    var RECENT_KEY = 'pf_recent_searches';
    var recent = function () { try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch (e) { return []; } };
    var saveRecent = function (q) {
      q = q.trim(); if (!q) return;
      try { localStorage.setItem(RECENT_KEY, JSON.stringify([q].concat(recent().filter(function (r) { return r !== q; })).slice(0, 5))); } catch (e) { /* storage unavailable */ }
    };
    var options = function () { return $$('.palette__item', palette); };
    var select = function (i) {
      var list = options();
      if (!list.length) return;
      i = (i + list.length) % list.length;
      list.forEach(function (o, n) { o.setAttribute('aria-selected', String(n === i)); });
      list[i].scrollIntoView({ block: 'nearest' });
    };
    var selectedIndex = function () { return options().findIndex(function (o) { return o.getAttribute('aria-selected') === 'true'; }); };
    var esc = function (s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; };
    function renderRecent() {
      var r = recent();
      recentBox.innerHTML = r.length && !input.value.trim()
        ? '<p class="palette__group">Recent searches</p>' + r.map(function (q) {
          var href = exploreUrl + '?q=' + encodeURIComponent(q);
          return '<a class="palette__item" role="option" data-href="' + href + '" data-recent="' + esc(q) + '" href="' + href + '"><i data-lucide="history"></i> ' + esc(q) + '</a>';
        }).join('')
        : '';
      pf.icons();
    }
    var runSearch = pf.debounce(function () {
      var q = input.value.trim();
      renderRecent();
      if (!q) { results.innerHTML = ''; return; }
      pf.fetch(searchUrl + '?q=' + encodeURIComponent(q))
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (input.value.trim() !== q) return; // stale response
          var html = '<p class="palette__group">Assets</p>';
          html += data.results.length
            ? data.results.map(function (a) {
              return '<a class="palette__item" role="option" data-href="' + a.url + '" href="' + a.url + '"><img src="' + a.thumbnail + '" alt="" width="40" height="40"><span class="grow"><span class="truncate" style="display:block;font-weight:500">' + esc(a.title) + '</span><span class="subtle" style="font-size:12px">' + esc(a.creator) + ' · ' + esc(a.category) + '</span></span><span class="font-mono" style="font-size:12px">' + esc(a.price_label) + '</span></a>';
            }).join('')
            : '<p class="muted" style="padding:8px 10px;font-size:14px">No assets match &ldquo;' + esc(q) + '&rdquo;.</p>';
          var all = exploreUrl + '?q=' + encodeURIComponent(q);
          html += '<a class="palette__item" role="option" data-href="' + all + '" href="' + all + '"><i data-lucide="arrow-right"></i> See all results for &ldquo;' + esc(q) + '&rdquo;</a>';
          results.innerHTML = html;
          pf.icons();
          select(0);
        })
        .catch(function () { results.innerHTML = '<p class="muted" style="padding:8px 10px;font-size:14px">Search is unavailable right now.</p>'; });
    }, 300);
    input.addEventListener('input', runSearch);
    palette.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); select(selectedIndex() + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); select(selectedIndex() - 1); }
      else if (e.key === 'Enter') {
        var list = options(), i = selectedIndex();
        if (i >= 0 && list[i]) { e.preventDefault(); if (list[i].dataset.recent) saveRecent(list[i].dataset.recent); location.href = list[i].dataset.href; }
        else if (input.value.trim()) saveRecent(input.value);
      }
    });
    palette.addEventListener('click', function (e) {
      var item = e.target.closest('.palette__item');
      if (item && item.dataset.recent) saveRecent(item.dataset.recent);
      else if (item && input.value.trim() && item.dataset.href.indexOf('?q=') > -1) saveRecent(input.value);
    });
    palette.addEventListener('submit', function () { saveRecent(input.value); });
    var openPalette = function (trigger) { pf.openModal(palette, trigger); input.value = ''; results.innerHTML = ''; renderRecent(); select(-0); input.focus(); };
    document.addEventListener('click', function (e) { var t = e.target.closest('[data-palette-open]'); if (t) { e.preventDefault(); var drawer = t.closest('[data-modal]'); if (drawer) pf.closeModal(drawer); openPalette(t); } });
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (palette.classList.contains('is-open')) pf.closeModal(palette); else openPalette(document.activeElement);
      }
    });
  }

  /* ---------- count-up (once per view) + reveal on scroll ---------- */
  function countUp(el) {
    var target = Number(el.dataset.value || 0), prefix = el.dataset.prefix || '', dec = Number(el.dataset.decimals || 0);
    var fmt = function (n) { return prefix + (dec ? n.toFixed(dec) : pf.formatNumber(Math.round(n))); };
    if (reduceMotion || !target) { el.textContent = fmt(target); return; }
    var start = performance.now(), dur = 1000;
    (function tick(t) {
      var p = Math.min(1, (t - start) / dur);
      el.textContent = fmt(target * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(tick);
    })(start);
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        if (en.target.hasAttribute('data-countup')) countUp(en.target);
        else en.target.classList.add('is-visible');
      });
    }, { rootMargin: '-40px' });
    $$('[data-countup], .reveal').forEach(function (el) { io.observe(el); });
  } else {
    $$('[data-countup]').forEach(countUp);
    $$('.reveal').forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- rails: arrows, drag to scroll ---------- */
  $$('[data-rail]').forEach(function (rail) {
    var track = $('.rail__track', rail), prev = $('[data-rail-prev]', rail), next = $('[data-rail-next]', rail);
    var update = function () {
      if (prev) prev.disabled = track.scrollLeft <= 4;
      if (next) next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    };
    var by = function (dir) { track.scrollBy({ left: dir * track.clientWidth * 0.85, behavior: reduceMotion ? 'auto' : 'smooth' }); };
    if (prev) prev.addEventListener('click', function () { by(-1); });
    if (next) next.addEventListener('click', function () { by(1); });
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
    var down = false, moved = false, sx = 0, sl = 0;
    track.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse' || e.button !== 0) return; down = true; moved = false; sx = e.clientX; sl = track.scrollLeft; });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - sx;
      if (!moved && Math.abs(dx) > 6) { moved = true; track.classList.add('dragging'); }
      if (moved) track.scrollLeft = sl - dx;
    });
    window.addEventListener('pointerup', function () { down = false; setTimeout(function () { track.classList.remove('dragging'); }, 0); });
    track.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  });

  /* ---------- confetti (pixel squares) ---------- */
  pf.confetti = function () {
    if (reduceMotion) return;
    var cv = document.createElement('canvas');
    cv.className = 'confetti-canvas';
    cv.width = innerWidth; cv.height = innerHeight;
    document.body.appendChild(cv);
    var ctx = cv.getContext('2d'), colors = ['#8B5CF6', '#22D3EE', '#A3E635', '#F472B6', '#FBBF24'];
    var parts = [];
    for (var i = 0; i < 140; i++) {
      var a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6, sp = 8 + Math.random() * 10;
      parts.push({ x: cv.width / 2, y: cv.height * 0.35, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, s: 5 + Math.floor(Math.random() * 5), c: colors[i % 5], life: 0 });
    }
    (function frame() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      var alive = false;
      parts.forEach(function (p) {
        p.life++; p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy;
        if (p.y < cv.height + 20 && p.life < 140) { alive = true; ctx.globalAlpha = Math.max(0, 1 - p.life / 140); ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s); }
      });
      if (alive) requestAnimationFrame(frame); else cv.remove();
    })();
  };
  if ($('[data-confetti]')) setTimeout(pf.confetti, 250);

  /* ---------- small form helpers ---------- */
  $$('[data-count-for]').forEach(function (out) {
    var field = document.getElementById(out.dataset.countFor);
    if (!field) return;
    var sync = function () { out.textContent = field.value.length + '/' + (field.maxLength > 0 ? field.maxLength : ''); };
    field.addEventListener('input', sync); sync();
  });
  $$('[data-strength-for]').forEach(function (bar) {
    var field = document.getElementById(bar.dataset.strengthFor);
    if (!field) return;
    var score = function (pw) {
      var s = 0;
      if (pw.length >= 8) s++; if (pw.length >= 12) s++;
      if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
      if (/\d/.test(pw) && /[^a-zA-Z0-9]/.test(pw)) s++;
      return pw ? Math.max(1, Math.min(4, s)) : 0;
    };
    field.addEventListener('input', function () { bar.dataset.score = score(field.value); });
  });
  $$('input[data-preview]').forEach(function (inp) {
    inp.addEventListener('change', function () {
      var img = document.getElementById(inp.dataset.preview);
      if (img && inp.files[0]) img.src = URL.createObjectURL(inp.files[0]);
    });
  });
  $$('[data-toggle-password]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var f = document.getElementById(btn.dataset.togglePassword);
      f.type = f.type === 'password' ? 'text' : 'password';
      btn.setAttribute('aria-label', f.type === 'password' ? 'Show password' : 'Hide password');
    });
  });
  $$('[data-autosubmit]').forEach(function (el) { el.addEventListener('change', function () { el.form.submit(); }); });

  // after registering with ?intent=sell the home page opens the become-creator dialog
  if (/[?&]become=1/.test(location.search) && document.getElementById('become-creator')) pf.openModal(document.getElementById('become-creator'));

  pf.icons();
})();

/* Prefetch same-origin pages on hover/focus so navigation feels instant (skipped on data-saver / slow links). */
(function () {
  'use strict';
  var c = navigator.connection || {};
  if (c.saveData || /2g/.test(c.effectiveType || '')) return;
  var done = {}, timer;
  function prefetch(a) {
    if (!a || a.origin !== location.origin || a.target === '_blank' || a.hasAttribute('download')) return;
    var u = a.pathname + a.search;
    if (done[u] || /\/(logout|download|cart\/|checkout|api\/)/.test(u) || /\.(csv|pdf|png)$/.test(a.pathname)) return;
    done[u] = 1;
    var l = document.createElement('link'); l.rel = 'prefetch'; l.href = u; document.head.appendChild(l);
  }
  function onOver(e) { var a = e.target.closest && e.target.closest('a[href]'); if (!a) return; clearTimeout(timer); timer = setTimeout(function () { prefetch(a); }, 120); }
  document.addEventListener('mouseover', onOver, { passive: true });
  document.addEventListener('focusin', onOver);
  document.addEventListener('touchstart', function (e) { var a = e.target.closest && e.target.closest('a[href]'); prefetch(a); }, { passive: true });
})();
