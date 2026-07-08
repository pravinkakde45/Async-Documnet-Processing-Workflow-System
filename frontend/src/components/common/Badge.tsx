import React from 'react';

interface BadgeProps {
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'FINALIZED' | string;
}

export const Badge: React.FC<BadgeProps> = ({ status }) => {
  const normalized = status?.toUpperCase() || 'QUEUED';
  
  let classes = 'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border transition-all duration-300 ';
  
  switch (normalized) {
    case 'QUEUED':
      classes += 'bg-slate-900/60 text-slate-400 border-slate-700/60';
      break;
    case 'PROCESSING':
      classes += 'bg-blue-950/30 text-blue-400 border-blue-700/50 animate-pulse glow-blue';
      break;
    case 'COMPLETED':
      classes += 'bg-emerald-950/30 text-emerald-400 border-emerald-700/50 glow-green';
      break;
    case 'FAILED':
      classes += 'bg-rose-950/30 text-rose-400 border-rose-700/50 glow-red';
      break;
    case 'FINALIZED':
      classes += 'bg-violet-950/30 text-violet-400 border-violet-700/50';
      break;
    default:
      classes += 'bg-zinc-900/60 text-zinc-400 border-zinc-800';
  }
  
  return (
    <span className={classes}>
      {normalized === 'PROCESSING' && (
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
      )}
      {normalized}
    </span>
  );
};
export default Badge;
