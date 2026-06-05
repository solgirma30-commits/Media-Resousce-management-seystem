import { useMemo } from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  X,
  Download
} from 'lucide-react';
import { 
  startOfWeek, 
  endOfWeek, 
  format, 
} from 'date-fns';

interface WeeklyReportProps {
  requests: any[];
  workforce: any[];
  onClose: () => void;
}

export function WeeklyReport({ requests, workforce, onClose }: WeeklyReportProps) {
  const weeklyData = useMemo(() => {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });

    const totalThisWeek = requests.filter(r => {
      const createdAt = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
      return createdAt >= start && createdAt <= end;
    }).length;

    const completedThisWeek = requests.filter(r => {
      const updatedAt = r.updatedAt?.toDate ? r.updatedAt.toDate() : r.updatedAt ? new Date(r.updatedAt) : new Date();
      return (r.status === 'CONFIRMED' || r.status === 'CLOSED' || r.status === 'COMPLETED' || r.status === 'EXITED' || r.status === 'RETURNED') && updatedAt >= start && updatedAt <= end;
    }).length;

    const taskList = requests.map(r => {
        const createdAt = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
        const updatedAt = r.updatedAt?.toDate ? r.updatedAt.toDate() : r.updatedAt ? new Date(r.updatedAt) : new Date();
        const duration = Math.round((updatedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60)); // In hours
        
        const technician = workforce.find(w => w.id === r.assignedTechnicianId || w.id === r.assignedDriverId);
        
        return {
            id: r.id,
            dept: r.departmentName || 'General',
            assignee: technician?.displayName || r.securityPersonnelName || r.requesterName || r.directorName || 'Unassigned',
            description: r.description || r.itemName || r.visitorNames || 'No description',
            status: r.status || 'PENDING',
            statusLabel: (r.status === 'CONFIRMED' || r.status === 'CLOSED' || r.status === 'COMPLETED' || r.status === 'EXITED' || r.status === 'RETURNED') ? 'Completed' : 'Pending',
            duration: duration > 0 ? `${duration}h` : '<1h'
        }
    });

    return {
      totalThisWeek,
      completedThisWeek,
      taskList
    };
  }, [requests, workforce]);

  const handleExport = () => {
      const doc = new jsPDF();
      doc.text("Weekly Intelligence Report", 14, 15);
      autoTable(doc, {
        head: [['Department', 'Assignee', 'Task', 'Status', 'Duration']],
        body: weeklyData.taskList.map(t => [t.dept, t.assignee, t.description, t.statusLabel, t.duration]),
        startY: 25,
      });
      doc.save('weekly-report.pdf');
    };

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
              <h2 className="text-2xl font-black text-black tracking-tight">Weekly Intelligence Report</h2>
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
              </div>
              <p className="text-3xl font-mono font-bold text-black tracking-tighter">{weeklyData.totalThisWeek.toString().padStart(2, '0')}</p>
              <p className="text-[10px] font-black text-dark-text-subtle mt-1 uppercase tracking-widest">Requests Logged</p>
            </div>

            <div className="bg-dark-main p-6 rounded-2xl border border-dark-border">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-mono font-bold text-black tracking-tighter">{weeklyData.completedThisWeek.toString().padStart(2, '0')}</p>
              <p className="text-[10px] font-black text-dark-text-subtle mt-1 uppercase tracking-widest">Resolutions Confirmed</p>
            </div>

            <div className="bg-dark-main p-6 rounded-2xl border border-dark-border">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-mono font-bold text-black tracking-tighter">
                {Math.round((weeklyData.completedThisWeek / (weeklyData.totalThisWeek || 1)) * 100)}%
              </p>
              <p className="text-[10px] font-black text-dark-text-subtle mt-1 uppercase tracking-widest">Resolution Velocity</p>
            </div>
          </div>

          <div className="bg-dark-main p-8 rounded-3xl border border-dark-border flex flex-col">
              <h3 className="text-xs font-black text-dark-text-subtle uppercase tracking-[0.2em] mb-8">Task Overview</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-dark-border">
                      <th className="pb-4 text-[10px] font-black text-dark-text-muted uppercase tracking-widest px-2">Department</th>
                      <th className="pb-4 text-[10px] font-black text-dark-text-muted uppercase tracking-widest px-2">Assignee</th>
                      <th className="pb-4 text-[10px] font-black text-dark-text-muted uppercase tracking-widest px-2">Task</th>
                      <th className="pb-4 text-[10px] font-black text-dark-text-muted uppercase tracking-widest px-2">Status</th>
                      <th className="pb-4 text-[10px] font-black text-dark-text-muted uppercase tracking-widest px-2">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border/50">
                    {weeklyData.taskList.map((task, idx) => (
                      <tr key={idx} className="group hover:bg-dark-sidebar/30 transition-colors">
                        <td className="py-4 px-2 text-[11px] text-black font-semibold">{task.dept}</td>
                        <td className="py-4 px-2 text-[11px] text-black font-semibold">{task.assignee}</td>
                        <td className="py-4 px-2 text-[11px] text-black font-semibold truncate max-w-xs">{task.description}</td>
                        <td className="py-4 px-2 text-[11px] font-bold uppercase">
                          <span className={task.statusLabel === 'Completed' ? "text-emerald-600" : "text-amber-600"}>
                            {task.statusLabel}
                          </span>
                        </td>
                        <td className="py-4 px-2 text-[11px] text-dark-text-subtle font-mono">{task.duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
        </div>

        <div className="p-8 bg-dark-card/80 border-t border-dark-border flex items-center justify-between">
          <p className="text-[10px] font-black text-dark-text-subtle uppercase tracking-widest">Global Intelligence Report: Active</p>
          <div className="flex gap-2">
            <button onClick={handleExport} className="bg-dark-accent hover:bg-dark-accent/90 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95">
              <Download className="w-3.5 h-3.5" />
              Export PDF
            </button>
            <button onClick={onClose} className="bg-white hover:bg-slate-200 text-dark-main px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95">
              Dismiss
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
