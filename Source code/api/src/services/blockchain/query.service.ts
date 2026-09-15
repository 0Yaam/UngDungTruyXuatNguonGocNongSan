import Product from '../../models/Product';
import TraceEvent, { ACTION_TYPES, type ActionType } from '../../models/TraceEvent';
import { NotFoundError } from '../../utils/errors';
import {
  decodeTraceabilityTransaction,
  getBlockchainProvider,
  getBlockchainReadContract,
} from './client.service';
import { hashEventData } from './hash.service';
import type {
  BatchBlockchainSnapshot,
  BatchHistory,
  DecodedBlockchainTransaction,
  IndexedBlockchainTransaction,
  OnChainAction,
} from './types';

const actionTypeFromIndex = (index: number): ActionType | undefined =>
  ACTION_TYPES[index];

export const batchExistsOnChain = async (batchId: string): Promise<boolean> => {
  const contract = getBlockchainReadContract();
  return contract.batchExists(batchId);
};

export const getBatchHistoryFromChain = async (
  batchId: string
): Promise<BatchHistory> => {
  const contract = getBlockchainReadContract();
  const [owner, rawActions] = await contract.getHistory(batchId);

  const actions: OnChainAction[] = rawActions.map((action: any) => ({
    dataHash: action.dataHash,
    actionType: Number(action.actionType),
    timestamp: Number(action.timestamp),
    recorder: action.recorder,
  }));

  return { batchId, owner, actions };
};

export const verifyActionOnChain = async (
  batchId: string,
  actionIndex: number,
  eventData: Record<string, unknown>
): Promise<{ verified: boolean; dataHash: string }> => {
  const contract = getBlockchainReadContract();
  const dataHash = hashEventData(eventData);
  const verified = await contract.verifyAction(batchId, actionIndex, dataHash);

  return { verified, dataHash };
};

export const getDecodedTransactionFromChain = async (
  txHash: string
): Promise<DecodedBlockchainTransaction> => {
  const provider = getBlockchainProvider();
  const [tx, receipt] = await Promise.all([
    provider.getTransaction(txHash),
    provider.getTransactionReceipt(txHash),
  ]);

  if (!tx) {
    throw new NotFoundError(`Khong tim thay giao dich ${txHash}`);
  }

  const block =
    tx.blockNumber !== null ? await provider.getBlock(tx.blockNumber) : null;
  const parsed = decodeTraceabilityTransaction(tx.data);

  let batchId: string | undefined;
  let dataHash: string | undefined;
  let rawActionType: number | undefined;
  let actionType: ActionType | undefined;

  if (parsed?.name === 'createBatch') {
    batchId = String(parsed.args[0]);
  }

  if (parsed?.name === 'addAction') {
    batchId = String(parsed.args[0]);
    dataHash = String(parsed.args[1]);
    rawActionType = Number(parsed.args[2]);
    actionType = actionTypeFromIndex(rawActionType);
  }

  return {
    txHash,
    from: tx.from,
    to: tx.to ?? undefined,
    value: tx.value.toString(),
    blockNumber: tx.blockNumber ?? undefined,
    timestamp: block?.timestamp,
    status:
      receipt == null ? 'pending' : receipt.status === 1 ? 'confirmed' : 'failed',
    methodName: parsed?.name,
    batchId,
    dataHash,
    rawActionType,
    actionType,
  };
};

export const getIndexedTransactionsForBatch = async (
  batchId: string
): Promise<IndexedBlockchainTransaction[]> => {
  const [product, events] = await Promise.all([
    Product.findById(batchId).select('batchTxHash createdAt'),
    TraceEvent.find({
      batchId,
      txHash: { $exists: true, $ne: '' },
    })
      .select(
        '_id txHash blockNumber createdAt eventType dataHash actionIndex onChainStatus'
      )
      .sort({ createdAt: 1 })
      .lean(),
  ]);

  const transactions: IndexedBlockchainTransaction[] = [];

  if (product?.batchTxHash) {
    transactions.push({
      kind: 'BATCH_CREATED',
      txHash: product.batchTxHash,
      timestamp: product.createdAt?.toISOString(),
      onChainStatus: 'confirmed',
    });
  }

  for (const event of events) {
    transactions.push({
      kind: 'TRACE_EVENT',
      txHash: event.txHash!,
      blockNumber: event.blockNumber,
      timestamp: event.createdAt?.toISOString(),
      eventId: event._id.toString(),
      eventType: event.eventType,
      dataHash: event.dataHash,
      actionIndex: event.actionIndex,
      onChainStatus: event.onChainStatus,
    });
  }

  return transactions;
};

export const getBatchBlockchainSnapshot = async (
  batchId: string
): Promise<BatchBlockchainSnapshot> => {
  const [exists, indexedTransactions] = await Promise.all([
    batchExistsOnChain(batchId).catch(() => false),
    getIndexedTransactionsForBatch(batchId),
  ]);

  const history = exists ? await getBatchHistoryFromChain(batchId) : null;

  return {
    batchId,
    history,
    indexedTransactions,
  };
};
