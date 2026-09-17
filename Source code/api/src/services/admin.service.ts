import mongoose from 'mongoose';
import User, { IUser } from '../models/User';
import Product from '../models/Product';
import TraceEvent from '../models/TraceEvent';
import { getProvider } from '../config/blockchain';
import { BadRequestError, NotFoundError } from '../utils/errors';

export interface DashboardStats {
  users: {
    total: number;
    byRole: Record<string, number>;
  };
  products: {
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
  };
  traceEvents: {
    total: number;
    thisWeek: number;
    byOnChainStatus: Record<string, number>;
    byEventType: Record<string, number>;
  };
  recentActivity: {
    newUsers: number;
    newProducts: number;
    newTraceEvents: number;
  };
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    usersByRole,
    productsByStatus,
    productsByType,
    traceEventsByStatus,
    traceEventsByType,
    totalTraceEvents,
    traceEventsThisWeek,
    recentUsers,
    recentProducts,
    recentTraceEvents,
  ] = await Promise.all([
    User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]),
    Product.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Product.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]),
    TraceEvent.aggregate([
      { $group: { _id: '$onChainStatus', count: { $sum: 1 } } },
    ]),
    TraceEvent.aggregate([
      { $group: { _id: '$eventType', count: { $sum: 1 } } },
    ]),
    TraceEvent.countDocuments(),
    TraceEvent.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    Product.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    TraceEvent.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
  ]);

  const aggregateToRecord = (arr: { _id: string; count: number }[]): Record<string, number> => {
    return arr.reduce((acc, item) => {
      if (item._id) {
        acc[item._id] = item.count;
      }
      return acc;
    }, {} as Record<string, number>);
  };

  const userRoleMap = aggregateToRecord(usersByRole);
  const totalUsers = Object.values(userRoleMap).reduce((a, b) => a + b, 0);

  const productStatusMap = aggregateToRecord(productsByStatus);
  const productTypeMap = aggregateToRecord(productsByType);
  const totalProducts = Object.values(productStatusMap).reduce((a, b) => a + b, 0);

  return {
    users: {
      total: totalUsers,
      byRole: userRoleMap,
    },
    products: {
      total: totalProducts,
      byStatus: productStatusMap,
      byType: productTypeMap,
    },
    traceEvents: {
      total: totalTraceEvents,
      thisWeek: traceEventsThisWeek,
      byOnChainStatus: aggregateToRecord(traceEventsByStatus),
      byEventType: aggregateToRecord(traceEventsByType),
    },
    recentActivity: {
      newUsers: recentUsers,
      newProducts: recentProducts,
      newTraceEvents: recentTraceEvents,
    },
  };
};

export interface UserFilters {
  role?: string;
  isActive?: boolean;
  search?: string;
}

export interface PaginatedUsers {
  users: IUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const getUsersWithPagination = async (
  page: number = 1,
  limit: number = 10,
  filters: UserFilters = {}
): Promise<PaginatedUsers> => {
  const query: Record<string, unknown> = {};

  if (filters.role) {
    query.role = filters.role;
  }

  if (typeof filters.isActive === 'boolean') {
    query.isActive = filters.isActive;
  }

  if (filters.search) {
    const searchRegex = new RegExp(filters.search, 'i');
    query.$or = [
      { first_name: searchRegex },
      { last_name: searchRegex },
      { email: searchRegex },
    ];
  }

  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(query),
  ]);

  return {
    users,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const updateUserRole = async (
  userId: string,
  newRole: 'admin' | 'manager' | 'farmer' | 'consumer'
): Promise<IUser> => {
  const validRoles = ['admin', 'manager', 'farmer', 'consumer'];
  if (!validRoles.includes(newRole)) {
    throw new BadRequestError(`Role không hợp lệ. Các role hợp lệ: ${validRoles.join(', ')}`);
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { role: newRole },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    throw new NotFoundError(`Không tìm thấy người dùng với ID: ${userId}`);
  }

  return user;
};

export const toggleUserStatus = async (
  userId: string,
  isActive: boolean
): Promise<IUser> => {
  const user = await User.findByIdAndUpdate(
    userId,
    { isActive },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    throw new NotFoundError(`Không tìm thấy người dùng với ID: ${userId}`);
  }

  return user;
};

export const deleteUser = async (userId: string): Promise<{ message: string }> => {
  const user = await User.findById(userId);

  if (!user) {
    throw new NotFoundError(`Không tìm thấy người dùng với ID: ${userId}`);
  }

  if (user.role === 'admin') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      throw new BadRequestError('Không thể xóa admin cuối cùng trong hệ thống');
    }
  }

  await User.findByIdAndDelete(userId);

  return { message: 'Xóa người dùng thành công' };
};

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  database: {
    status: 'connected' | 'disconnected';
    name?: string;
  };
  blockchain: {
    status: 'connected' | 'disconnected' | 'error';
    network?: string;
    blockNumber?: number;
    error?: string;
  };
  timestamp: Date;
}

export const getSystemHealth = async (): Promise<SystemHealth> => {
  const health: SystemHealth = {
    status: 'healthy',
    database: {
      status: 'disconnected',
    },
    blockchain: {
      status: 'disconnected',
    },
    timestamp: new Date(),
  };

  // Check MongoDB connection
  const dbState = mongoose.connection.readyState;
  if (dbState === 1) {
    health.database.status = 'connected';
    health.database.name = mongoose.connection.db?.databaseName;
  } else {
    health.status = 'unhealthy';
  }

  // Check blockchain connection
  try {
    const provider = getProvider();
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();

    health.blockchain.status = 'connected';
    health.blockchain.network = network.name;
    health.blockchain.blockNumber = blockNumber;
  } catch (error) {
    health.blockchain.status = 'error';
    health.blockchain.error = error instanceof Error ? error.message : 'Unknown error';
    health.status = health.database.status === 'connected' ? 'degraded' : 'unhealthy';
  }

  return health;
};
