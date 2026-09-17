import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as authService from '../services/auth.service';

export const register = async (req: Request, res: Response) => {
  const { first_name, last_name, email, password } = req.body;
  const result = await authService.register({ first_name, last_name, email, password });
  res.status(StatusCodes.CREATED).json(result);
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.status(StatusCodes.OK).json(result);
};

export const logout = async (_req: Request, res: Response) => {
  res.status(StatusCodes.OK).json({ msg: 'Đăng xuất thành công' });
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  const result = await authService.forgotPassword(email);
  res.status(StatusCodes.OK).json(result);
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  const result = await authService.resetPassword(token, newPassword);
  res.status(StatusCodes.OK).json(result);
};

export const changePassword = async (req: Request, res: Response) => {
  const { oldPassword, newPassword } = req.body;
  const result = await authService.changePassword(req.user!.userId, oldPassword, newPassword);
  res.status(StatusCodes.OK).json(result);
};
