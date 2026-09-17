import Product from '../models/Product';
import TraceEvent from '../models/TraceEvent';
import { Types } from 'mongoose';

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface ProductSearchFilters {
  q?: string;
  category?: string;
  type?: 'Plant' | 'Animal';
  status?: 'draft' | 'active' | 'completed' | 'recalled';
  origin?: string;
  farming_area?: string;
  created_by?: string;
  createdFrom?: Date;
  createdTo?: Date;
}

export interface ProductSortOptions {
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export interface EventSearchFilters {
  productId?: string;
  eventType?: string;
  onChainStatus?: 'pending' | 'confirmed' | 'failed' | 'skipped';
  from?: Date;
  to?: Date;
  recorded_by?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const buildProductQuery = (filters: ProductSearchFilters) => {
  const query: Record<string, unknown> = { isDeleted: { $ne: true } };

  if (filters.q) {
    query.$text = { $search: filters.q };
  }

  if (filters.category) {
    query.category = { $regex: filters.category, $options: 'i' };
  }

  if (filters.type) {
    query.type = filters.type;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.origin) {
    query.origin = { $regex: filters.origin, $options: 'i' };
  }

  if (filters.farming_area && Types.ObjectId.isValid(filters.farming_area)) {
    query.farming_area = new Types.ObjectId(filters.farming_area);
  }

  if (filters.created_by && Types.ObjectId.isValid(filters.created_by)) {
    query.created_by = new Types.ObjectId(filters.created_by);
  }

  if (filters.createdFrom || filters.createdTo) {
    query.createdAt = {};
    if (filters.createdFrom) {
      (query.createdAt as Record<string, Date>).$gte = filters.createdFrom;
    }
    if (filters.createdTo) {
      (query.createdAt as Record<string, Date>).$lte = filters.createdTo;
    }
  }

  return query;
};

export const searchProducts = async (
  filters: ProductSearchFilters,
  pagination: PaginationOptions,
  sort: ProductSortOptions = {}
): Promise<PaginatedResult<typeof Product.prototype>> => {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const query = buildProductQuery(filters);

  const sortOptions: Record<string, 1 | -1> = {};
  if (filters.q) {
    sortOptions.score = { $meta: 'textScore' } as unknown as 1;
  }
  if (sort.sortBy) {
    sortOptions[sort.sortBy] = sort.order === 'asc' ? 1 : -1;
  } else if (!filters.q) {
    sortOptions.createdAt = -1;
  }

  let queryBuilder = Product.find(query);

  if (filters.q) {
    queryBuilder = queryBuilder.select({ score: { $meta: 'textScore' } });
  }

  const [data, total] = await Promise.all([
    queryBuilder
      .populate('created_by', 'first_name last_name email')
      .populate('farming_area', 'name location')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(query),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const searchWithFilters = async (
  filters: ProductSearchFilters,
  pagination: PaginationOptions = { page: 1, limit: 10 }
): Promise<PaginatedResult<typeof Product.prototype>> => {
  return searchProducts(filters, pagination);
};

export const getProductStats = async () => {
  const [statusStats, categoryStats, typeStats, totalCount, monthlyStats] =
    await Promise.all([
      Product.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Product.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Product.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Product.countDocuments({ isDeleted: { $ne: true } }),
      Product.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 },
      ]),
    ]);

  const byStatus = statusStats.reduce(
    (acc, item) => {
      acc[item._id] = item.count;
      return acc;
    },
    {} as Record<string, number>
  );

  const byCategory = categoryStats.map((item) => ({
    category: item._id,
    count: item.count,
  }));

  const byType = typeStats.reduce(
    (acc, item) => {
      acc[item._id] = item.count;
      return acc;
    },
    {} as Record<string, number>
  );

  const monthly = monthlyStats.map((item) => ({
    year: item._id.year,
    month: item._id.month,
    count: item.count,
  }));

  return {
    total: totalCount,
    byStatus,
    byCategory,
    byType,
    monthly,
  };
};

export const searchEvents = async (
  filters: EventSearchFilters,
  pagination: PaginationOptions
): Promise<PaginatedResult<typeof TraceEvent.prototype>> => {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};

  if (filters.productId && Types.ObjectId.isValid(filters.productId)) {
    query.product = new Types.ObjectId(filters.productId);
  }

  if (filters.eventType) {
    query.eventType = filters.eventType;
  }

  if (filters.onChainStatus) {
    query.onChainStatus = filters.onChainStatus;
  }

  if (filters.recorded_by && Types.ObjectId.isValid(filters.recorded_by)) {
    query.recorded_by = new Types.ObjectId(filters.recorded_by);
  }

  if (filters.from || filters.to) {
    query.createdAt = {};
    if (filters.from) {
      (query.createdAt as Record<string, Date>).$gte = filters.from;
    }
    if (filters.to) {
      (query.createdAt as Record<string, Date>).$lte = filters.to;
    }
  }

  const [data, total] = await Promise.all([
    TraceEvent.find(query)
      .populate('product', 'name category')
      .populate('recorded_by', 'first_name last_name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    TraceEvent.countDocuments(query),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getEventStats = async () => {
  const [eventTypeStats, onChainStatusStats, totalCount, dailyStats] =
    await Promise.all([
      TraceEvent.aggregate([
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      TraceEvent.aggregate([
        { $group: { _id: '$onChainStatus', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      TraceEvent.countDocuments(),
      TraceEvent.aggregate([
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
        { $limit: 30 },
      ]),
    ]);

  return {
    total: totalCount,
    byEventType: eventTypeStats.reduce(
      (acc, item) => {
        acc[item._id] = item.count;
        return acc;
      },
      {} as Record<string, number>
    ),
    byOnChainStatus: onChainStatusStats.reduce(
      (acc, item) => {
        acc[item._id] = item.count;
        return acc;
      },
      {} as Record<string, number>
    ),
    daily: dailyStats.map((item) => ({
      date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
      count: item.count,
    })),
  };
};
