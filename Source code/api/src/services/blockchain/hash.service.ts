import { ethers } from 'ethers';

const canonicalize = (value: unknown): unknown => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = canonicalize((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  return value;
};

export const toCanonicalJson = (data: Record<string, unknown>): string =>
  JSON.stringify(canonicalize(data));

export const hashEventData = (data: Record<string, unknown>): string =>
  ethers.keccak256(ethers.toUtf8Bytes(toCanonicalJson(data)));
