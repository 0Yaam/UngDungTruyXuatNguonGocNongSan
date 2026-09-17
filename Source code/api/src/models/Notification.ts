import { Schema, model, Types } from 'mongoose';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationCategory = 'product' | 'trace_event' | 'certification' | 'system';

export interface INotification {
  recipient: Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  relatedEntity?: {
    type: string;
    id: string;
  };
  isRead: boolean;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Vui lòng chỉ định người nhận thông báo'],
    },
    title: {
      type: String,
      required: [true, 'Vui lòng nhập tiêu đề thông báo'],
      trim: true,
      maxlength: [200, 'Tiêu đề không được vượt quá 200 ký tự'],
    },
    message: {
      type: String,
      required: [true, 'Vui lòng nhập nội dung thông báo'],
      trim: true,
      maxlength: [1000, 'Nội dung không được vượt quá 1000 ký tự'],
    },
    type: {
      type: String,
      enum: {
        values: ['info', 'success', 'warning', 'error'],
        message: '{VALUE} không phải là loại thông báo hợp lệ',
      },
      default: 'info',
    },
    category: {
      type: String,
      enum: {
        values: ['product', 'trace_event', 'certification', 'system'],
        message: '{VALUE} không phải là danh mục hợp lệ',
      },
      default: 'system',
    },
    relatedEntity: {
      type: {
        type: String,
        trim: true,
      },
      id: {
        type: String,
        trim: true,
      },
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Indexes for faster queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

export default model<INotification>('Notification', notificationSchema);
