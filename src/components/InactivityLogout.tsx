import { useEffect } from 'react';
import { useAuth } from '../App';

export function InactivityLogout() {
  const { logout } = useAuth();
  
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const resetTimeout = () => {
      clearTimeout(timeout);
      // Auto-logout after 5 minutes of inactivity
      timeout = setTimeout(logout, 5 * 60 * 1000); 
    };
    
    // Add event listeners for inactivity
    window.addEventListener('mousemove', resetTimeout);
    window.addEventListener('keydown', resetTimeout);
    resetTimeout();
    
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', resetTimeout);
      window.removeEventListener('keydown', resetTimeout);
    };
  }, [logout]);
  
  return null;
}
