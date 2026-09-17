import Notification, { NotificationType, NotificationCategory } from '../models/Notification';
import { NotFoundError } from '../utils/errors';

interface CreateNotificationData {
  recipient: string;
  title: string;
  message: string;
  type?: NotificationType;
  category?: NotificationCategory;
  relatedEntity?: {
    type: string;
    id: string;
  };
}

export const createNotification = async (data: CreateNotificationData) => {
  const notification = await Notification.create({
    recipient: data.recipient,
    title: data.title,
    message: data.message,
    type: data.type || 'info',
    category: data.category || 'system',
    relatedEntity: data.relatedEntity,
    isRead: false,
  });

  return notification;
};

export const getNotificationsByUser = async (
  userId: string,
  page: number = 1,
  limit: number = 20
) => {
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments({ recipient: userId }),
  ]);

  return {
    notifications,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

export const markAsRead = async (notificationId: string, userId: string) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    throw new NotFoundError(`Không tìm thấy thông báo ${notificationId}`);
  }

  return notification;
};

export const markAllAsRead = async (userId: string) => {
  const result = await Notification.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true }
  );

  return {
    modifiedCount: result.modifiedCount,
    message: `Đã đánh dấu ${result.modifiedCount} thông báo là đã đọc`,
  };
};

export const getUnreadCount = async (userId: string) => {
  const count = await Notification.countDocuments({
    recipient: userId,
    isRead: false,
  });

  return { count };
};

export const deleteNotification = async (notificationId: string, userId: string) => {
  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    recipient: userId,
  });

  if (!notification) {
    throw new NotFoundError(`Không tìm thấy thông báo ${notificationId}`);
  }

  return notification;
};

// Helper functions to create specific notifications

export const notifyTraceEventAdded = async (
  productOwnerId: string,
  productName: string,
  eventType: string,
  productId: string
) => {
  return createNotification({
    recipient: productOwnerId,
    title: 'Sự kiện mới được thêm',
    message: `Sự kiện "${eventType}" đã được thêm vào sản phẩm "${productName}"`,
    type: 'info',
    category: 'trace_event',
    relatedEntity: {
      type: 'product',
      id: productId,
    },
  });
};

export const notifyCertificationExpiring = async (
  holderId: string,
  certificationName: string,
  daysUntilExpiry: number,
  certificationId: string
) => {
  return createNotification({
    recipient: holderId,
    title: 'Chứng nhận sắp hết hạn',
    message: `Chứng nhận "${certificationName}" sẽ hết hạn trong ${daysUntilExpiry} ngày`,
    type: 'warning',
    category: 'certification',
    relatedEntity: {
      type: 'certification',
      id: certificationId,
    },
  });
};

export const notifyProductStatusChanged = async (
  creatorId: string,
  productName: string,
  oldStatus: string,
  newStatus: string,
  productId: string
) => {
  const statusLabels: Record<string, string> = {
    draft: 'Bản nháp',
    active: 'Đang hoạt động',
    completed: 'Hoàn thành',
  };

  return createNotification({
    recipient: creatorId,
    title: 'Trạng thái sản phẩm đã thay đổi',
    message: `Sản phẩm "${productName}" đã chuyển từ "${statusLabels[oldStatus] || oldStatus}" sang "${statusLabels[newStatus] || newStatus}"`,
    type: 'success',
    category: 'product',
    relatedEntity: {
      type: 'product',
      id: productId,
    },
  });
};

export const checkAndNotifyExpiringCertifications = async () => {
  // This function should be called periodically (e.g., via a cron job)
  const Certification = (await import('../models/Certification')).default;
  
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const expiringCertifications = await Certification.find({
    status: 'valid',
    expiry_date: {
      $gte: now,
      $lte: sevenDaysFromNow,
    },
  });

  const notifications = [];
  for (const cert of expiringCertifications) {
    const daysUntilExpiry = Math.ceil(
      (cert.expiry_date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );

    // Check if notification already sent for this certification
    const existingNotification = await Notification.findOne({
      'relatedEntity.type': 'certification',
      'relatedEntity.id': cert._id.toString(),
      category: 'certification',
      createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    });

    if (!existingNotification) {
      const notification = await notifyCertificationExpiring(
        cert.holder.toString(),
        cert.name,
        daysUntilExpiry,
        cert._id.toString()
      );
      notifications.push(notification);
    }
  }

  return {
    checked: expiringCertifications.length,
    notified: notifications.length,
  };
};
