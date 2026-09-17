import Product from '../models/Product';
import TraceEvent from '../models/TraceEvent';
import QualityInspection from '../models/QualityInspection';
import SupplyChainRecord from '../models/SupplyChainRecord';
import DiseaseDetection from '../models/DiseaseDetection';
import { NotFoundError } from '../utils/errors';
import { getHistoryFromChain } from './blockchain.service';

export const getPublicTrace = async (productId: string) => {
  const product = await Product.findOne({
    _id: productId,
    isDeleted: { $ne: true },
  })
    .select(
      'name category type description origin cultivation_time images qrcode status onChainBatchId farming_area initial_quantity current_quantity unit createdAt updatedAt'
    )
    .populate({
      path: 'farming_area',
      select: 'name address area_size coordinates owner certifications',
      populate: [
        {
          path: 'certifications',
          select:
            'name type certificate_number status expiry_date issuing_authority scope',
        },
        {
          path: 'owner',
          select: 'first_name last_name',
        },
      ],
    });

  if (!product) {
    throw new NotFoundError(`Không tìm thấy thông tin truy xuất ${productId}`);
  }

  const [events, qualityInspections, supplyChainRecords, diseaseDetections] =
    await Promise.all([
      TraceEvent.find({ product: productId })
        .select(
          'product batchId eventType description details images videos dataHash txHash blockNumber onChainStatus actionIndex createdAt'
        )
        .populate('recorded_by', 'first_name last_name')
        .sort({ createdAt: 1 }),
      QualityInspection.find({ product: productId })
        .select(
          'product report_number inspection_type laboratory sample_date result_date result summary metrics document_url createdAt'
        )
        .sort({ sample_date: -1 }),
      SupplyChainRecord.find({
        $or: [{ product: productId }, { related_products: productId }],
      })
        .select(
          'product related_products operation_type title description from_organization to_organization status quantity unit occurred_at location temperature humidity vehicle recall_reason metadata createdAt'
        )
        .populate('product', 'name category origin')
        .populate('related_products', 'name category origin')
        .populate('from_organization', 'name type address')
        .populate('to_organization', 'name type address')
        .sort({ occurred_at: 1 }),
      DiseaseDetection.find({ product: productId })
        .select(
          'product images candidates top_disease overall_risk model_version analysis_status inference_engine warnings createdAt'
        )
        .sort({ createdAt: -1 }),
    ]);

  let onChain = null;
  try {
    onChain = await getHistoryFromChain(product._id.toString());
  } catch (error: any) {
    console.error('Public trace blockchain getHistory failed:', error.message);
  }

  return {
    product,
    events,
    qualityInspections,
    supplyChainRecords,
    diseaseDetections,
    onChain,
  };
};
