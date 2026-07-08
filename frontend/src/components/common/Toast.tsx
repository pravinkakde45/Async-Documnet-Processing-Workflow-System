import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  text: string;
}

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  let icon = <Info size={18} className="text-blue-400" />;
  let borderColor = 'border-blue-500/20';
  let shadowColor = 'shadow-blue-500/5';
  
  if (toast.type === 'success') {
    icon = <CheckCircle size={18} className="text-emerald-400" />;
    borderColor = 'border-emerald-500/25';
    shadowColor = 'shadow-emerald-500/5';
  } else if (toast.type === 'error') {
    icon = <AlertCircle size={18} className="text-rose-400" />;
    borderColor = 'border-rose-500/25';
    shadowColor = 'shadow-rose-500/5';
  } else if (toast.type === 'warning') {
    icon = <AlertTriangle size={18} className="text-amber-400" />;
    borderColor = 'border-amber-500/25';
    shadowColor = 'shadow-amber-500/5';
  }

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border glass-panel ${borderColor} bg-slate-900/90 shadow-xl ${shadowColor} min-w-[280px] max-w-sm transition-all duration-300 animate-in fade-in slide-in-from-bottom-4`}>
      <div className="mt-0.5">{icon}</div>
      <span className="text-sm text-slate-200 font-medium flex-1">{toast.text}</span>
      <button 
        onClick={() => onClose(toast.id)}
        className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
};

export default ToastContainer;
