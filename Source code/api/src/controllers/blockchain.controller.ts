import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as blockchainService from '../services/blockchain';

export const getDecodedTransaction = async (req: Request, res: Response) => {
  const transaction = await blockchainService.getDecodedTransactionFromChain(
    req.params.txHash
  );

  res.status(StatusCodes.OK).json({ transaction });
};

export const getBatchSnapshot = async (req: Request, res: Response) => {
  const batch = await blockchainService.getBatchBlockchainSnapshot(
    req.params.batchId
  );

  res.status(StatusCodes.OK).json({ batch });
};

export const getBatchTransactions = async (req: Request, res: Response) => {
  const transactions = await blockchainService.getIndexedTransactionsForBatch(
    req.params.batchId
  );

  res.status(StatusCodes.OK).json({
    batchId: req.params.batchId,
    transactions,
    count: transactions.length,
  });
};
