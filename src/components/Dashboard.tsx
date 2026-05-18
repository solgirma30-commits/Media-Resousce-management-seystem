import { useAuth, UserRole } from '../App';
import { AdminDashboard } from './dashboards/AdminDashboard';
import { DeptDirectorDashboard } from './dashboards/DeptDirectorDashboard';
import { TechnicianDashboard } from './dashboards/TechnicianDashboard';
import { SecurityDashboard } from './dashboards/SecurityDashboard';

export function Dashboard() {
  const { profile } = useAuth();

  if (!profile) return null;

  switch (profile.role) {
    case UserRole.ADMIN:
      return <AdminDashboard />;
    case UserRole.DEPT_DIRECTOR:
      return <DeptDirectorDashboard />;
    case UserRole.TECHNICIAN:
    case UserRole.DRIVER:
    case UserRole.CAMERAMAN:
      return <TechnicianDashboard />;
    case UserRole.SECURITY:
      return <SecurityDashboard />;
    default:
      return (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl shadow-sm border border-slate-100">
          <p className="text-slate-500">Access denied or role not recognized.</p>
        </div>
      );
  }
}
