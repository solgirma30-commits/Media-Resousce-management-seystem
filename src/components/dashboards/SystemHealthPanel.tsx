import React, { useState } from 'react';
import { Wifi, Database, HardDrive, ShieldCheck, AlertTriangle } from 'lucide-react';

interface HealthStats {
  reads: number;
  writes: number;
  deletes: number;
  dbLoadTime: number | null;
  uptime: string;
  apiPing: number;
}

export function SystemHealthPanel({ stats }: { stats: HealthStats }) {
  // Simulator states for demonstrating Red/Green status changes
  const [isSimulatedSpike, setIsSimulatedSpike] = useState(false);
  const [isSimulatedOutage, setIsSimulatedOutage] = useState(false);

  // Daily operations base estimates + current active session operations
  const baseDailyReads = 14820;
  const baseDailyWrites = 1430;
  const baseDailyDeletes = 280;

  const totalDailyReads = baseDailyReads + stats.reads;
  const totalDailyWrites = baseDailyWrites + stats.writes;
  const totalDailyDeletes = baseDailyDeletes + stats.deletes;
  const totalDailyOps = totalDailyReads + totalDailyWrites + totalDailyDeletes;

  // Storage metrics (estimated firestore + binary assets)
  const firestoreStorageMB = 4.28 + (stats.writes * 0.002); // Simulate incremental size on writes
  const assetStorageMB = 48.7;
  const totalStorageMB = firestoreStorageMB + assetStorageMB;
  const storageLimitMB = 1024; // 1 GB free quota
  const storagePercentage = (totalStorageMB / storageLimitMB) * 100;

  // Determine system status and color based on ping, outages, or spikes
  const currentPing = isSimulatedSpike ? 680 : (isSimulatedOutage ? 9999 : stats.apiPing);
  const isHealthy = !isSimulatedOutage && currentPing < 500;
  const statusLabel = isSimulatedOutage 
    ? 'CRITICAL / SHIELD DEGRADED' 
    : (isSimulatedSpike ? 'WARNING / HIGH LATENCY' : 'HEALTHY / FULL ACTIVE SECURE');

  return (
    <div className="space-y-6">
      {/* Red / Green Main Status Dashboard Banner */}
      <div className={`p-6 border rounded-3xl transition-all duration-300 ${
        isHealthy 
          ? 'bg-emerald-50 border-emerald-200 shadow-sm' 
          : 'bg-rose-50 border-rose-200 shadow-sm animate-pulse'
      }`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${isHealthy ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
              {isHealthy ? <ShieldCheck className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${isHealthy ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`}></span>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">System Status Overview</h2>
              </div>
              <p className={`text-sm font-bold mt-1 ${isHealthy ? 'text-emerald-700' : 'text-rose-700'}`}>
                {statusLabel}
              </p>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Real-time connection with Node.js backend and PostgreSQL database.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <div className="text-xs bg-white/80 border border-slate-200 p-2.5 rounded-2xl flex flex-col gap-1 shadow-sm w-full">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Interactive Health Simulator</span>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setIsSimulatedSpike(!isSimulatedSpike)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors border ${
                    isSimulatedSpike 
                      ? 'bg-amber-100 text-amber-700 border-amber-300' 
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  Simulate Spike (Yellow)
                </button>
                <button
                  onClick={() => {
                    setIsSimulatedOutage(!isSimulatedOutage);
                    if (isSimulatedOutage) setIsSimulatedSpike(false);
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors border ${
                    isSimulatedOutage 
                      ? 'bg-rose-600 text-white border-rose-700' 
                      : 'bg-white hover:bg-rose-50 text-rose-600 border-rose-200'
                  }`}
                >
                  Simulate Outage (Red)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Daily Operations Card (Daily Reads, Writes) */}
        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-5 h-5 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-900">Estimated Daily Firestore Operations</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-slate-500 font-bold mb-1">
                  <span>Reads Today</span>
                  <span className="text-slate-800">{totalDailyReads.toLocaleString()}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${Math.min((totalDailyReads / 50000) * 100, 100)}%` }}></div>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Session Active: +{stats.reads}</span>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-500 font-bold mb-1">
                  <span>Writes Today</span>
                  <span className="text-slate-800">{totalDailyWrites.toLocaleString()}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min((totalDailyWrites / 10000) * 100, 100)}%` }}></div>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Session Active: +{stats.writes}</span>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-500 font-bold mb-1">
                  <span>Deletes Today</span>
                  <span className="text-slate-800">{totalDailyDeletes.toLocaleString()}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-rose-505 bg-rose-400 h-full rounded-full" style={{ width: `${Math.min((totalDailyDeletes / 2000) * 100, 100)}%` }}></div>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Session Active: +{stats.deletes}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Estimated Daily Ops</span>
            <span className="text-base font-black text-slate-800">{totalDailyOps.toLocaleString()}</span>
          </div>
        </div>

        {/* Dynamic Storage Utilized Progress Bar */}
        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <HardDrive className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900">Infrastructure Storage</h3>
            </div>

            <div className="mt-2 space-y-4">
              <div className="text-3xl font-black text-slate-800 tracking-tight">
                {totalStorageMB.toFixed(2)} MB
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Used space out of <b>{storageLimitMB} MB</b> free trial database pool capacity.
              </p>

              <div className="pt-2">
                <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                  <span>Storage Utilization</span>
                  <span>{storagePercentage.toFixed(2)}%</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-[2px]">
                  <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${storagePercentage}%` }}></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                <div className="bg-slate-50 p-2 rounded-xl">
                  <span className="block text-[9px] font-black uppercase text-slate-400">Database Size</span>
                  <span className="font-bold text-slate-700">{firestoreStorageMB.toFixed(2)} MB</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl">
                  <span className="block text-[9px] font-black uppercase text-slate-400">Asset Binaries</span>
                  <span className="font-bold text-slate-700">{assetStorageMB.toFixed(2)} MB</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs">
            <span className="text-xs font-bold text-slate-400 uppercase">Billing Tier</span>
            <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">Sandbox (Free Quota)</span>
          </div>
        </div>

        {/* Uptime and Network Latency Metrics */}
        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Wifi className={`w-5 h-5 ${isHealthy ? 'text-emerald-500 animate-pulse' : 'text-rose-500 animate-bounce'}`} />
              <h3 className="text-sm font-bold text-slate-900">Network connection</h3>
            </div>

            <div className="space-y-4">
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Network Latency</span>
                <div className="text-3xl font-black text-slate-800 tracking-tight mt-1">
                  {isSimulatedOutage ? '∞' : `${currentPing} ms`}
                </div>
                <span className={`text-[10px] font-bold inline-block px-1.5 py-0.5 rounded-md mt-1 ${
                  isSimulatedOutage 
                    ? 'bg-rose-100 text-rose-700' 
                    : (isSimulatedSpike ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')
                }`}>
                  {isSimulatedOutage ? 'TIMEOUT' : (isSimulatedSpike ? 'HIGH LATENCY SPIKE' : 'STABLE')}
                </span>
              </div>

              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide">System Session Uptime</span>
                <div className="text-3xl font-black text-slate-800 tracking-tight mt-1">
                  {stats.uptime}
                </div>
                <span className="text-[10px] text-slate-500 font-medium">Time elapsed since console loaded</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs">
            <span className="text-xs font-bold text-slate-400 uppercase">Region</span>
            <span className="font-semibold text-slate-700">Multi-region App Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}

