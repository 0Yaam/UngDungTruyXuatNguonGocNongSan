import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as adminService from '../services/admin.service';

export const getDashboardStats = async (_req: Request, res: Response) => {
  const stats = await adminService.getDashboardStats();
  res.status(StatusCodes.OK).json({ stats });
};

export const getUsers = async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10));

  const filters: adminService.UserFilters = {
    role: req.query.role as string,
    isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
    search: req.query.search as string,
  };

  const result = await adminService.getUsersWithPagination(page, limit, filters);
  res.status(StatusCodes.OK).json(result);
};

export const updateUserRole = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;

  const user = await adminService.updateUserRole(id, role);
  res.status(StatusCodes.OK).json({ user, msg: 'Cập nhật role thành công' });
};

export const toggleUserStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { isActive } = req.body;

  const user = await adminService.toggleUserStatus(id, isActive);
  const statusMsg = isActive ? 'kích hoạt' : 'khóa';
  res.status(StatusCodes.OK).json({ user, msg: `Đã ${statusMsg} tài khoản` });
};

export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await adminService.deleteUser(id);
  res.status(StatusCodes.OK).json(result);
};

export const getSystemHealth = async (_req: Request, res: Response) => {
  const health = await adminService.getSystemHealth();
  const statusCode = health.status === 'healthy' ? StatusCodes.OK : StatusCodes.SERVICE_UNAVAILABLE;
  res.status(statusCode).json(health);
};
