
'use client';

import * as React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { X, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getProductGroup, getUnitPrice, EmbroideryOption } from '@/lib/pricing';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ScrollArea } from './ui/scroll-area';

const productTypes = [
    'Executive Jacket 1', 'Executive Jacket v2 (with lines)', 'Turtle Neck Jacket',
    'Reversible v1', 'Reversible v2', 'Corporate Jacket'
];

const quantityTiers = [1, 4, 11, 51, 201, 301, 1000];

export function ItemPricesDialog({ onClose, onDraggingChange }: { onClose: () => void; onDraggingChange: (isDragging: boolean) => void; }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    onDraggingChange(isDragging);
  }, [isDragging, onDraggingChange]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (cardRef.current) {
        const { offsetWidth, offsetHeight } = cardRef.current;
        const centerX = window.innerWidth / 2 - offsetWidth / 2;
        const centerY = window.innerHeight / 2 - offsetHeight / 2;
        setPosition({ x: centerX, y: centerY });
    } else {
        const centerX = window.innerWidth / 2 - 400; // approx half-width
        const centerY = window.innerHeight / 2 - 300; // approx half-height
        setPosition({ x: centerX, y: centerY });
    }
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (headerRef.current?.contains(e.target as Node)) {
        setIsDragging(true);
        dragStartPos.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        };
    }
  }, [position.x, position.y]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStartPos.current.x,
        y: e.clientY - dragStartPos.current.y,
      });
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

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
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={cardRef}
      className={cn("fixed z-50", isDragging && "select-none")}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onMouseDown={handleMouseDown}
    >
      <Card className="w-[800px] h-[600px] shadow-2xl bg-gray-800 text-white border-gray-700 flex flex-col">
        <CardHeader 
            ref={headerRef}
            className={cn("flex flex-row items-center justify-between p-2 cursor-move", isDragging && "cursor-grabbing")}
        >
          <div className="flex items-center">
            <GripVertical className="h-5 w-5 text-gray-500"/>
            <span className="text-sm font-medium text-gray-400">Item Prices</span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:bg-gray-700 hover:text-white" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-4 flex-1">
            <ScrollArea className="h-full">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="text-white">Product Type</TableHead>
                        <TableHead className="text-white">Embroidery</TableHead>
                        {quantityTiers.map(tier => <TableHead key={tier} className="text-white text-center">{tier}+</TableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {productTypes.map(product => (
                        <React.Fragment key={product}>
                            <TableRow>
                                <TableCell rowSpan={2} className="font-bold align-middle">{product}</TableCell>
                                <TableCell>Logo Only</TableCell>
                                {quantityTiers.map(tier => <TableCell key={tier} className="text-center">{getUnitPrice(product, tier, 'logo')}</TableCell>)}
                            </TableRow>
                             <TableRow>
                                <TableCell>Logo + Back Text</TableCell>
                                {quantityTiers.map(tier => <TableCell key={tier} className="text-center">{getUnitPrice(product, tier, 'logoAndText')}</TableCell>)}
                            </TableRow>
                        </React.Fragment>
                    ))}
                </TableBody>
            </Table>
            </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
