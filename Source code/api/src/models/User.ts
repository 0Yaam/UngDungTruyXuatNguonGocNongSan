import { Schema, model, Document } from 'mongoose';
import validator from 'validator';
import { genSalt, hash, compare } from 'bcrypt';

export interface IUser extends Document {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  avatar?: string;
  phone?: string;
  address?: string;
  role: 'admin' | 'manager' | 'farmer' | 'consumer';
  isActive: boolean;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    first_name: {
      type: String,
      required: [true, 'Vui l?ng nh?p h?'],
      trim: true,
      maxlength: 100,
    },
    last_name: {
      type: String,
      required: [true, 'Vui l?ng nh?p t?n'],
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Vui l?ng nh?p email'],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Email kh?ng h?p l?'],
    },
    password: {
      type: String,
      required: [true, 'Vui l?ng nh?p m?t kh?u'],
      minlength: [6, 'M?t kh?u t?i thi?u 6 k? t?'],
    },
    avatar: {
      type: String,
      trim: true,
      default: '/uploads/sample-media/default-avatar.svg',
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
    },
    role: {
      type: String,
      enum: ['admin', 'manager', 'farmer', 'consumer'],
      default: 'consumer',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (this: IUser) {
  if (!this.isModified('password')) return;
  const salt = await genSalt(10);
  this.password = await hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return compare(candidatePassword, this.password);
};

export default model<IUser>('User', userSchema);
