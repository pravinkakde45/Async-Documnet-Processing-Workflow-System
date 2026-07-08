import React from 'react';

interface ProgressBarProps {
  progress: number;
  status?: string;
  showText?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, status = 'PROCESSING', showText = false }) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  
  let barColor = 'bg-gradient-to-r from-blue-500 to-cyan-400';
  if (status === 'COMPLETED' || status === 'FINALIZED') {
    barColor = 'bg-gradient-to-r from-emerald-500 to-teal-400';
  } else if (status === 'FAILED') {
    barColor = 'bg-gradient-to-r from-rose-500 to-red-400';
  } else if (status === 'QUEUED') {
    barColor = 'bg-slate-600';
  }
  
  return (
    <div className="w-full">
      {showText && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-slate-400">
            {status === 'FAILED' 
              ? 'Processing Error' 
              : status === 'COMPLETED' || status === 'FINALIZED'
                ? 'Completed' 
                : 'Extracting metadata...'}
          </span>
          <span className="text-xs font-bold text-slate-200">
            {clampedProgress}%
          </span>
        </div>
      )}
      <div className="w-full h-2 bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50">
        <div 
          className={`h-full ${barColor} transition-all duration-700 ease-out`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
};
export default ProgressBar;
