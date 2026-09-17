import Product from '../models/Product';
import QualityInspection, {
  InspectionResult,
  InspectionType,
  IInspectionMetric,
} from '../models/QualityInspection';
import { BadRequestError, NotFoundError } from '../utils/errors';

export interface QualityInspectionInput {
  product: string;
  report_number: string;
  inspection_type: InspectionType;
  laboratory: string;
  sample_date: Date | string;
  result_date?: Date | string;
  result?: InspectionResult;
  summary?: string;
  metrics?: IInspectionMetric[];
  document_url?: string;
}

export const getAll = async (filters: {
  product?: string;
  result?: string;
  inspection_type?: string;
}) => {
  const query: Record<string, string> = {};
  if (filters.product) query.product = filters.product;
  if (filters.result) query.result = filters.result;
  if (filters.inspection_type) query.inspection_type = filters.inspection_type;

  return QualityInspection.find(query)
    .populate('product', 'name category origin status')
    .populate('created_by', 'first_name last_name')
    .sort({ sample_date: -1, createdAt: -1 });
};

export const getByProduct = async (productId: string) => {
  const product = await Product.exists({ _id: productId, isDeleted: { $ne: true } });
  if (!product) throw new NotFoundError(`Không tìm thấy lô ${productId}`);

  return QualityInspection.find({ product: productId })
    .populate('created_by', 'first_name last_name')
    .sort({ sample_date: -1, createdAt: -1 });
};

export const getForUser = async (userId: string, userRole: string) => {
  if (userRole !== 'farmer') return getAll({});
  const products = await Product.find({
    created_by: userId,
    isDeleted: { $ne: true },
  }).select('_id');
  return QualityInspection.find({
    product: { $in: products.map((product) => product._id) },
  })
    .populate('product', 'name category origin status')
    .populate('created_by', 'first_name last_name')
    .sort({ sample_date: -1, createdAt: -1 });
};

export const getById = async (id: string) => {
  const inspection = await QualityInspection.findById(id)
    .populate('product', 'name category origin status')
    .populate('created_by', 'first_name last_name');
  if (!inspection) throw new NotFoundError(`Không tìm thấy phiếu ${id}`);
  return inspection;
};

export const create = async (data: QualityInspectionInput, userId: string) => {
  const product = await Product.exists({ _id: data.product, isDeleted: { $ne: true } });
  if (!product) throw new NotFoundError(`Không tìm thấy lô ${data.product}`);

  if (!data.report_number || !data.inspection_type || !data.laboratory || !data.sample_date) {
    throw new BadRequestError('Vui lòng điền đầy đủ thông tin bắt buộc');
  }

  if (await QualityInspection.exists({ report_number: data.report_number.trim() })) {
    throw new BadRequestError('Số phiếu kiểm nghiệm đã tồn tại');
  }

  if (data.result_date && new Date(data.result_date) < new Date(data.sample_date)) {
    throw new BadRequestError('Ngày trả kết quả không được trước ngày lấy mẫu');
  }

  const inspection = await QualityInspection.create({
    ...data,
    report_number: data.report_number.trim(),
    created_by: userId,
  });
  return getById(inspection._id.toString());
};

export const update = async (
  id: string,
  data: Partial<QualityInspectionInput>
) => {
  const current = await QualityInspection.findById(id);
  if (!current) throw new NotFoundError(`Không tìm thấy phiếu ${id}`);

  if (data.report_number) {
    const duplicate = await QualityInspection.exists({
      report_number: data.report_number.trim(),
      _id: { $ne: id },
    });
    if (duplicate) throw new BadRequestError('Số phiếu kiểm nghiệm đã tồn tại');
  }

  const sampleDate = data.sample_date || current.sample_date;
  const resultDate = data.result_date || current.result_date;
  if (resultDate && new Date(resultDate) < new Date(sampleDate)) {
    throw new BadRequestError('Ngày trả kết quả không được trước ngày lấy mẫu');
  }

  await QualityInspection.findByIdAndUpdate(id, data, {
    runValidators: true,
  });
  return getById(id);
};

export const remove = async (id: string) => {
  const inspection = await QualityInspection.findByIdAndDelete(id);
  if (!inspection) throw new NotFoundError(`Không tìm thấy phiếu ${id}`);
  return inspection;
};
