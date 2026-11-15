/* Explore: AJAX-refreshing results grid. Without JavaScript the filters are a normal GET form. */
(function () {
  'use strict';
  var form = document.getElementById('filters'), results = document.getElementById('results');
  if (!form || !results) return;
  var sort = document.getElementById('sort-select'), tags = document.getElementById('f-tags');
  var panel = document.getElementById('filter-panel'), backdrop = document.getElementById('filters-backdrop');
  var seq = 0;

  function params(page) {
    var p = new URLSearchParams();
    new FormData(form).forEach(function (v, k) { if (v !== '' && k !== 'csrfmiddlewaretoken') p.set(k, v); });
    if (sort && sort.value && sort.value !== 'newest') p.set('sort', sort.value);
    if (page && page > 1) p.set('page', page);
    return p;
  }
  function load(p, push) {
    var url = location.pathname + (p.toString() ? '?' + p.toString() : '');
    var mine = ++seq;
    results.classList.add('results-busy');
    pf.fetch(url)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (html) {
        if (mine !== seq) return; // a newer request already won
        results.innerHTML = html;
        results.classList.remove('results-busy');
        if (push !== false) history.pushState({}, '', url);
        pf.icons();
      })
      .catch(function () { location.href = url; }); // fall back to a full page load
  }

  var debounced = pf.debounce(function () { load(params()); }, 300);
  form.addEventListener('input', function (e) {
    if (e.target.name === 'q' || e.target.name === 'min_price' || e.target.name === 'max_price') debounced(); else load(params());
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); load(params()); closeSheet(); });
  if (sort) sort.addEventListener('change', function () { load(params()); });

  // tag chips toggle values in a hidden field
  form.addEventListener('click', function (e) {
    var chip = e.target.closest('[data-tag]');
    if (!chip) return;
    e.preventDefault();
    var list = tags.value ? tags.value.split(',') : [], t = chip.dataset.tag, i = list.indexOf(t);
    if (i >= 0) list.splice(i, 1); else list.push(t);
    tags.value = list.join(',');
    chip.classList.toggle('is-active', i < 0);
    chip.setAttribute('aria-pressed', String(i < 0));
    load(params());
  });
  // pagination + removable chips stay AJAX too
  results.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-page]');
    if (a) { e.preventDefault(); load(params(Number(a.dataset.page))); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    var chip = e.target.closest('.active-chips a');
    if (chip) { e.preventDefault(); var u = new URL(chip.href); location.href = u.href; }
  });
  window.addEventListener('popstate', function () { location.reload(); });

  // mobile filter sheet
  function openSheet() { panel.classList.add('is-open'); backdrop.hidden = false; document.body.style.overflow = 'hidden'; }
  function closeSheet() { panel.classList.remove('is-open'); backdrop.hidden = true; document.body.style.overflow = ''; }
  document.addEventListener('click', function (e) { if (e.target.closest('[data-open-filters]')) openSheet(); });
  backdrop.addEventListener('click', closeSheet);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('is-open')) closeSheet(); });
})();
