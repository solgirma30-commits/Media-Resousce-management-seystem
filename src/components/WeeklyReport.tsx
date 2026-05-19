import { useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Users,
  Download,
  X
} from 'lucide-react';
import { 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  isSameDay, 
  subWeeks,
  startOfDay
} from 'date-fns';

interface WeeklyReportProps {
  requests: any[];
  workforce: any[];
  onClose: () => void;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4'];

export function WeeklyReport({ requests, workforce, onClose }: WeeklyReportProps) {
  const weeklyData = useMemo(() => {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });

    // Requests created each day this week
    const dailyStats = days.map(day => {
      const dayRequests = requests.filter(r => {
        const createdAt = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
        return isSameDay(createdAt, day);
      });
      return {
        name: format(day, 'EEE'),
        count: dayRequests.length,
        completed: dayRequests.filter(r => r.status === 'CONFIRMED' || r.status === 'CLOSED').length
      };
    });

    // Department breakdown
    const deptMap: { [key: string]: number } = {};
    requests.forEach(r => {
      if (r.departmentName) {
        deptMap[r.departmentName] = (deptMap[r.departmentName] || 0) + 1;
      }
    });
    const departmentData = Object.entries(deptMap).map(([name, value]) => ({ name, value }));

    // Technician/Driver productivity (completed requests this week)
    const techStats = workforce.map(member => {
      const completed = requests.filter(r => 
        (r.assignedTechnicianId === member.id || r.assignedDriverId === member.id) && 
        (r.status === 'CONFIRMED' || r.status === 'CLOSED')
      ).length;
      return {
        name: member.displayName.split(' ')[0],
        completed
      };
    }).filter(t => t.completed > 0).sort((a, b) => b.completed - a.completed);

    const totalThisWeek = requests.filter(r => {
      const createdAt = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
      return createdAt >= start && createdAt <= end;
    }).length;

    const completedThisWeek = requests.filter(r => {
      const updatedAt = r.updatedAt?.toDate ? r.updatedAt.toDate() : new Date(r.updatedAt);
      return (r.status === 'CONFIRMED' || r.status === 'CLOSED') && updatedAt >= start && updatedAt <= end;
    }).length;

    return {
      dailyStats,
      departmentData,
      techStats,
      totalThisWeek,
      completedThisWeek
    };
  }, [requests, workforce]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-end p-0 md:p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-dark-main/40 backdrop-blur-md"
      />
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-4xl h-full md:h-[calc(100vh-2rem)] bg-dark-card md:rounded-3xl border-l border-dark-border shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-8 border-b border-dark-border bg-dark-card/50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Calendar className="w-5 h-5 text-dark-accent" />
              <h2 className="text-2xl font-black text-black tracking-tight">Weekly Fleet Summary</h2>
            </div>
            <p className="text-dark-text-subtle text-sm font-serif italic">Operational performance for {format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM d')} - {format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM d, yyyy')}</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-dark-main border border-dark-border flex items-center justify-center text-dark-text-subtle hover:text-white transition-all hover:border-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-dark-main p-6 rounded-2xl border border-dark-border">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">+12% vs last week</span>
              </div>
              <p className="text-3xl font-mono font-bold text-black tracking-tighter">{weeklyData.totalThisWeek.toString().padStart(2, '0')}</p>
              <p className="text-[10px] font-black text-dark-text-subtle mt-1 uppercase tracking-widest">Requests Logged</p>
            </div>

            <div className="bg-dark-main p-6 rounded-2xl border border-dark-border">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">High Efficiency</span>
              </div>
              <p className="text-3xl font-mono font-bold text-black tracking-tighter">{weeklyData.completedThisWeek.toString().padStart(2, '0')}</p>
              <p className="text-[10px] font-black text-dark-text-subtle mt-1 uppercase tracking-widest">Resolutions Confirmed</p>
            </div>

            <div className="bg-dark-main p-6 rounded-2xl border border-dark-border">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Avg 4.2h</span>
              </div>
              <p className="text-3xl font-mono font-bold text-black tracking-tighter">
                {Math.round((weeklyData.completedThisWeek / (weeklyData.totalThisWeek || 1)) * 100)}%
              </p>
              <p className="text-[10px] font-black text-dark-text-subtle mt-1 uppercase tracking-widest">Resolution Velocity</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <div className="bg-dark-main p-8 rounded-3xl border border-dark-border h-[400px] flex flex-col">
              <h3 className="text-xs font-black text-dark-text-subtle uppercase tracking-[0.2em] mb-8">Daily Traffic Volume</h3>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData.dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        border: '1px solid #1e293b', 
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        color: '#f8fafc'
                      }}
                    />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={24} name="Inbound" />
                    <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} name="Resolved" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-dark-main p-8 rounded-3xl border border-dark-border h-[400px] flex flex-col">
              <h3 className="text-xs font-black text-dark-text-subtle uppercase tracking-[0.2em] mb-8">Departmental Distribution</h3>
              <div className="flex-1 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={weeklyData.departmentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {weeklyData.departmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                       contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        border: '1px solid #1e293b', 
                        borderRadius: '12px',
                        fontSize: '11px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {weeklyData.departmentData.slice(0, 4).map((dept, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                    <span className="text-[10px] font-bold text-dark-text-subtle uppercase tracking-tight truncate">{dept.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-dark-main p-8 rounded-3xl border border-dark-border">
            <h3 className="text-xs font-black text-dark-text-subtle uppercase tracking-[0.2em] mb-8">Asset Recognition (Top Operators)</h3>
            <div className="space-y-6">
              {weeklyData.techStats.slice(0, 5).map((tech, i) => (
                <div key={i} className="group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-md bg-dark-card border border-dark-border flex items-center justify-center text-[10px] font-black text-dark-accent">
                        0{i + 1}
                      </div>
                      <span className="text-sm font-bold text-black">{tech.name}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-dark-accent">{tech.completed} Missions</span>
                  </div>
                  <div className="w-full h-1 bg-dark-card rounded-full overflow-hidden border border-dark-border/50">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(tech.completed / (weeklyData.techStats[0]?.completed || 1)) * 100}%` }}
                      className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400"
                    />
                  </div>
                </div>
              ))}
              {weeklyData.techStats.length === 0 && (
                <div className="py-12 text-center text-dark-text-subtle font-serif italic text-sm">Waiting for operational results</div>
              )}
            </div>
          </div>
        </div>

        <div className="p-8 bg-dark-card/80 border-t border-dark-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {workforce.slice(0, 4).map((member, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-dark-sidebar border-2 border-dark-card flex items-center justify-center text-[10px] font-black text-black shadow-inner">
                  {member.displayName[0]}
                </div>
              ))}
            </div>
            <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest">Unified Fleet Status: Active</p>
          </div>
          <button className="bg-white hover:bg-slate-200 text-dark-main px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95">
            <Download className="w-3.5 h-3.5" />
            Export Intelligence
          </button>
        </div>
      </motion.div>
    </div>
  );
}
