import { useState } from 'react';
import { toast } from 'react-hot-toast';

export function RequestPasswordModal({ isOpen, onClose, onAuthenticated }: { isOpen: boolean, onClose: () => void, onAuthenticated: () => void }) {
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '123456') { // Simple password as requested
      onAuthenticated();
      setPassword('');
      onClose();
    } else {
      toast.error('Incorrect password');
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-dark-main/90 backdrop-blur-md" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative p-8 bg-white shadow-xl rounded-2xl border border-slate-100 max-w-sm w-full">
        <h2 className="text-xl font-bold mb-6 text-slate-800">Enter Authorization Password</h2>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full px-4 py-3 rounded-lg border border-slate-200 mb-6 text-sm"
          required
        />
        <div className="flex gap-4">
          <button type="button" onClick={onClose} className="w-full bg-slate-100 text-slate-700 py-3 rounded-lg font-bold">
            Cancel
          </button>
          <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold">
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}
