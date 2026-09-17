import crypto from 'crypto';
import User, { IUser } from '../models/User';
import { createJWT } from '../utils/jwt';
import { BadRequestError, UnauthenticatedError } from '../utils/errors';

const createUserToken = (user: IUser) => ({
  userId: user._id,
  email: user.email,
  name: `${user.first_name} ${user.last_name}`,
  first_name: user.first_name,
  last_name: user.last_name,
  avatar: user.avatar,
  role: user.role,
});

export const register = async (data: {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}) => {
  const existing = await User.findOne({ email: data.email });
  if (existing) {
    throw new BadRequestError('Email ?? t?n t?i');
  }

  // First account becomes admin.
  const isFirst = (await User.countDocuments({})) === 0;
  const role = isFirst ? 'admin' : 'consumer';

  const user = await User.create({ ...data, role });
  const tokenUser = createUserToken(user);
  const token = createJWT(tokenUser);

  return { user: tokenUser, token };
};

export const login = async (email: string, password: string) => {
  if (!email || !password) {
    throw new BadRequestError('Vui l?ng nh?p email v? m?t kh?u');
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new UnauthenticatedError('Email ho?c m?t kh?u kh?ng ??ng');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new UnauthenticatedError('Email ho?c m?t kh?u kh?ng ??ng');
  }

  const tokenUser = createUserToken(user);
  const token = createJWT(tokenUser);

  return { user: tokenUser, token };
};

export const getAllUsers = async () => {
  return User.find({}).select('-password');
};

export const getUserById = async (userId: string) => {
  const user = await User.findById(userId).select('-password');
  if (!user) {
    throw new BadRequestError(`Kh?ng t?m th?y user ${userId}`);
  }
  return user;
};

export const updateUser = async (
  userId: string,
  data: Partial<IUser>
) => {
  // Password and role are not updated here.
  const { password, role, ...safeData } = data as any;
  const user = await User.findByIdAndUpdate(userId, safeData, {
    new: true,
    runValidators: true,
  }).select('-password');

  if (!user) {
    throw new BadRequestError(`Không tìm thấy user ${userId}`);
  }

  return user;
};

export const forgotPassword = async (email: string) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new BadRequestError('Email không tồn tại');
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save();

  return { resetToken };
};

export const resetPassword = async (token: string, newPassword: string) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) {
    throw new BadRequestError('Token không hợp lệ hoặc đã hết hạn');
  }

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  return { msg: 'Đặt lại mật khẩu thành công' };
};

export const changePassword = async (
  userId: string,
  oldPassword: string,
  newPassword: string
) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new BadRequestError('Người dùng không tồn tại');
  }

  const isMatch = await user.comparePassword(oldPassword);
  if (!isMatch) {
    throw new BadRequestError('Mật khẩu cũ không đúng');
  }

  user.password = newPassword;
  await user.save();

  return { msg: 'Đổi mật khẩu thành công' };
};
