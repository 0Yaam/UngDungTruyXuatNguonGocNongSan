import { Router } from 'express';
import {
  getBatchSnapshot,
  getBatchTransactions,
  getDecodedTransaction,
} from '../controllers/blockchain.controller';

const router = Router();

router.get('/transactions/:txHash', getDecodedTransaction);
router.get('/batches/:batchId', getBatchSnapshot);
router.get('/batches/:batchId/transactions', getBatchTransactions);

export default router;
