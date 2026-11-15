import { ApiError } from '../utils/ApiError.js';

export const validate = ({ body, query, params } = {}) => {
  return (req, res, next) => {
    const issues = [];

    if (body) {
      const result = body.safeParse(req.body);
      if (!result.success) {
        issues.push(...result.error.issues);
      } else {
        req.body = result.data;
      }
    }

    if (params) {
      const result = params.safeParse(req.params);
      if (!result.success) {
        issues.push(...result.error.issues);
      } else {
        req.params = result.data;
      }
    }

    if (query) {
      const result = query.safeParse(req.query);
      if (!result.success) {
        issues.push(...result.error.issues);
      } else {
        try {
          req.query = result.data;
        } catch (_) {
          Object.defineProperty(req, 'query', {
            value: result.data,
            writable: true,
            configurable: true,
            enumerable: true
          });
        }
      }
    }

    if (issues.length > 0) {
      const details = issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message
      }));
      return next(new ApiError(400, 'VALIDATION_ERROR', 'Some fields are invalid', details));
    }

    next();
  };
};

export default validate;
