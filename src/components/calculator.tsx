
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { X, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Calculator({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // Center the calculator on initial render
    const centerX = window.innerWidth / 2 - 160; // 160 is half of 320px width
    const centerY = window.innerHeight / 2 - 240; // 240 is half of 480px height
    setPosition({ x: centerX, y: centerY });
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (headerRef.current && headerRef.current.contains(e.target as Node)) {
        setIsDragging(true);
        dragStartPos.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        };
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStartPos.current.x,
        y: e.clientY - dragStartPos.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleButtonClick = (value: string) => {
    if (result !== null) {
      if (['+', '-', '*', '/'].includes(value)) {
        setInput(result + value);
      } else {
        setInput(value);
      }
      setResult(null);
    } else {
      setInput(input + value);
    }
  };

  const handleClear = () => {
    setInput('');
    setResult(null);
  };

  const handleBackspace = () => {
    setInput(input.slice(0, -1));
  };

  const handleCalculate = () => {
    if (input === '') return;
    try {
      // Using a safer evaluation method
      const calculatedResult = new Function('return ' + input.replace(/,/g, '').replace(/[^0-9+\-*/.]/g, ''))();
      if (isNaN(calculatedResult) || !isFinite(calculatedResult)) {
        throw new Error("Invalid calculation");
      }
      setResult(calculatedResult.toString());
    } catch (error) {
      setResult('Error');
      setInput('');
    }
  };
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.key >= '0' && e.key <= '9' || e.key === '.') {
        handleButtonClick(e.key);
      } else if (['+', '-', '*', '/'].includes(e.key)) {
        handleButtonClick(e.key);
      } else if (e.key === 'Enter' || e.key === '=') {
        handleCalculate();
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key.toLowerCase() === 'c' || e.key === 'Delete') {
        handleClear();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [input, result, onClose]);

  const buttons = [
    { label: 'C', action: handleClear, className: "bg-red-500 hover:bg-red-600 col-span-2" },
    { label: 'DEL', action: handleBackspace },
    { label: '/', action: () => handleButtonClick('/') },
    { label: '7', action: () => handleButtonClick('7') },
    { label: '8', action: () => handleButtonClick('8') },
    { label: '9', action: () => handleButtonClick('9') },
    { label: 'x', action: () => handleButtonClick('*') },
    { label: '4', action: () => handleButtonClick('4') },
    { label: '5', action: () => handleButtonClick('5') },
    { label: '6', action: () => handleButtonClick('6') },
    { label: '-', action: () => handleButtonClick('-') },
    { label: '1', action: () => handleButtonClick('1') },
    { label: '2', action: () => handleButtonClick('2') },
    { label: '3', action: () => handleButtonClick('3') },
    { label: '+', action: () => handleButtonClick('+') },
    { label: '0', action: () => handleButtonClick('0'), className: "col-span-2" },
    { label: '.', action: () => handleButtonClick('.') },
    { label: '=', action: handleCalculate },
  ];

  const getButtonClass = (label: string) => {
    if (['/', 'x', '-', '+', '='].includes(label)) {
      return "bg-orange-500 hover:bg-orange-600 font-bold";
    }
    if (label === 'C' || label === 'DEL') {
        return "bg-gray-600 hover:bg-gray-700";
    }
    return "bg-gray-700 hover:bg-gray-600";
  }
  
  const formatDisplay = (displayValue: string) => {
    if (!displayValue) return '0';
    const parts = displayValue.split(/([+\-*/])/);
    return parts.map(part => {
      if (/[+\-*/]/.test(part) || part === '') {
        return part;
      }
      if (part.includes('.')) {
        const [integer, decimal] = part.split('.');
        return `${parseFloat(integer).toLocaleString()}.${decimal}`;
      }
      return parseFloat(part).toLocaleString();
    }).join('');
  };

  return (
    <div
      ref={cardRef}
      className="fixed z-50"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onMouseDown={handleMouseDown}
    >
      <Card className="w-80 shadow-2xl bg-gray-800 text-white border-gray-700">
        <CardHeader 
            ref={headerRef}
            className={cn("flex flex-row items-center justify-between p-2 cursor-move", isDragging && "cursor-grabbing")}
        >
          <div className="flex items-center">
            <GripVertical className="h-5 w-5 text-gray-500"/>
            <span className="text-sm font-medium text-gray-400">Calculator</span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:bg-gray-700 hover:text-white" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-4">
          <div className="bg-gray-900 rounded-lg p-4 mb-4 text-right">
            <div className="text-white text-xl h-7">{formatDisplay(input) || (result !== null ? formatDisplay(result) : '0')}</div>
            <div className="text-white text-4xl font-bold h-12">{result !== null && result !== input ? formatDisplay(result) : ''}</div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {buttons.map((btn) => (
              <Button
                key={btn.label}
                onClick={btn.action}
                className={cn(
                    "text-xl h-14",
                    getButtonClass(btn.label),
                    btn.className
                )}
              >
                {btn.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    