import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format as dfFormat } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: any, formatStr: string = 'PPpp'): string {
  if (!date) return 'N/A';
  
  try {
    let d: Date;
    
    if (date instanceof Date) {
      d = date;
    } else if (typeof date === 'object' && 'seconds' in date) {
      d = new Date(date.seconds * 1000);
    } else if (typeof date === 'number') {
      d = new Date(date);
    } else {
      d = new Date(date);
    }
    
    if (isNaN(d.getTime())) return 'N/A';
    return dfFormat(d, formatStr);
  } catch (e) {
    return 'N/A';
  }
}
