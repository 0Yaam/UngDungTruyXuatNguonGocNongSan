import { getBlockchainReadContract } from './blockchain/client.service';

export {
  batchExistsOnChain,
  createBatchOnChain,
  getBatchHistoryFromChain,
  getBatchHistoryFromChain as getHistoryFromChain,
  getBatchBlockchainSnapshot,
  getDecodedTransactionFromChain,
  getIndexedTransactionsForBatch,
  hashEventData,
  hashEventDataLegacy,
  recordActionOnChain,
  verifyActionOnChain,
} from './blockchain';

export const assertContractDeployed = async (): Promise<void> => {
  const contract = getBlockchainReadContract();
  const code = await contract.runner?.provider?.getCode(await contract.getAddress());
  if (!code || code === '0x') {
    throw new Error(
      'Không tìm thấy smart contract tại CONTRACT_ADDRESS. Hãy bật/deploy lại blockchain local và restart API.'
    );
  }
};
