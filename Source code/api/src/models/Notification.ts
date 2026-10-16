import { Schema, model, Types } from 'mongoose';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationCategory = 'product' | 'trace_event' | 'certification' | 'camera' | 'system';

export interface INotification {
  recipient: Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  relatedEntity?: { type: string; id: string };
  isRead: boolean;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: [true, 'Vui lòng nhập tiêu đề thông báo'], trim: true, maxlength: 200 },
    message: { type: String, required: [true, 'Vui lòng nhập nội dung thông báo'], trim: true, maxlength: 1000 },
    type: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
    category: {
      type: String,
      enum: ['product', 'trace_event', 'certification', 'camera', 'system'],
      default: 'system',
    },
    relatedEntity: { type: { type: String }, id: String },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

export default model<INotification>('Notification', notificationSchema);
