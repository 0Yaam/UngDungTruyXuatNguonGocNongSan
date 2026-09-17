import { Request, Response, NextFunction } from 'express';
import { verifyJWT } from '../utils/jwt';
import { UnauthenticatedError, UnauthorizedError } from '../utils/errors';
import User from '../models/User';

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthenticatedError('Token không hợp lệ');
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyJWT(token);

    const user = await User.findById(payload.userId).select('isActive');
    if (user && user.isActive === false) {
      throw new UnauthenticatedError('Tài khoản đã bị khóa');
    }

    req.user = {
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
    next();
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      throw err;
    }
    throw new UnauthenticatedError('Token hết hạn hoặc không hợp lệ');
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!roles.includes(req.user!.role)) {
      throw new UnauthorizedError('B?n kh?ng c? quy?n truy c?p');
    }
    next();
  };
};
