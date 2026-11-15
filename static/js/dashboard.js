/* Dashboards: Chart.js 4 charts fed by Django's json_script. Handles all-zero data (a brand-new creator). */
(function () {
  'use strict';
  if (!window.Chart) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  Chart.defaults.color = '#9a9ab2';
  Chart.defaults.font.family = "'JetBrains Mono', ui-monospace, monospace";
  Chart.defaults.font.size = 11;
  if (reduce) Chart.defaults.animation = false;

  var inr = function (n) { return '₹' + Math.round(n).toLocaleString('en-IN'); };
  var short = function (n) { return n >= 1000 ? '₹' + (n >= 100000 ? Math.round(n / 1000) + 'k' : (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k') : '₹' + n; };
  var day = function (iso) { return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); };
  var read = function (id) { var n = document.getElementById(id); return n ? JSON.parse(n.textContent) : null; };
  var tooltip = {
    backgroundColor: '#161622', borderColor: '#34344a', borderWidth: 1, titleColor: '#9a9ab2', bodyColor: '#ededf5', padding: 10, cornerRadius: 10, displayColors: true, boxPadding: 4,
  };
  var grid = { color: '#262636', borderDash: [4, 6], drawTicks: false };

  function fade(ctx, color) {
    var g = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height || 280);
    g.addColorStop(0, color + '66'); g.addColorStop(1, color + '00');
    return g;
  }

  document.querySelectorAll('canvas[data-chart]').forEach(function (cv) {
    var data = read(cv.dataset.source) || {}, kind = cv.dataset.chart, color = cv.dataset.color || '#8B5CF6', ctx = cv.getContext('2d');
    var series = data[cv.dataset.series] || [], labels = data.labels || [];
    var max = Math.max.apply(null, series.concat([0]));

    if (kind === 'spark') {
      new Chart(ctx, { type: 'line', data: { labels: labels, datasets: [{ data: series, borderColor: color, borderWidth: 1.5, pointRadius: 0, tension: 0.35, fill: true, backgroundColor: fade(ctx, color) }] },
        options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false, min: 0, suggestedMax: max || 1 } }, events: [] } });
      return;
    }

    if (kind === 'area') {
      var sales = data[cv.dataset.second] || null, money = cv.dataset.money !== 'false';
      new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: [{ label: cv.dataset.label || 'Value', data: series, borderColor: color, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, pointHoverBackgroundColor: color, pointHoverBorderColor: '#08080D', pointHoverBorderWidth: 2, tension: 0.35, fill: true, backgroundColor: fade(ctx, color) }] },
        options: {
          responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
          plugins: { legend: { display: false }, tooltip: Object.assign({}, tooltip, { callbacks: {
            title: function (items) { return day(items[0].label); },
            label: function (item) { return ' ' + (cv.dataset.label || 'Value') + ': ' + (money ? inr(item.parsed.y) : item.parsed.y); },
            afterLabel: function (item) { return sales ? ' Sales: ' + sales[item.dataIndex] : ''; },
          } }) },
          scales: {
            x: { grid: { display: false }, border: { display: false }, ticks: { maxTicksLimit: 7, maxRotation: 0, callback: function (v) { return day(labels[v]); } } },
            y: { beginAtZero: true, suggestedMax: max > 0 ? undefined : (money ? 100 : 4), grid: grid, border: { display: false }, ticks: { maxTicksLimit: 5, padding: 8, precision: 0, callback: function (v) { return money ? short(v) : v; } } },
          },
        },
      });
      return;
    }

    if (kind === 'bar') {
      new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: [{ label: cv.dataset.label || 'Value', data: series, backgroundColor: color, borderRadius: 4, maxBarThickness: 18 }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: Object.assign({}, tooltip, { callbacks: { title: function (items) { return day(items[0].label); } } }) },
          scales: {
            x: { grid: { display: false }, border: { display: false }, ticks: { maxTicksLimit: 7, maxRotation: 0, callback: function (v) { return day(labels[v]); } } },
            y: { beginAtZero: true, suggestedMax: max > 0 ? undefined : 4, grid: grid, border: { display: false }, ticks: { precision: 0, maxTicksLimit: 5, padding: 8 } },
          },
        },
      });
      return;
    }

    if (kind === 'doughnut') {
      var cats = data.categories || [], total = cats.reduce(function (s, c) { return s + c.revenue; }, 0);
      new Chart(ctx, {
        type: 'doughnut',
        data: total > 0
          ? { labels: cats.map(function (c) { return c.name; }), datasets: [{ data: cats.map(function (c) { return c.revenue; }), backgroundColor: cats.map(function (c) { return c.color; }), borderWidth: 0, spacing: 2 }] }
          : { labels: ['No sales yet'], datasets: [{ data: [1], backgroundColor: ['#262636'], borderWidth: 0 }] },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '70%',
          plugins: { legend: { display: false }, tooltip: total > 0 ? Object.assign({}, tooltip, { callbacks: { label: function (i) { return ' ' + i.label + ': ' + inr(i.parsed); } } }) : { enabled: false } },
        },
      });
    }
  });
})();
