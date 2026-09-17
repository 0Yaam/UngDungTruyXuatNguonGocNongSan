import { Schema, model, Types } from 'mongoose';

export interface ILiveCamera {
  _id?: Types.ObjectId;
  name: string;
  stream_url: string;
  location?: string;
  is_active: boolean;
  thumbnail?: string;
}

export interface IProduct {
  batch_code?: string;
  name: string;
  category: string;
  type: 'Plant' | 'Animal';
  description: string;
  origin: string;
  cultivation_time?: string;
  initial_quantity: number;
  current_quantity: number;
  unit: string;
  images: { path: string; filename: string }[];
  live_cameras: ILiveCamera[];
  farming_area?: Types.ObjectId;
  parent_product?: Types.ObjectId;
  source_products?: Types.ObjectId[];
  qrcode?: string;
  status: 'draft' | 'active' | 'completed' | 'recalled';
  onChainBatchId?: string;
  batchTxHash?: string;
  created_by: Types.ObjectId;
<<<<<<< HEAD
  isDeleted: boolean;
  deletedAt?: Date;
  deleted_by?: Types.ObjectId;
=======
  createdAt?: Date;
  updatedAt?: Date;
>>>>>>> dan/main
}

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, 'Vui l?ng nh?p t?n s?n ph?m'],
      trim: true,
      maxlength: 200,
    },
    batch_code: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Vui l?ng nh?p danh m?c'],
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Vui l?ng ch?n lo?i s?n ph?m'],
      enum: {
        values: ['Plant', 'Animal'],
        message: '{VALUE} kh?ng h?p l?',
      },
    },
    description: {
      type: String,
      required: [true, 'Vui l?ng nh?p m? t?'],
    },
    origin: {
      type: String,
      default: 'Vi?t Nam',
    },
    cultivation_time: {
      type: String,
    },
    initial_quantity: {
      type: Number,
      min: [0, 'Số lượng ban đầu không được âm'],
      default: 0,
    },
    current_quantity: {
      type: Number,
      min: [0, 'Số lượng tồn không được âm'],
      default: 0,
      index: true,
    },
    unit: {
      type: String,
      trim: true,
      default: 'kg',
      maxlength: 30,
    },
    images: {
      type: [{ path: String, filename: String }],
      default: [],
    },
    live_cameras: {
      type: [
        {
          name: {
            type: String,
            required: [true, 'Vui lòng nhập tên camera'],
            trim: true,
            maxlength: 120,
          },
          stream_url: {
            type: String,
            required: [true, 'Vui lòng nhập URL live stream'],
            trim: true,
          },
          location: {
            type: String,
            trim: true,
            maxlength: 200,
          },
          is_active: {
            type: Boolean,
            default: true,
          },
          thumbnail: {
            type: String,
            trim: true,
          },
        },
      ],
      default: [],
    },
    farming_area: {
      type: Schema.Types.ObjectId,
      ref: 'FarmingArea',
    },
    parent_product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
    },
    source_products: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    qrcode: {
      type: String,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'completed', 'recalled'],
      default: 'draft',
    },
    onChainBatchId: {
      type: String,
    },
    batchTxHash: {
      type: String,
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
    },
    deleted_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

export default model<IProduct>('Product', productSchema);
