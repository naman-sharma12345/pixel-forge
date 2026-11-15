export function ok(res, data, { meta, message } = {}) {
  const payload = {
    success: true,
    data: data === undefined ? null : data
  };
  if (meta !== undefined) {
    payload.meta = meta;
  }
  if (message !== undefined) {
    payload.message = message;
  }
  return res.status(200).json(payload);
}

export function created(res, data, { message } = {}) {
  const payload = {
    success: true,
    data: data === undefined ? null : data
  };
  if (message !== undefined) {
    payload.message = message;
  }
  return res.status(201).json(payload);
}
