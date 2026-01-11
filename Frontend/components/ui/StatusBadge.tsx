import React from 'react';
import { ComplianceStatus, LoanStatus } from '../../types';

interface StatusBadgeProps {
  status: ComplianceStatus | LoanStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  let colorClass = 'bg-slate-800 text-slate-300 border-slate-700';

  switch (status) {
    case ComplianceStatus.Compliant:
    case LoanStatus.Active:
      colorClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      break;
    case ComplianceStatus.AtRisk:
      colorClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      break;
    case ComplianceStatus.Breached:
      colorClass = 'bg-red-500/10 text-red-400 border-red-500/20';
      break;
    case ComplianceStatus.Upcoming:
    case LoanStatus.Pending:
      colorClass = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      break;
    case ComplianceStatus.Waived:
      colorClass = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      break;
  }

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center justify-center rounded-full border font-medium ${colorClass} ${sizeClass}`}>
      {status}
    </span>
  );
};
