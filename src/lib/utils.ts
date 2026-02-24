import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatDateTime = (isoString: string) => {
    if (!isoString) return { dateTime: '-', dayOfWeek: '-', dateTimeShort: '-' };
    try {
        const date = new Date(isoString);
        
        const phTimeOptions: Intl.DateTimeFormatOptions = {
            timeZone: 'Asia/Manila',
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        };

        const formatter = new Intl.DateTimeFormat('en-US', phTimeOptions);
        const parts = formatter.formatToParts(date);
        
        const find = (type: string) => parts.find(p => p.type === type)?.value || '';

        const month = find('month');
        const day = find('day');
        const year = find('year');
        const hour = find('hour');
        const minute = find('minute');
        const dayPeriod = find('dayPeriod').toUpperCase().replace(/\s/g, ''); // AM/PM

        const dateTime = `${month}-${day}-${year} ${hour}:${minute} ${dayPeriod}`;
        const dateTimeShort = `${month}-${day} ${hour}:${minute} ${dayPeriod}`;
        
        const dayOfWeek = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'Asia/Manila' }).format(date);

        return {
          dateTime,
          dayOfWeek,
          dateTimeShort,
        }

    } catch (e) {
        console.error("Error formatting date:", isoString, e);
        return { dateTime: 'Invalid Date', dayOfWeek: '-', dateTimeShort: 'Invalid Date' };
    }
};

export const toTitleCase = (str: string) => {
    if (!str) return '';
    return str
        .split(' ')
        .map(word => {
            if (word.length > 1 && word === word.toUpperCase()) {
                return word;
            }
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
};

export const formatCurrency = (value: number, options?: Intl.NumberFormatOptions) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', ...options }).format(value);
};

export const formatJoNumber = (joNumber: number | undefined): string => {
    if (!joNumber) return 'N/A';
    const currentYear = new Date().getFullYear().toString().slice(-2);
    return `QSBP-${currentYear}-${joNumber.toString().padStart(5, '0')}`;
};
