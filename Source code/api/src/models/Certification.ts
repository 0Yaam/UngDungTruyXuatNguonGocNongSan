import { Schema, model, Types } from 'mongoose';

export interface ICertification {
  name: string;
  type: 'VietGAP' | 'GlobalGAP' | 'Organic' | 'HACCP' | 'ISO22000' | 'Other';
  issuing_authority: string;
  certificate_number: string;
  issue_date: Date;
  expiry_date: Date;
  scope?: string;
  document_url?: string;
  status: 'valid' | 'expired' | 'revoked';
  holder: Types.ObjectId;
  farming_area?: Types.ObjectId;
  products?: Types.ObjectId[];
}

const certificationSchema = new Schema<ICertification>(
  {
    name: {
      type: String,
      required: [true, 'Vui lòng nhập tên chứng nhận'],
      trim: true,
      maxlength: [200, 'Tên chứng nhận không được vượt quá 200 ký tự'],
    },
    type: {
      type: String,
      required: [true, 'Vui lòng chọn loại chứng nhận'],
      enum: {
        values: ['VietGAP', 'GlobalGAP', 'Organic', 'HACCP', 'ISO22000', 'Other'],
        message: '{VALUE} không phải là loại chứng nhận hợp lệ',
      },
    },
    issuing_authority: {
      type: String,
      required: [true, 'Vui lòng nhập tổ chức cấp chứng nhận'],
      trim: true,
    },
    certificate_number: {
      type: String,
      required: [true, 'Vui lòng nhập số chứng nhận'],
      unique: true,
      trim: true,
    },
    issue_date: {
      type: Date,
      required: [true, 'Vui lòng nhập ngày cấp'],
    },
    expiry_date: {
      type: Date,
      required: [true, 'Vui lòng nhập ngày hết hạn'],
    },
    scope: {
      type: String,
      trim: true,
    },
    document_url: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['valid', 'expired', 'revoked'],
        message: '{VALUE} không phải là trạng thái hợp lệ',
      },
      default: 'valid',
    },
    holder: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Vui lòng chỉ định người sở hữu chứng nhận'],
    },
    farming_area: {
      type: Schema.Types.ObjectId,
      ref: 'FarmingArea',
    },
    products: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
  },
  { timestamps: true }
);

// Index for faster queries
certificationSchema.index({ holder: 1 });
certificationSchema.index({ farming_area: 1 });
certificationSchema.index({ status: 1 });
certificationSchema.index({ expiry_date: 1 });

export default model<ICertification>('Certification', certificationSchema);
