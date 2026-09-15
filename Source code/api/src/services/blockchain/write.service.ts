import type { ActionType } from '../../models/TraceEvent';
import { ACTION_TYPES } from '../../models/TraceEvent';
import { hashEventData } from './hash.service';
import { getBlockchainReadContract, getBlockchainWriteContract } from './client.service';
import type { BlockchainTxResult, RecordActionResult } from './types';

export const createBatchOnChain = async (
  batchId: string
): Promise<BlockchainTxResult> => {
  const contract = getBlockchainWriteContract();
  const tx = await contract.createBatch(batchId);
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
};

export const recordActionOnChain = async (
  batchId: string,
  eventData: Record<string, unknown>,
  eventType: ActionType
): Promise<RecordActionResult> => {
  const contract = getBlockchainWriteContract();
  const dataHash = hashEventData(eventData);
  const actionTypeIndex = ACTION_TYPES.indexOf(eventType);

  const tx = await contract.addAction(batchId, dataHash, actionTypeIndex);
  const receipt = await tx.wait();

  const readonlyContract = getBlockchainReadContract();
  const count = await readonlyContract.getActionCount(batchId);
  const actionIndex = Number(count) - 1;

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    dataHash,
    actionIndex,
  };
};
