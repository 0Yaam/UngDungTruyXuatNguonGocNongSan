import Product from '../models/Product';
import InventoryTransaction from '../models/InventoryTransaction';
import SupplyChainOrganization from '../models/SupplyChainOrganization';
import SupplyChainRecord, {
  SupplyChainOperation,
  SupplyChainStatus,
} from '../models/SupplyChainRecord';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../utils/errors';

const populateRecord = (query: any) => query
  .populate('product', 'name category origin status')
  .populate('related_products', 'name category origin status')
  .populate('from_organization', 'name type address')
  .populate('to_organization', 'name type address')
  .populate('created_by', 'first_name last_name');

export const getOrganizations = async () =>
  SupplyChainOrganization.find({}).populate('created_by', 'first_name last_name').sort({ name: 1 });

export const createOrganization = async (data: any, userId: string) => {
  if (!data.name || !data.type || !data.address) {
    throw new BadRequestError('Vui lòng nhập tên, loại và địa chỉ tổ chức');
  }
  return SupplyChainOrganization.create({
    ...data,
    tax_code: data.tax_code?.trim() || undefined,
    created_by: userId,
  });
};

export const updateOrganization = async (id: string, data: any) => {
  if ('tax_code' in data) data.tax_code = data.tax_code?.trim() || undefined;
  const organization = await SupplyChainOrganization.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!organization) throw new NotFoundError(`Không tìm thấy tổ chức ${id}`);
  return organization;
};

export const deleteOrganization = async (id: string) => {
  const used = await SupplyChainRecord.exists({
    $or: [{ from_organization: id }, { to_organization: id }],
  });
  if (used) throw new BadRequestError('Không thể xóa tổ chức đã có lịch sử giao dịch');
  const organization = await SupplyChainOrganization.findByIdAndDelete(id);
  if (!organization) throw new NotFoundError(`Không tìm thấy tổ chức ${id}`);
};

export const getRecords = async (filters: any = {}) => {
  const query: Record<string, unknown> = {};
  if (filters.operation_type) query.operation_type = filters.operation_type;
  if (filters.status) query.status = filters.status;
  if (filters.product) {
    query.$or = [{ product: filters.product }, { related_products: filters.product }];
  }
  return populateRecord(SupplyChainRecord.find(query)).sort({ occurred_at: -1 });
};

export const getRecordsByProduct = async (productId: string) => {
  if (!(await Product.exists({ _id: productId, isDeleted: { $ne: true } }))) {
    throw new NotFoundError(`Không tìm thấy lô ${productId}`);
  }
  return populateRecord(SupplyChainRecord.find({
    $or: [{ product: productId }, { related_products: productId }],
  })).sort({ occurred_at: 1 });
};

export const getProductLineage = async (productId: string) => {
  const product = await Product.findOne({ _id: productId, isDeleted: { $ne: true } })
    .populate('parent_product', 'name category origin status current_quantity unit')
    .populate('source_products', 'name category origin status current_quantity unit')
    .populate('created_by', 'first_name last_name');

  if (!product) {
    throw new NotFoundError(`Không tìm thấy lô ${productId}`);
  }

  const [derivedProducts, transactions, records] = await Promise.all([
    Product.find({
      isDeleted: { $ne: true },
      $or: [{ parent_product: productId }, { source_products: productId }],
    })
      .select('name category origin status current_quantity unit parent_product source_products createdAt')
      .sort({ createdAt: 1 })
      .lean(),
    InventoryTransaction.find({ product: productId })
      .populate('related_products', 'name category origin status current_quantity unit')
      .populate('created_by', 'first_name last_name')
      .sort({ occurred_at: 1, createdAt: 1 })
      .lean(),
    populateRecord(
      SupplyChainRecord.find({
        $or: [{ product: productId }, { related_products: productId }],
      })
    )
      .sort({ occurred_at: 1 })
      .lean(),
  ]);

  return {
    product,
    parent: product.parent_product || null,
    sources: product.source_products || [],
    derivedProducts,
    transactions,
    records,
  };
};

const assertProductAccess = async (productId: string, userId: string, role: string) => {
  const product = await Product.findOne({ _id: productId, isDeleted: { $ne: true } }).select('created_by');
  if (!product) throw new NotFoundError(`Không tìm thấy lô ${productId}`);
  if (role === 'farmer' && product.created_by.toString() !== userId) {
    throw new UnauthorizedError('Bạn chỉ được thao tác trên lô do mình quản lý');
  }
};

const validateOperation = (data: any) => {
  if (['SPLIT', 'MERGE', 'RECALL'].includes(data.operation_type)) {
    throw new BadRequestError(
      'Vui lòng dùng chức năng tách/gộp/thu hồi lô chuyên dụng để hệ thống tự cân bằng tồn kho và liên kết lô'
    );
  }
  if (data.operation_type === 'TRANSFER' && (!data.from_organization || !data.to_organization)) {
    throw new BadRequestError('Bàn giao cần đơn vị giao và đơn vị nhận');
  }
};

export const createRecord = async (data: {
  product: string;
  related_products?: string[];
  operation_type: SupplyChainOperation;
  title: string;
  description?: string;
  from_organization?: string;
  to_organization?: string;
  status?: SupplyChainStatus;
  quantity?: number;
  unit?: string;
  occurred_at?: string | Date;
  location?: string;
  temperature?: number;
  humidity?: number;
  vehicle?: string;
  driver?: string;
  recall_reason?: string;
  metadata?: Record<string, unknown>;
}, userId: string, role: string) => {
  if (!data.product || !data.operation_type || !data.title) {
    throw new BadRequestError('Vui lòng nhập lô, loại nghiệp vụ và tiêu đề');
  }
  await assertProductAccess(data.product, userId, role);
  if (data.related_products?.length) {
    const relatedQuery: Record<string, unknown> = {
      _id: { $in: data.related_products },
      isDeleted: { $ne: true },
    };
    if (role === 'farmer') relatedQuery.created_by = userId;
    const count = await Product.countDocuments(relatedQuery);
    if (count !== data.related_products.length) throw new BadRequestError('Có lô liên quan không tồn tại');
  }
  validateOperation(data);
  const record = await SupplyChainRecord.create({ ...data, created_by: userId });
  return populateRecord(SupplyChainRecord.findById(record._id));
};

export const updateRecord = async (id: string, data: any, userId: string, role: string) => {
  const current = await SupplyChainRecord.findById(id);
  if (!current) throw new NotFoundError(`Không tìm thấy hồ sơ ${id}`);
  if (['SPLIT', 'MERGE', 'RECALL'].includes(current.operation_type)) {
    throw new BadRequestError(
      'Hồ sơ tách/gộp/thu hồi được sinh tự động từ tồn kho và không thể sửa trực tiếp'
    );
  }
  await assertProductAccess(current.product.toString(), userId, role);
  if (data.related_products?.length) {
    const relatedQuery: Record<string, unknown> = {
      _id: { $in: data.related_products },
      isDeleted: { $ne: true },
    };
    if (role === 'farmer') relatedQuery.created_by = userId;
    const count = await Product.countDocuments(relatedQuery);
    if (count !== data.related_products.length) {
      throw new BadRequestError('Có lô liên quan không tồn tại hoặc không thuộc quyền quản lý');
    }
  }
  validateOperation({ ...current.toObject(), ...data });
  await SupplyChainRecord.findByIdAndUpdate(id, data, { runValidators: true });
  return populateRecord(SupplyChainRecord.findById(id));
};

export const deleteRecord = async (id: string) => {
  const record = await SupplyChainRecord.findByIdAndDelete(id);
  if (!record) throw new NotFoundError(`Không tìm thấy hồ sơ ${id}`);
};
