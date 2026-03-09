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

export const generateSku = (item: { productType: string; color: string; size: string }): string => {
  const getProductCode = (productType: string): string => {
    const mappings: { [key: string]: string } = {
      'Corporate Jacket': 'CJ',
      'Executive Jacket 1': 'EJ1',
      'Executive Jacket v2 (with lines)': 'EJ2',
      'Turtle Neck Jacket': 'TNJ',
      'Reversible v1': 'R1',
      'Reversible v2': 'R2',
      'Polo Shirt (Smilee) - Cool Pass': 'PSCP',
      'Polo Shirt (Smilee) - Cotton Blend': 'PSCB',
      'Polo Shirt (Lifeline)': 'PL',
      'Polo Shirt (Blue Corner)': 'PBC',
      'Polo Shirt (Softex)': 'PS',
    };
    const productCode = mappings[productType];
    if (productCode) return productCode;
    
    return productType
      .replace(/\(.*\)/g, '')
      .split(/[\s-]+/)
      .map(w => w[0])
      .join('')
      .toUpperCase();
  };

  const getColorCode = (color: string): string => {
    const lowerCaseColor = color.toLowerCase();
    const specialColorMappings: { [key: string]: string } = {
        'green': 'GRN',
        'gold': 'GLD',
        'black': 'BLK',
        'brown': 'BRWN',
        'pink': 'PNK',
        'purple': 'PRPL',
        'sky blue': 'SKB',
        'slate blue': 'SLB',
        'oatmeal': 'OAT',
        'orange': 'ORNG'
    };

    if (specialColorMappings[lowerCaseColor]) {
        return specialColorMappings[lowerCaseColor];
    }

    return color.split(/[\s/]+/).map(w => w[0]).join('').toUpperCase();
  };

  const getSizeCode = (size: string): string => {
    switch (size) {
    case 'Medium': return 'M';
    case 'Large': return 'L';
    case 'Small': return 'S';
    default: return size;
    }
  };

  const productCode = getProductCode(item.productType);
  const colorCode = getColorCode(item.color);
  const sizeCode = getSizeCode(item.size);

  return `${productCode}-${colorCode}-${sizeCode}`;
};
