import { Schema, model, Types } from 'mongoose';

export interface IFarmingArea {
  name: string;
  address: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  area_size?: number;
  description?: string;
  owner: Types.ObjectId;
  images: { path: string; filename: string }[];
  certifications: Types.ObjectId[];
  status: 'active' | 'inactive';
}

const farmingAreaSchema = new Schema<IFarmingArea>(
  {
    name: {
      type: String,
      required: [true, 'Vui lòng nhập tên vùng canh tác'],
      trim: true,
      maxlength: 200,
    },
    address: {
      type: String,
      required: [true, 'Vui lòng nhập địa chỉ'],
      trim: true,
    },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    area_size: {
      type: Number,
      min: [0, 'Diện tích phải lớn hơn 0'],
    },
    description: {
      type: String,
      default: '',
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Vui lòng chỉ định chủ sở hữu'],
    },
    images: {
      type: [{ path: String, filename: String }],
      default: [],
    },
    certifications: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Certification' }],
      default: [],
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive'],
        message: '{VALUE} không hợp lệ',
      },
      default: 'active',
    },
  },
  { timestamps: true }
);

export default model<IFarmingArea>('FarmingArea', farmingAreaSchema);
