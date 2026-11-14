import multer from 'multer';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';

export const notFound = (req, res, next) => {
  next(new ApiError(404, 'NOT_FOUND', `Route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler = (err, req, res, next) => {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong';
  let details = undefined;

  if (err instanceof ApiError) {
    statusCode = err.statusCode || 500;
    code = err.code || 'INTERNAL_ERROR';
    message = err.message;
    details = err.details;
  } else if (err.status === 404 || err.statusCode === 404) {
    statusCode = 404;
    code = 'NOT_FOUND';
    message = err.message || 'Resource not found';
  } else if (err instanceof ZodError || err.name === 'ZodError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation error';
    details = err.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message
    }));
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation error';
    details = Object.values(err.errors || {}).map((e) => ({
      path: e.path,
      message: e.message
    }));
  } else if (err.name === 'CastError') {
    statusCode = 400;
    code = 'BAD_REQUEST';
    message = 'Invalid id';
  } else if (err.code === 11000) {
    statusCode = 409;
    code = 'CONFLICT';
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'field';
    message = `${field} is already taken`;
    details = [{ path: field, message: `${field} is already taken` }];
  } else if (err instanceof multer.MulterError || err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      statusCode = 413;
      code = 'FILE_TOO_LARGE';
      message = err.message || 'File size exceeds limit';
    } else {
      statusCode = 400;
      code = 'BAD_REQUEST';
      message = err.message;
    }
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Token has expired';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'UNAUTHORIZED';
    message = 'Invalid token';
  } else {
    statusCode = 500;
    code = 'INTERNAL_ERROR';
    message = 'Something went wrong';
    console.error(err.stack || err);
  }

  const errorResponse = {
    code,
    message
  };

  if (details !== undefined) {
    errorResponse.details = details;
  }

  res.status(statusCode).json({
    success: false,
    error: errorResponse
  });
};
