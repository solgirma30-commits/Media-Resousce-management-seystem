import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
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
      // Writing to a general updates collection that we can have portals subscribe to
      await addDoc(collection(db, 'department_updates'), {
        department,
        message,
        createdAt: serverTimestamp(),
        sender: 'DIRECTOR_ADMIN'
      });
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
        <option value="PROP_CASUALTY">Property & Casualty Laborer</option>
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
