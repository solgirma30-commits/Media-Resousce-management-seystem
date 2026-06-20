import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

export function RequestPasswordModal({ isOpen, onClose, onAuthenticated, expectedPassword = '654' }: { isOpen: boolean, onClose: () => void, onAuthenticated: () => void, expectedPassword?: string | string[] }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    const isMatched = Array.isArray(expectedPassword)
      ? expectedPassword.some(p => password === p)
      : password === expectedPassword;

    if (isMatched) {
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
      <div className="relative p-8 bg-white shadow-xl rounded-2xl border border-slate-100 max-w-sm w-full">
        <h2 className="text-xl font-bold mb-6 text-slate-800">Enter Authorization Password</h2>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSubmit(e);
              }
            }}
            placeholder="Password"
            className="w-full px-4 py-3 rounded-lg border border-slate-200 mb-6 text-sm pr-10"
            required
          />
          <button
            type="button"
            className="absolute right-3 top-3.5 text-slate-400 hover:text-black"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex gap-4">
          <button type="button" onClick={onClose} className="w-full bg-slate-100 text-slate-700 py-3 rounded-lg font-bold">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold">
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
