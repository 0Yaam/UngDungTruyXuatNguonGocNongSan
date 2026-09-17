import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as notificationService from '../services/notification.service';

export const getMyNotifications = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const result = await notificationService.getNotificationsByUser(userId, page, limit);
  res.status(StatusCodes.OK).json(result);
};

export const getUnreadCount = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await notificationService.getUnreadCount(userId);
  res.status(StatusCodes.OK).json(result);
};

export const markAsRead = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;

  const notification = await notificationService.markAsRead(id, userId);
  res.status(StatusCodes.OK).json({ notification });
};

export const markAllAsRead = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await notificationService.markAllAsRead(userId);
  res.status(StatusCodes.OK).json(result);
};

export const deleteNotification = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;

  await notificationService.deleteNotification(id, userId);
  res.status(StatusCodes.OK).json({ msg: 'Đã xóa thông báo' });
};

export const checkExpiringCertifications = async (_req: Request, res: Response) => {
  const result = await notificationService.checkAndNotifyExpiringCertifications();
  res.status(StatusCodes.OK).json(result);
};
