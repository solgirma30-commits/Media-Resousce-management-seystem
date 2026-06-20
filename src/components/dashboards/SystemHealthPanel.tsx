import React from 'react';
import { Activity, Wifi, Database } from 'lucide-react';

interface HealthStats {
  reads: number;
  writes: number;
  deletes: number;
  dbLoadTime: number | null;
  uptime: string;
  apiPing: number;
}

export function SystemHealthPanel({ stats }: { stats: HealthStats }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-5 h-5 text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-900">Firestore Operations</h3>
          </div>
          <div className="text-3xl font-black text-slate-800 tracking-tight">
            {stats.reads + stats.writes + stats.deletes}
          </div>
          <div className="text-xs text-slate-500 font-medium">Total Ops (Reads: {stats.reads}, Writes: {stats.writes})</div>
        </div>
        
        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Wifi className="w-5 h-5 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900">Network Latency (Ping)</h3>
          </div>
          <div className="text-3xl font-black text-slate-800 tracking-tight">{stats.apiPing}ms</div>
          <div className="text-xs text-slate-500 font-medium">Regional Edge Node Status: Operational</div>
        </div>
        
        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5 text-rose-500" />
            <h3 className="text-sm font-bold text-slate-900">Service Uptime</h3>
          </div>
          <div className="text-3xl font-black text-slate-800 tracking-tight">{stats.uptime}</div>
          <div className="text-xs text-slate-500 font-medium">Session duration since boot</div>
        </div>
      </div>
    </div>
  );
}
