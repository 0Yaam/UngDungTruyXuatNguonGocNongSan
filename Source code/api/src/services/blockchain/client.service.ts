import { ethers } from 'ethers';
import env from '../../config/env';
import {
  getContract,
  getProvider,
  getReadonlyContract,
  getSigner,
} from '../../config/blockchain';
import traceabilityABI from '../../../abi/Traceability.json';

const traceabilityInterface = new ethers.Interface(traceabilityABI);

export const isBlockchainWriteConfigured = (): boolean =>
  Boolean(env.CONTRACT_ADDRESS && env.BLOCKCHAIN_PRIVATE_KEY);

export const isBlockchainReadConfigured = (): boolean =>
  Boolean(env.CONTRACT_ADDRESS && env.BLOCKCHAIN_RPC_URL);

export const getBlockchainProvider = () => getProvider();

export const getBlockchainSigner = () => getSigner();

export const getBlockchainWriteContract = () => getContract();

export const getBlockchainReadContract = () => getReadonlyContract();

export const decodeTraceabilityTransaction = (data: string) => {
  if (!data || data === '0x') {
    return null;
  }

  try {
    return traceabilityInterface.parseTransaction({ data });
  } catch {
    return null;
  }
};
