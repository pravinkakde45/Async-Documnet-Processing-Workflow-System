import React from 'react';
import { NavLink } from 'react-router-dom';
import { FileText, Upload, LayoutDashboard, Wifi, WifiOff } from 'lucide-react';

interface NavbarProps {
  wsConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ wsConnected }) => {
  return (
    <nav className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-6 py-4 flex items-center justify-between">
      {/* Brand logo & title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
          <FileText size={20} className="animate-pulse" />
        </div>
        <div>
          <span className="font-bold text-lg text-white tracking-wide block">DocuFlow</span>
          <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase block">Async Processor</span>
        </div>
      </div>

      {/* Navigation routes */}
      <div className="flex items-center gap-3 md:gap-6">
        <NavLink 
          to="/" 
          className={({ isActive }) => 
            `flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-all ${
              isActive 
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/25' 
                : 'text-slate-400 hover:text-white hover:bg-slate-850 border border-transparent'
            }`
          }
        >
          <LayoutDashboard size={16} />
          <span className="hidden sm:inline">Dashboard</span>
        </NavLink>
        
        <NavLink 
          to="/upload" 
          className={({ isActive }) => 
            `flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-all ${
              isActive 
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/25' 
                : 'text-slate-400 hover:text-white hover:bg-slate-850 border border-transparent'
            }`
          }
        >
          <Upload size={16} />
          <span className="hidden sm:inline">Upload Files</span>
        </NavLink>
      </div>

      {/* WS Online / Offline live feed badge */}
      <div className="flex items-center gap-2 bg-slate-900/60 px-3.5 py-1.5 rounded-full border border-slate-850 text-xs">
        {wsConnected ? (
          <>
            <Wifi size={14} className="text-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-medium hidden md:inline">Live Sync Active</span>
            <span className="text-emerald-400 font-medium md:hidden">Live</span>
          </>
        ) : (
          <>
            <WifiOff size={14} className="text-rose-400" />
            <span className="text-rose-400 font-medium hidden md:inline">Offline (Reconnecting)</span>
            <span className="text-rose-400 font-medium md:hidden">Offline</span>
          </>
        )}
      </div>
    </nav>
  );
};
export default Navbar;
