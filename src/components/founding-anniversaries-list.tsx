
'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from './ui/scroll-area';
import { anniversaryData, Organization } from '@/lib/anniversaries-data';
import { format } from 'date-fns';

const organizationTypes = ['All', ...[...new Set(anniversaryData.map(org => org.type))].sort()];
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
  const [selectedType, setSelectedType] = useState('All');
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [selectedIndustry, setSelectedIndustry] = useState('All');
  const [selectedSubDepartment, setSelectedSubDepartment] = useState('All');

  const countries = useMemo(() => {
    const allCountries = [...new Set(anniversaryData.map(org => org.countryOfOrigin))].sort();
    return ['All', ...allCountries];
  }, []);

  const industries = useMemo(() => {
    const allIndustries = [...new Set(anniversaryData.map(org => org.industry))].sort();
    return ['All', ...allIndustries];
  }, []);

  const subDepartments = useMemo(() => {
    const allSubDepartments = [...new Set(anniversaryData.map(org => org.subDepartment))].sort();
    return ['All', ...allSubDepartments];
  }, []);


  const filteredData = useMemo(() => {
    const lowercasedSearchTerm = searchTerm.toLowerCase();

    return anniversaryData.filter(org => {
      const matchesSearch = org.name.toLowerCase().includes(lowercasedSearchTerm) || org.industry.toLowerCase().includes(lowercasedSearchTerm);
      const matchesMonth = selectedMonth === 'All' || new Date(org.dateFounded).getUTCMonth() + 1 === parseInt(selectedMonth);
      const matchesType = selectedType === 'All' || org.type === selectedType;
      const matchesCountry = selectedCountry === 'All' || org.countryOfOrigin === selectedCountry;
      const matchesIndustry = selectedIndustry === 'All' || org.industry === selectedIndustry;
      const matchesSubDepartment = selectedSubDepartment === 'All' || org.subDepartment === selectedSubDepartment;
      return matchesSearch && matchesMonth && matchesType && matchesCountry && matchesIndustry && matchesSubDepartment;
    }).sort((a,b) => new Date(a.dateFounded).getTime() - new Date(b.dateFounded).getTime());
  }, [searchTerm, selectedMonth, selectedType, selectedCountry, selectedIndustry, selectedSubDepartment]);

  return (
    <Card className="w-full shadow-xl">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <CardTitle>Founding Anniversaries</CardTitle>
                <CardDescription>A list of Philippine organizations and their founding dates.</CardDescription>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:items-center gap-2 w-full sm:w-auto">
                <Input
                    placeholder="Search name or industry..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full lg:w-48"
                />
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-full lg:w-[140px]">
                        <SelectValue placeholder="Filter by month" />
                    </SelectTrigger>
                    <SelectContent>
                        {months.map(month => (
                            <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="w-full lg:w-[180px]">
                        <SelectValue placeholder="Filter by Type" />
                    </SelectTrigger>
                    <SelectContent>
                        {organizationTypes.map(type => (
                            <SelectItem key={type} value={type}>{type === 'All' ? 'All Types' : type}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={selectedSubDepartment} onValueChange={setSelectedSubDepartment}>
                    <SelectTrigger className="w-full lg:w-[180px]">
                        <SelectValue placeholder="Filter by Sub-Department" />
                    </SelectTrigger>
                    <SelectContent>
                        {subDepartments.map(sub => (
                            <SelectItem key={sub} value={sub}>{sub === 'All' ? 'All Sub-Departments' : sub}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                    <SelectTrigger className="w-full lg:w-[180px]">
                        <SelectValue placeholder="Filter by Industry" />
                    </SelectTrigger>
                    <SelectContent>
                        {industries.map(industry => (
                            <SelectItem key={industry} value={industry}>{industry === 'All' ? 'All Industries' : industry}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                    <SelectTrigger className="w-full lg:w-[160px]">
                        <SelectValue placeholder="Filter by Country" />
                    </SelectTrigger>
                    <SelectContent>
                        {countries.map(country => (
                            <SelectItem key={country} value={country}>{country === 'All' ? 'All Countries' : country}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-20rem)]">
            <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead className="w-1/4">Organization Name</TableHead>
                    <TableHead>Industry/Sector</TableHead>
                    <TableHead>Organization Type</TableHead>
                    <TableHead>Sub-Department</TableHead>
                    <TableHead>Country of Origin</TableHead>
                    <TableHead className="text-center">Date Founded (Global)</TableHead>
                    <TableHead className="text-center">PH Operations Start</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredData.map((org, index) => (
                    <TableRow key={`${org.name}-${index}`}>
                        <TableCell className="font-medium">{org.name}</TableCell>
                        <TableCell>{org.industry}</TableCell>
                        <TableCell>{org.type}</TableCell>
                        <TableCell>{org.subDepartment}</TableCell>
                        <TableCell>{org.countryOfOrigin}</TableCell>
                        <TableCell className="text-center">{format(new Date(org.dateFounded), 'MMMM d, yyyy')}</TableCell>
                        <TableCell className="text-center">{org.phStart ? format(new Date(org.phStart), 'yyyy') : '-'}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
            </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

    