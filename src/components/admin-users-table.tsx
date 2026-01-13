
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { formatDateTime } from '@/lib/utils';
import { Button } from './ui/button';
import { Save, Trash2, ChevronDown } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';
import { UserPosition } from '@/lib/permissions';

type UserProfile = {
  uid: string;
  firstName: string;
  lastName: string;
  nickname: string;
  email: string;
  role: 'admin' | 'user';
  position: UserPosition;
  lastModified?: string;
};

const positions: UserPosition[] = [
    'Not Assigned',
    'CEO',
    'SCES / Sales Representative',
    'Sales Supervisor',
    'Sales Manager',
    'Inventory Officer',
    'Production Line Leader',
    'Production Head',
    'Logistics Officer',
    'Operations Manager',
    'HR',
    'Finance',
    'Page Admin'
];

type PageGroup = 'sales' | 'digitizing' | 'inventory' | 'production' | 'logistics' | 'admin' | 'profile';

const positionPermissions: { [key in UserPosition]?: PageGroup[] } = {
  'SCES / Sales Representative': ['sales'],
  'Sales Supervisor': ['sales'],
  'Sales Manager': ['sales'],
  'Inventory Officer': ['inventory'],
  'Production Line Leader': ['production'],
  'Production Head': ['production'],
  'Logistics Officer': ['logistics'],
  'Operations Manager': ['inventory', 'production', 'logistics'],
  'Page Admin': ['sales', 'digitizing', 'inventory', 'production', 'logistics', 'admin', 'profile'],
  'CEO': [],
  'HR': [],
  'Finance': [],
  'Not Assigned': [],
};

export function AdminUsersTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [editedUsers, setEditedUsers] = useState<Record<string, Partial<UserProfile>>>({});
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

  const usersQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'));
  }, [firestore]);

  const { data: users, isLoading, error, refetch } = useCollection<UserProfile>(usersQuery);

  useEffect(() => {
    if (users) {
      // Initialize editedUsers with fetched data
      const initialEdits: Record<string, Partial<UserProfile>> = {};
      users.forEach(user => {
        initialEdits[user.uid] = { role: user.role, position: user.position };
      });
      setEditedUsers(initialEdits);
    }
  }, [users]);
  
  const handleFieldChange = (uid: string, field: 'role' | 'position', value: string) => {
    setEditedUsers(prev => ({
      ...prev,
      [uid]: { ...prev[uid], [field]: value as UserPosition | 'admin' | 'user' }
    }));
  };

  const handleSaveChanges = async (uid: string) => {
    if (!firestore) return;
    const userChanges = editedUsers[uid];
    if (!userChanges) return;

    const userDocRef = doc(firestore, 'users', uid);
    try {
      await updateDoc(userDocRef, { ...userChanges, lastModified: new Date().toISOString() });
      toast({
        title: 'User Updated',
        description: `User's details have been successfully saved.`,
      });
      refetch(); // Refetch to show the latest saved state
    } catch (e: any) {
      console.error('Error updating user:', e);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: e.message || `Could not update the user's details.`,
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete || !firestore) return;
    const userDocRef = doc(firestore, 'users', userToDelete.uid);
    try {
        await deleteDoc(userDocRef);
        toast({
            title: 'User Deleted',
            description: `The user ${userToDelete.nickname} has been deleted.`,
        });
        refetch();
    } catch (e: any) {
        console.error('Error deleting user:', e);
        toast({
            variant: 'destructive',
            title: 'Deletion Failed',
            description: e.message || 'Could not delete the user.',
        });
    } finally {
        setUserToDelete(null);
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
    <>
      <Card className="w-full shadow-xl animate-in fade-in-50 duration-500 bg-white text-black h-full flex flex-col">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-black">User Management</CardTitle>
              <CardDescription className="text-gray-600">
                View and manage user roles and positions.
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
                  <TableHead className="text-white font-bold align-middle">Nickname</TableHead>
                  <TableHead className="text-white font-bold align-middle">Full Name</TableHead>
                  <TableHead className="text-white font-bold align-middle">Email</TableHead>
                  <TableHead className="text-white font-bold align-middle">Position</TableHead>
                  <TableHead className="text-white font-bold align-middle">Page Role</TableHead>
                  <TableHead className="text-white font-bold align-middle">Permission</TableHead>
                  <TableHead className="text-white font-bold align-middle text-center">Last Modified</TableHead>
                  <TableHead className="text-white font-bold align-middle text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-destructive">
                      Error loading users: {error.message}
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => {
                    const editedUser = editedUsers[user.uid] || { role: user.role, position: user.position };
                    const isModified = user.role !== editedUser.role || user.position !== editedUser.position;
                    const permissions = positionPermissions[editedUser.position] || [];

                    return (
                      <TableRow key={user.uid}>
                        <TableCell className="font-medium">{user.nickname}</TableCell>
                        <TableCell>{`${user.firstName} ${user.lastName}`}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Select
                            value={editedUser.position || 'Not Assigned'}
                            onValueChange={(newPosition: string) => handleFieldChange(user.uid, 'position', newPosition)}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {positions.map(pos => (
                                <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={editedUser.role}
                            onValueChange={(newRole: 'admin' | 'user') => handleFieldChange(user.uid, 'role', newRole)}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue>
                                <Badge variant={editedUser.role === 'admin' ? 'destructive' : 'secondary'}>
                                    {editedUser.role?.charAt(0).toUpperCase() + editedUser.role?.slice(1)}
                                </Badge>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                           <Collapsible>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="flex items-center gap-1 text-xs">
                                View Permissions
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                               <div className="p-2 mt-1 border rounded-md bg-gray-50 text-xs">
                                  {editedUser.role === 'admin' || editedUser.position === 'Page Admin' ? (
                                    <p className="font-semibold text-blue-600">Full access to all pages.</p>
                                  ) : permissions.length > 0 ? (
                                    <>
                                      <p className="font-semibold">Can edit:</p>
                                      <ul className="list-disc pl-5">
                                        {permissions.map((p, i) => <li key={i} className="capitalize">{p}</li>)}
                                      </ul>
                                    </>
                                  ) : (
                                    <p className="text-gray-500">Read-only access.</p>
                                  )}
                               </div>
                            </CollapsibleContent>
                           </Collapsible>
                        </TableCell>
                        <TableCell className="text-center text-xs">
                            {user.lastModified ? formatDateTime(user.lastModified).dateTimeShort : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            onClick={() => handleSaveChanges(user.uid)}
                            disabled={!isModified}
                            className="h-8"
                          >
                            <Save className="mr-2 h-4 w-4" />
                            Save
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 ml-1 text-destructive hover:bg-destructive/10"
                            onClick={() => setUserToDelete(user)}
                           >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
       {userToDelete && (
        <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the user account for{' '}
                <strong>{userToDelete.nickname}</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

    