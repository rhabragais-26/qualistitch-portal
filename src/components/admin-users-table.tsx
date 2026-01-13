'use client';

import React, { useState, useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, doc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { formatDateTime } from '@/lib/utils';


type UserProfile = {
  uid: string;
  firstName: string;
  lastName: string;
  nickname: string;
  email: string;
  role: 'admin' | 'user';
  lastModified?: string;
};

export function AdminUsersTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const usersQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'));
  }, [firestore]);

  const { data: users, isLoading, error } = useCollection<UserProfile>(usersQuery);

  const handleRoleChange = async (uid: string, newRole: 'admin' | 'user') => {
    if (!firestore) return;
    const userDocRef = doc(firestore, 'users', uid);
    try {
      await updateDoc(userDocRef, { role: newRole });
      toast({
        title: 'Role Updated',
        description: `User role has been successfully changed to ${newRole}.`,
      });
    } catch (e: any) {
      console.error('Error updating role:', e);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: e.message || "Could not update the user's role.",
      });
    }
  };

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(user =>
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  return (
    <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-black">User Management</CardTitle>
            <CardDescription className="text-gray-600">
              View and manage user roles.
            </CardDescription>
          </div>
          <div className="w-full max-w-sm">
            <Input
              placeholder="Search by name, nickname, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-100 text-black placeholder:text-gray-500"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <div className="border rounded-md h-full">
          <Table>
            <TableHeader className="bg-neutral-800 sticky top-0 z-10">
              <TableRow>
                <TableHead className="text-white font-bold align-middle">Name</TableHead>
                <TableHead className="text-white font-bold align-middle">Nickname</TableHead>
                <TableHead className="text-white font-bold align-middle">Email</TableHead>
                <TableHead className="text-white font-bold align-middle">Role</TableHead>
                <TableHead className="text-white font-bold align-middle text-center">Last Modified</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-destructive">
                    Error loading users: {error.message}
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <TableRow key={user.uid}>
                    <TableCell className="font-medium">{`${user.firstName} ${user.lastName}`}</TableCell>
                    <TableCell>{user.nickname}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(newRole: 'admin' | 'user') => handleRoleChange(user.uid, newRole)}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue>
                             <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center text-xs">
                        {user.lastModified ? formatDateTime(user.lastModified).dateTimeShort : '-'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
