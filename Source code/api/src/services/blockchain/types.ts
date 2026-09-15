import type { ActionType } from '../../models/TraceEvent';

export interface BlockchainTxResult {
  txHash: string;
  blockNumber: number;
}

export interface RecordActionResult extends BlockchainTxResult {
  dataHash: string;
  actionIndex: number;
}

export interface OnChainAction {
  dataHash: string;
  actionType: number;
  timestamp: number;
  recorder: string;
}

export interface BatchHistory {
  batchId: string;
  owner: string;
  actions: OnChainAction[];
}

export interface DecodedBlockchainTransaction {
  txHash: string;
  from: string;
  to?: string;
  value: string;
  blockNumber?: number;
  timestamp?: number;
  status: 'pending' | 'confirmed' | 'failed';
  methodName?: string;
  batchId?: string;
  dataHash?: string;
  rawActionType?: number;
  actionType?: ActionType;
}

export interface IndexedBlockchainTransaction {
  kind: 'BATCH_CREATED' | 'TRACE_EVENT';
  txHash: string;
  blockNumber?: number;
  timestamp?: string;
  eventId?: string;
  eventType?: ActionType;
  dataHash?: string;
  actionIndex?: number;
  onChainStatus?: 'pending' | 'confirmed' | 'failed' | 'skipped';
}

export interface BatchBlockchainSnapshot {
  batchId: string;
  history: BatchHistory | null;
  indexedTransactions: IndexedBlockchainTransaction[];
}
