'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from './ui/scroll-area';
import { anniversaryData, Organization } from '@/lib/anniversaries-data';

const organizationTypes = [
  "Private Companies",
  "Government Agencies",
  "Non-Government Organizations (NGOs)",
  "Other Organizations",
];

const months = [
  { value: 'All', label: 'All Months' }, { value: '1', label: 'January' },
  { value: '2', label: 'February' }, { value: '3', label: 'March' },
  { value: '4', label: 'April' }, { value: '5', label: 'May' },
  { value: '6', label: 'June' }, { value: '7', label: 'July' },
  { value: '8', label: 'August' }, { value: '9', label: 'September' },
  { value: '10', label: 'October' }, { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export function FoundingAnniversariesList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('All');

  const filteredData = useMemo(() => {
    const lowercasedSearchTerm = searchTerm.toLowerCase();

    const filtered = anniversaryData.filter(org => {
      const matchesSearch = org.name.toLowerCase().includes(lowercasedSearchTerm);
      const matchesMonth = selectedMonth === 'All' || new Date(org.dateFounded).getMonth() + 1 === parseInt(selectedMonth);
      return matchesSearch && matchesMonth;
    });

    return organizationTypes.map(type => ({
      type,
      organizations: filtered.filter(org => org.type === type).sort((a, b) => new Date(a.dateFounded).getMonth() - new Date(b.dateFounded).getMonth()),
    }));

  }, [searchTerm, selectedMonth]);

  return (
    <Card className="w-full shadow-xl">
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Founding Anniversaries</CardTitle>
                <CardDescription>A list of Philippine organizations and their founding dates.</CardDescription>
            </div>
            <div className="flex items-center gap-4">
                <Input
                    placeholder="Search organization..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                />
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by month" />
                    </SelectTrigger>
                    <SelectContent>
                        {months.map(month => (
                            <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-20rem)]">
          <div className="space-y-8">
            {filteredData.map(({ type, organizations }) => (
                organizations.length > 0 && (
                <div key={type}>
                  <h3 className="text-xl font-semibold mb-4 text-primary border-b-2 border-primary/20 pb-2">{type}</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-1/2">Organization Name</TableHead>
                        <TableHead className="text-center">Date Founded</TableHead>
                        <TableHead className="text-center">Anniversary Month</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {organizations.map((org) => (
                        <TableRow key={org.name}>
                          <TableCell className="font-medium">{org.name}</TableCell>
                          <TableCell className="text-center">{new Date(org.dateFounded).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</TableCell>
                          <TableCell className="text-center">{new Date(org.dateFounded).toLocaleString('en-US', { month: 'long' })}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
