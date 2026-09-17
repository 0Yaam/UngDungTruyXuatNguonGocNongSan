import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../utils/errors';

const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      msg: err.message,
      ...(err.code ? { code: err.code } : {}),
      ...(err.details ? { details: err.details } : {}),
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(StatusCodes.BAD_REQUEST).json({ msg: err.message });
  }

  if (err.name === 'CastError') {
    return res.status(StatusCodes.BAD_REQUEST).json({ msg: 'ID kh?ng h?p l?' });
  }

  if ((err as any).code === 11000) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ msg: 'Gi? tr? ?? t?n t?i' });
  }

  console.error('Unhandled error:', err);
  return res
    .status(StatusCodes.INTERNAL_SERVER_ERROR)
    .json({ msg: 'L?i server, vui l?ng th? l?i sau' });
};

export default errorHandler;
