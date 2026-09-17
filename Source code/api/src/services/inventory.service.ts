import Product from '../models/Product';
import FarmingArea from '../models/FarmingArea';
import InventoryTransaction, {
  InventoryTransactionType,
} from '../models/InventoryTransaction';
import SupplyChainRecord from '../models/SupplyChainRecord';
import TraceEvent from '../models/TraceEvent';
import env from '../config/env';
import generateQR from '../utils/qrcode';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../utils/errors';

const EPSILON = 0.000001;

const roundQuantity = (value: number) => Math.round(value * 1_000_000) / 1_000_000;

const populateSupplyChainRecord = (query: any) =>
  query
    .populate('product', 'name category origin status current_quantity unit')
    .populate('related_products', 'name category origin status current_quantity unit')
    .populate('created_by', 'first_name last_name');

const assertPositiveQuantity = (value: unknown, field = 'Số lượng') => {
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new BadRequestError(`${field} phải lớn hơn 0`);
  }
  return roundQuantity(quantity);
};

const assertOutputWithinInput = (input: number, output: number, message: string) => {
  if (output - input > EPSILON) {
    throw new BadRequestError(message);
  }
};

const buildLossMetadata = (input: number, output: number, reason?: string) => {
  const lossQuantity = roundQuantity(Math.max(input - output, 0));
  return {
    loss_quantity: lossQuantity,
    loss_rate: input > 0 ? roundQuantity(lossQuantity / input) : 0,
    loss_reason:
      reason?.trim() ||
      (lossQuantity > EPSILON ? 'Hao hụt khi phân loại, sơ chế hoặc đóng gói' : undefined),
  };
};

const assertProductAccess = async (productId: string, userId: string, role: string) => {
  const product = await Product.findOne({ _id: productId, isDeleted: { $ne: true } });
  if (!product) throw new NotFoundError(`Không tìm thấy lô ${productId}`);
  if (role === 'farmer' && product.created_by.toString() !== userId) {
    throw new UnauthorizedError('Bạn chỉ được thao tác trên lô do mình quản lý');
  }
  return product;
};

const assertFarmingAreaAccess = async (
  farmingAreaId: string | undefined,
  userId: string,
  role: string
) => {
  if (!farmingAreaId) return;
  const farmingArea = await FarmingArea.findById(farmingAreaId);
  if (!farmingArea) throw new NotFoundError(`Không tìm thấy vùng trồng ${farmingAreaId}`);
  if (role === 'farmer' && farmingArea.owner.toString() !== userId) {
    throw new UnauthorizedError('Bạn chỉ được gắn lô vào vùng trồng của mình');
  }
};

const createTransaction = async (data: {
  product: string;
  type: InventoryTransactionType;
  quantity: number;
  unit: string;
  balance_before: number;
  balance_after: number;
  related_products?: string[];
  note?: string;
  metadata?: Record<string, unknown>;
  created_by: string;
}) =>
  InventoryTransaction.create({
    ...data,
    related_products: data.related_products || [],
  });

const createTimelineEvent = async (data: {
  product: any;
  description: string;
  details?: Record<string, unknown>;
  recorded_by: string;
}) =>
  TraceEvent.create({
    product: data.product._id,
    batchId: data.product._id.toString(),
    eventType: 'STATUS_UPDATE',
    description: data.description,
    details: data.details || {},
    images: [],
    videos: [],
    recorded_by: data.recorded_by,
    onChainStatus: 'skipped',
  });

const assignQRCode = async (product: any) => {
  const batchId = product._id.toString();
  const traceUrl = `${env.FRONTEND_URL || 'http://localhost:3000'}/trace/${batchId}`;
  product.qrcode = await generateQR(traceUrl);
  await product.save();
};

const buildChildProductPayload = (source: any, child: any, userId: string) => ({
  name: child.name || `${source.name} - lô tách`,
  category: child.category || source.category,
  type: child.type || source.type,
  description: child.description || source.description,
  origin: child.origin || source.origin,
  cultivation_time: child.cultivation_time || source.cultivation_time,
  images: child.images || source.images || [],
  live_cameras: child.live_cameras || [],
  farming_area: child.farming_area || source.farming_area,
  initial_quantity: child.quantity,
  current_quantity: child.quantity,
  unit: child.unit || source.unit || 'kg',
  parent_product: source._id,
  source_products: [source._id],
  status: child.status || 'active',
  created_by: userId,
});

export const getInventoryByProduct = async (productId: string, userId: string, role: string) => {
  const product = await assertProductAccess(productId, userId, role);
  const transactions = await InventoryTransaction.find({ product: productId })
    .populate('related_products', 'name category current_quantity unit status')
    .populate('created_by', 'first_name last_name')
    .sort({ occurred_at: -1, createdAt: -1 });

  return { product, transactions };
};

export const adjustInventory = async (
  productId: string,
  data: {
    type: 'IN' | 'OUT';
    quantity: number;
    note?: string;
  },
  userId: string,
  role: string
) => {
  const product = await assertProductAccess(productId, userId, role);
  const quantity = assertPositiveQuantity(data.quantity);
  const current = product.current_quantity || 0;
  const isOut = data.type === 'OUT';

  if (!['IN', 'OUT'].includes(data.type)) {
    throw new BadRequestError('Loại điều chỉnh tồn kho phải là IN hoặc OUT');
  }
  if (isOut && current + EPSILON < quantity) {
    throw new BadRequestError(
      `Không đủ tồn kho. Tồn hiện tại: ${current} ${product.unit || 'kg'}, yêu cầu xuất: ${quantity} ${product.unit || 'kg'}`
    );
  }

  const next = roundQuantity(isOut ? current - quantity : current + quantity);
  product.current_quantity = next;
  product.initial_quantity = product.initial_quantity || current;
  await product.save();

  const transaction = await createTransaction({
    product: product._id.toString(),
    type: isOut ? 'ADJUST_OUT' : 'ADJUST_IN',
    quantity,
    unit: product.unit || 'kg',
    balance_before: current,
    balance_after: next,
    note: data.note,
    created_by: userId,
  });

  return { product, transaction };
};

export const splitProduct = async (
  sourceProductId: string,
  data: {
    quantity: number;
    children: Array<{
      name?: string;
      category?: string;
      type?: 'Plant' | 'Animal';
      description?: string;
      origin?: string;
      cultivation_time?: string;
      farming_area?: string;
      images?: { path: string; filename: string }[];
      live_cameras?: any[];
      quantity: number;
      unit?: string;
      status?: 'draft' | 'active' | 'completed' | 'recalled';
    }>;
    note?: string;
    loss_reason?: string;
  },
  userId: string,
  role: string
) => {
  const source = await assertProductAccess(sourceProductId, userId, role);
  const splitQuantity = assertPositiveQuantity(data.quantity, 'Số lượng tách');
  const children = data.children || [];

  if (!children.length) {
    throw new BadRequestError('Vui lòng khai báo ít nhất một lô con');
  }
  if ((source.current_quantity || 0) + EPSILON < splitQuantity) {
    throw new BadRequestError(
      `Không đủ tồn để tách. Tồn hiện tại: ${source.current_quantity || 0} ${source.unit || 'kg'}`
    );
  }

  const normalizedChildren = children.map((child, index) => ({
    ...child,
    quantity: assertPositiveQuantity(child.quantity, `Số lượng lô con #${index + 1}`),
  }));
  const childrenTotal = roundQuantity(
    normalizedChildren.reduce((sum, child) => sum + child.quantity, 0)
  );
  assertOutputWithinInput(
    splitQuantity,
    childrenTotal,
    `Tổng số lượng lô con (${childrenTotal}) không được lớn hơn số lượng tách (${splitQuantity})`
  );
  const loss = buildLossMetadata(splitQuantity, childrenTotal, data.loss_reason);

  for (const child of normalizedChildren) {
    await assertFarmingAreaAccess(child.farming_area, userId, role);
    const childUnit = child.unit || source.unit || 'kg';
    if (childUnit !== (source.unit || 'kg')) {
      throw new BadRequestError('Đơn vị của lô con phải giống đơn vị lô cha');
    }
  }

  const before = source.current_quantity || 0;
  source.current_quantity = roundQuantity(before - splitQuantity);
  source.initial_quantity = source.initial_quantity || before;
  if (source.current_quantity <= EPSILON) {
    source.current_quantity = 0;
    source.status = 'completed';
  }
  await source.save();

  const createdChildren = [];
  for (const child of normalizedChildren) {
    const product = await Product.create(buildChildProductPayload(source, child, userId));
    await assignQRCode(product);
    createdChildren.push(product);
  }

  const relatedIds = createdChildren.map((product) => product._id.toString());
  const sourceTransaction = await createTransaction({
    product: source._id.toString(),
    type: 'SPLIT_OUT',
    quantity: splitQuantity,
    unit: source.unit || 'kg',
    balance_before: before,
    balance_after: source.current_quantity,
    related_products: relatedIds,
    note: data.note,
    metadata: { operation: 'SPLIT' },
    created_by: userId,
  });

  await Promise.all(
    createdChildren.map((product) =>
      createTransaction({
        product: product._id.toString(),
        type: 'SPLIT_IN',
        quantity: product.current_quantity,
        unit: product.unit || source.unit || 'kg',
        balance_before: 0,
        balance_after: product.current_quantity,
        related_products: [source._id.toString()],
        note: data.note,
        metadata: { operation: 'SPLIT' },
        created_by: userId,
      })
    )
  );

  const supplyChainRecord = await SupplyChainRecord.create({
    product: source._id,
    related_products: createdChildren.map((product) => product._id),
    operation_type: 'SPLIT',
    title: 'Tách lô',
    description: data.note || `Tách ${splitQuantity} ${source.unit || 'kg'} từ lô ${source.name}`,
    status: 'COMPLETED',
    quantity: splitQuantity,
    unit: source.unit || 'kg',
    metadata: {
      balance_check: {
        input: splitQuantity,
        output: childrenTotal,
        balanced: Math.abs(splitQuantity - childrenTotal) <= EPSILON,
        ...loss,
      },
      source: {
        product: source._id,
        balance_before: before,
        balance_after: source.current_quantity,
      },
      children: createdChildren.map((product) => ({
        product: product._id,
        quantity: product.current_quantity,
      })),
      loss,
    },
    created_by: userId,
  });
  const populatedSupplyChainRecord = await populateSupplyChainRecord(
    SupplyChainRecord.findById(supplyChainRecord._id)
  );

  await Promise.all([
    createTimelineEvent({
      product: source,
      description:
        data.note || `Tách ${splitQuantity} ${source.unit || 'kg'} từ lô ${source.name}`,
      details: {
        operation: 'SPLIT_OUT',
        quantity: splitQuantity,
        unit: source.unit || 'kg',
        balance_before: before,
        balance_after: source.current_quantity,
        children: createdChildren.map((product) => product._id.toString()),
        loss,
      },
      recorded_by: userId,
    }),
    ...createdChildren.map((product) =>
      createTimelineEvent({
        product,
        description:
          data.note ||
          `Lô được tách từ ${source.name}: ${product.current_quantity} ${product.unit || source.unit || 'kg'}`,
        details: {
          operation: 'SPLIT_IN',
          source_product: source._id.toString(),
          quantity: product.current_quantity,
          unit: product.unit || source.unit || 'kg',
        },
        recorded_by: userId,
      })
    ),
  ]);

  return {
    source,
    children: createdChildren,
    transaction: sourceTransaction,
    supplyChainRecord: populatedSupplyChainRecord,
    balance: {
      input: splitQuantity,
      output: childrenTotal,
      balanced: Math.abs(splitQuantity - childrenTotal) <= EPSILON,
      ...loss,
    },
  };
};

export const mergeProducts = async (
  data: {
    sources: Array<{ product: string; quantity?: number }>;
    target?: {
      product?: string;
      name?: string;
      category?: string;
      type?: 'Plant' | 'Animal';
      description?: string;
      origin?: string;
      cultivation_time?: string;
      farming_area?: string;
      images?: { path: string; filename: string }[];
      live_cameras?: any[];
      unit?: string;
      status?: 'draft' | 'active' | 'completed' | 'recalled';
    };
    target_quantity?: number;
    note?: string;
    loss_reason?: string;
  },
  userId: string,
  role: string
) => {
  const sources = data.sources || [];
  const mergeIntoExisting = Boolean(data.target?.product);

  if (sources.length < (mergeIntoExisting ? 1 : 2)) {
    throw new BadRequestError('Gộp lô cần ít nhất 2 lô nguồn');
  }
  const uniqueSourceIds = new Set(sources.map((source) => source.product));
  if (uniqueSourceIds.size !== sources.length) {
    throw new BadRequestError('Không được chọn trùng lô nguồn khi gộp');
  }

  const existingTarget = mergeIntoExisting
    ? await assertProductAccess(data.target!.product!, userId, role)
    : null;
  if (existingTarget && uniqueSourceIds.has(existingTarget._id.toString())) {
    throw new BadRequestError('Lô nhận gộp không được đồng thời là lô nguồn bị trừ tồn');
  }

  const sourceProducts: any[] = [];
  for (const source of sources) {
    const product = await assertProductAccess(source.product, userId, role);
    sourceProducts.push(product);
  }

  const unit = data.target?.unit || existingTarget?.unit || sourceProducts[0].unit || 'kg';
  if (existingTarget && (existingTarget.unit || 'kg') !== unit) {
    throw new BadRequestError('Lô nhận gộp phải cùng đơn vị tính với lô nguồn');
  }
  for (const product of sourceProducts) {
    if ((product.unit || 'kg') !== unit) {
      throw new BadRequestError('Các lô gộp phải cùng đơn vị tính');
    }
  }

  const quantities = sources.map((source, index) => {
    const available = sourceProducts[index].current_quantity || 0;
    const quantity =
      source.quantity === undefined
        ? available
        : assertPositiveQuantity(source.quantity, `Số lượng lô nguồn #${index + 1}`);
    if (available + EPSILON < quantity) {
      throw new BadRequestError(
        `Lô ${sourceProducts[index].name} không đủ tồn. Tồn hiện tại: ${available} ${unit}`
      );
    }
    return quantity;
  });

  const totalInput = roundQuantity(quantities.reduce((sum, quantity) => sum + quantity, 0));
  const targetQuantity =
    data.target_quantity === undefined
      ? totalInput
      : assertPositiveQuantity(data.target_quantity, 'Số lượng lô sau gộp');
  assertOutputWithinInput(
    totalInput,
    targetQuantity,
    `Số lượng lô sau gộp (${targetQuantity}) không được lớn hơn tổng số lượng lô nguồn (${totalInput})`
  );
  const loss = buildLossMetadata(totalInput, targetQuantity, data.loss_reason);

  const first = sourceProducts[0];
  await assertFarmingAreaAccess(data.target?.farming_area, userId, role);
  const targetBefore = existingTarget?.current_quantity || 0;
  const targetProduct =
    existingTarget ||
    (await Product.create({
      name: data.target?.name || `${first.name} - lô gộp`,
      category: data.target?.category || first.category,
      type: data.target?.type || first.type,
      description: data.target?.description || first.description,
      origin: data.target?.origin || first.origin,
      cultivation_time: data.target?.cultivation_time || first.cultivation_time,
      images: data.target?.images || first.images || [],
      live_cameras: data.target?.live_cameras || [],
      farming_area: data.target?.farming_area || first.farming_area,
      initial_quantity: targetQuantity,
      current_quantity: targetQuantity,
      unit,
      source_products: sourceProducts.map((product) => product._id),
      status: data.target?.status || 'active',
      created_by: userId,
    }));

  if (existingTarget) {
    if (data.target?.name?.trim()) targetProduct.name = data.target.name.trim();
    targetProduct.current_quantity = roundQuantity(targetBefore + targetQuantity);
    targetProduct.initial_quantity = targetProduct.initial_quantity || targetBefore;
    targetProduct.source_products = Array.from(
      new Set([
        ...(targetProduct.source_products || []).map((id: any) => id.toString()),
        ...sourceProducts.map((product) => product._id.toString()),
      ])
    ) as any;
    await targetProduct.save();
  } else {
    await assignQRCode(targetProduct);
  }

  await Promise.all(
    sourceProducts.map(async (product, index) => {
      const before = product.current_quantity || 0;
      product.current_quantity = roundQuantity(before - quantities[index]);
      if (product.current_quantity <= EPSILON) {
        product.current_quantity = 0;
        product.status = 'completed';
      }
      await product.save();
      return createTransaction({
        product: product._id.toString(),
        type: 'MERGE_OUT',
        quantity: quantities[index],
        unit,
        balance_before: before,
        balance_after: product.current_quantity,
        related_products: [targetProduct._id.toString()],
        note: data.note,
        metadata: { operation: 'MERGE' },
        created_by: userId,
      });
    })
  );

  const targetTransaction = await createTransaction({
    product: targetProduct._id.toString(),
    type: 'MERGE_IN',
    quantity: targetQuantity,
    unit,
    balance_before: targetBefore,
    balance_after: existingTarget ? targetProduct.current_quantity : targetQuantity,
    related_products: sourceProducts.map((product) => product._id.toString()),
    note: data.note,
    metadata: { operation: 'MERGE' },
    created_by: userId,
  });

  const supplyChainRecord = await SupplyChainRecord.create({
    product: targetProduct._id,
    related_products: sourceProducts.map((product) => product._id),
    operation_type: 'MERGE',
    title: 'Gộp lô',
    description: data.note || `Gộp ${sources.length} lô vào ${targetProduct.name}`,
    status: 'COMPLETED',
    quantity: targetQuantity,
    unit,
    metadata: {
      balance_check: {
        input: totalInput,
        output: targetQuantity,
        balanced: Math.abs(totalInput - targetQuantity) <= EPSILON,
        ...loss,
      },
      target: {
        product: targetProduct._id,
        quantity: targetQuantity,
        balance_before: targetBefore,
        balance_after: existingTarget ? targetProduct.current_quantity : targetQuantity,
        mode: existingTarget ? 'MERGE_INTO_EXISTING' : 'CREATE_MERGED_BATCH',
      },
      sources: sourceProducts.map((product, index) => ({
        product: product._id,
        quantity: quantities[index],
      })),
      loss,
    },
    created_by: userId,
  });
  const populatedSupplyChainRecord = await populateSupplyChainRecord(
    SupplyChainRecord.findById(supplyChainRecord._id)
  );

  await Promise.all([
    createTimelineEvent({
      product: targetProduct,
      description: data.note || `Gộp ${sources.length} lô vào ${targetProduct.name}`,
      details: {
        operation: 'MERGE_IN',
        quantity: targetQuantity,
        unit,
        balance_before: targetBefore,
        balance_after: existingTarget ? targetProduct.current_quantity : targetQuantity,
        sources: sourceProducts.map((product, index) => ({
          product: product._id.toString(),
          quantity: quantities[index],
        })),
        loss,
      },
      recorded_by: userId,
    }),
    ...sourceProducts.map((product, index) =>
      createTimelineEvent({
        product,
        description:
          data.note ||
          `Gộp ${quantities[index]} ${unit} từ ${product.name} vào ${targetProduct.name}`,
        details: {
          operation: 'MERGE_OUT',
          target_product: targetProduct._id.toString(),
          quantity: quantities[index],
          unit,
          balance_after: product.current_quantity,
          completed: product.status === 'completed',
        },
        recorded_by: userId,
      })
    ),
  ]);

  return {
    target: targetProduct,
    sources: sourceProducts,
    transaction: targetTransaction,
    supplyChainRecord: populatedSupplyChainRecord,
    balance: {
      input: totalInput,
      output: targetQuantity,
      balanced: Math.abs(totalInput - targetQuantity) <= EPSILON,
      ...loss,
    },
  };
};

export const recallProduct = async (
  productId: string,
  data: {
    quantity?: number;
    reason: string;
    note?: string;
    occurred_at?: string | Date;
    location?: string;
    status?: 'IN_PROGRESS' | 'COMPLETED';
  },
  userId: string,
  role: string
) => {
  const product = await assertProductAccess(productId, userId, role);
  const reason = data.reason?.trim();
  if (!reason) {
    throw new BadRequestError('Vui lòng nhập lý do thu hồi');
  }

  const before = product.current_quantity || 0;
  const quantity =
    data.quantity === undefined ? before : assertPositiveQuantity(data.quantity, 'Số lượng thu hồi');
  if (before + EPSILON < quantity) {
    throw new BadRequestError(
      `Không đủ tồn để thu hồi. Tồn hiện tại: ${before} ${product.unit || 'kg'}`
    );
  }

  const after = roundQuantity(before - quantity);
  product.current_quantity = after;
  product.status = 'recalled';
  await product.save();

  const transaction = await createTransaction({
    product: product._id.toString(),
    type: 'RECALL_OUT',
    quantity,
    unit: product.unit || 'kg',
    balance_before: before,
    balance_after: after,
    note: data.note || reason,
    metadata: {
      operation: 'RECALL',
      recall_reason: reason,
      location: data.location,
    },
    created_by: userId,
  });

  const supplyChainRecord = await SupplyChainRecord.create({
    product: product._id,
    related_products: [],
    operation_type: 'RECALL',
    title: 'Thu hồi lô',
    description: data.note || reason,
    status: data.status || 'IN_PROGRESS',
    quantity,
    unit: product.unit || 'kg',
    occurred_at: data.occurred_at || new Date(),
    location: data.location,
    recall_reason: reason,
    metadata: {
      balance_check: {
        input: before,
        output: after,
        recalled: quantity,
        balanced: roundQuantity(after + quantity) === roundQuantity(before),
      },
      product: {
        product: product._id,
        balance_before: before,
        balance_after: after,
        status: product.status,
      },
    },
    created_by: userId,
  });
  const populatedSupplyChainRecord = await populateSupplyChainRecord(
    SupplyChainRecord.findById(supplyChainRecord._id)
  );

  return {
    product,
    transaction,
    supplyChainRecord: populatedSupplyChainRecord,
    balance: {
      input: before,
      output: after,
      recalled: quantity,
      balanced: roundQuantity(after + quantity) === roundQuantity(before),
    },
  };
};
