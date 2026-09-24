import React from 'react';

interface BadgeProps {
  variant?: 'green' | 'blue' | 'red' | 'yellow' | 'gray';
  children: React.ReactNode;
  count?: number;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'gray', children, count }) => {
  const variantClasses = {
    green: 'bg-green-100 text-green-700',
    blue: 'bg-blue-100 text-blue-700',
    red: 'bg-red-100 text-red-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    gray: 'bg-slate-100 text-slate-700',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${variantClasses[variant]}`}>
      {children}
      {count !== undefined && <span className="ml-1 font-bold">{count}</span>}
    </span>
  );
};

interface StatusBadgeProps {
  status: 'sent' | 'scheduled' | 'failed' | 'processing';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const statusConfig = {
    sent: { icon: '✓', color: '#10B981', label: 'Sent' },
    scheduled: { icon: '⏱', color: '#3B82F6', label: 'Scheduled' },
    failed: { icon: '✗', color: '#EF4444', label: 'Failed' },
    processing: { icon: '⌛', color: '#F59E0B', label: 'Processing' },
  };

  const config = statusConfig[status];
  const sizeClass = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center text-white font-bold`}
      style={{ backgroundColor: config.color }}
      title={config.label}
    >
      {config.icon}
    </div>
  );
};
