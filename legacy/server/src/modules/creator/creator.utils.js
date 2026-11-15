export const fillDailySeries = (
  rows = [],
  days = 30,
  keys = ['revenue', 'sales']
) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayStr = formatter.format(new Date());
  const [y, m, d] = todayStr.split('-').map(Number);
  const baseDate = new Date(Date.UTC(y, m - 1, d));

  const rowMap = new Map((rows || []).map((r) => [r._id, r]));
  const series = [];

  for (let i = days - 1; i >= 0; i--) {
    const dObj = new Date(baseDate);
    dObj.setUTCDate(dObj.getUTCDate() - i);
    const dateStr = dObj.toISOString().slice(0, 10);

    const entry = { date: dateStr };
    const matched = rowMap.get(dateStr);
    for (const key of keys) {
      entry[key] = matched ? (matched[key] ?? 0) : 0;
    }
    series.push(entry);
  }

  return series;
};

export const getKolkataStartOfDay = (daysAgo = 0) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayStr = formatter.format(new Date());
  const [y, m, d] = todayStr.split('-').map(Number);
  const baseDate = new Date(Date.UTC(y, m - 1, d));
  baseDate.setUTCDate(baseDate.getUTCDate() - daysAgo);
  const dateStr = baseDate.toISOString().slice(0, 10);
  return new Date(`${dateStr}T00:00:00+05:30`);
};

export default {
  fillDailySeries,
  getKolkataStartOfDay,
};
