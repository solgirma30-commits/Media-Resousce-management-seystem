import React, { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { toast } from 'react-hot-toast';
import { Send } from 'lucide-react';

export function TeamNotepad({ defaultDepartment = 'SERVICE' }: { defaultDepartment?: string }) {
  const [department, setDepartment] = useState(defaultDepartment);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setDepartment(defaultDepartment);
  }, [defaultDepartment]);

  const sendUpdate = async () => {
    if (!message) return;
    try {
      const response = await fetch('/api/department-updates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          department,
          message,
          sender: 'DIRECTOR_ADMIN'
        })
      });

      if (!response.ok) throw new Error('Failed to send update');

      toast.success(`Update sent to ${department} team`);
      setMessage('');
    } catch (e) {
      toast.error('Failed to send update');
    }
  };

  return (
    <div className="p-6 bg-dark-card border border-dark-border rounded-xl shadow-lg">
      <h3 className="text-xs font-black uppercase text-dark-text-muted mb-4 flex items-center gap-2">
        <Send className="w-4 h-4" /> Team Notepad
      </h3>
      <select 
        value={department} 
        onChange={(e) => setDepartment(e.target.value)}
        className="w-full bg-dark-main border border-dark-border rounded-lg p-2.5 text-white mb-3 text-xs font-bold"
      >
        <option value="SERVICE">Service & Repair</option>
        <option value="CAMERA">Camera</option>
        <option value="VEHICLE">Transportation</option>
        <option value="PROP_CASUALTY">Property Service</option>
      </select>
      <textarea 
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="w-full bg-dark-main border border-dark-border rounded-lg p-3 text-white mb-3 h-24 text-sm focus:outline-none focus:border-dark-accent"
        placeholder="Enter update for team..."
      />
      <button 
        onClick={sendUpdate}
        className="w-full bg-dark-accent text-white py-2.5 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-dark-accent/90 transition-all"
      >
        Send Update
      </button>
    </div>
  );
}
