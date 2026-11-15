export function getPagination(query = {}) {
  const parsedPage = parseInt(query.page, 10);
  const parsedLimit = parseInt(query.limit, 10);

  const page = Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1;
  let limit = Number.isInteger(parsedLimit) ? parsedLimit : 24;
  if (limit < 1) limit = 1;
  if (limit > 48) limit = 48;

  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function buildMeta(page, limit, total) {
  const safeTotal = typeof total === 'number' && total >= 0 ? total : 0;
  const totalPages = Math.max(1, Math.ceil(safeTotal / limit));
  const hasNext = page * limit < safeTotal;

  return {
    page,
    limit,
    total: safeTotal,
    totalPages,
    hasNext
  };
}
