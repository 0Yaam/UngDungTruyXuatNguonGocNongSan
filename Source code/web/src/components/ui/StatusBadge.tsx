import React from 'react';

export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'verified';

const StatusBadge: React.FC<{
  children: React.ReactNode;
  tone?: StatusTone;
  dot?: boolean;
  className?: string;
}> = ({ children, tone = 'neutral', dot = false, className = '' }) => (
  <span className={`agri-status agri-status--${tone}${className ? ` ${className}` : ''}`}>
    {dot && <span className="agri-status__dot" aria-hidden="true" />}
    {children}
  </span>
);

export default StatusBadge;
