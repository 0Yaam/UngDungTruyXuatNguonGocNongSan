import React from 'react';

interface Props {
  status: 'confirmed' | 'pending' | 'failed' | 'skipped' | string;
  txHash?: string;
}

const BlockchainBadge: React.FC<Props> = ({ status, txHash }) => {
  const config = {
    confirmed: { label: '✅ Đã xác minh trên Blockchain', color: '#16a34a', bg: '#f0fdf4' },
    pending: { label: '⏳ Đang chờ xác nhận', color: '#ca8a04', bg: '#fefce8' },
    failed: { label: '❌ Ghi blockchain thất bại', color: '#dc2626', bg: '#fef2f2' },
    skipped: { label: '⚪ Chưa ghi lên Blockchain', color: '#475569', bg: '#f1f5f9' },
  };
  const c = config[status as keyof typeof config] || {
    label: `ℹ️ Trạng thái: ${status}`,
    color: '#475569',
    bg: '#f1f5f9',
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderRadius: 16, backgroundColor: c.bg, color: c.color, fontSize: 13 }}>
      <span>{c.label}</span>
      {txHash && (
        <a
          href={`https://amoy.polygonscan.com/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: c.color, fontSize: 12, fontFamily: 'monospace' }}
        >
          {txHash.slice(0, 10)}...
        </a>
      )}
    </div>
  );
};

export default BlockchainBadge;
