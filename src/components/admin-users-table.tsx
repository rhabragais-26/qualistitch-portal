
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { formatDateTime, cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Save, Trash2, ChevronDown } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';
import { UserPosition, hasEditPermission, PageGroup, allPageGroups, defaultPermissions } from '@/lib/permissions';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { isEqual } from 'lodash';

type UserPermissions = {
  [key in PageGroup]?: boolean;
};

type UserProfile = {
  uid: string;
  firstName: string;
  lastName: string;
  nickname: string;
  email: string;
  role: 'admin' | 'user';
  position: UserPosition;
  lastModified?: string;
  permissions?: UserPermissions;
};

const positions: UserPosition[] = [
    'Not Assigned',
    'CEO',
    'SCES',
    'Sales Supervisor',
    'Sales Manager',
    'S.E Officer',
    'Digitizer',
    'E.D Coordinator',
    'Inventory Officer',
    'Production Line Leader',
    'Production Head',
    'Logistics Officer',
    'Operations Manager',
    'Operations Head',
    'HR',
    'Finance',
    'Marketing Head',
    'Social Media Manager',
    'Page Admin'
];

const AdminUserTableRow = React.memo(({
  user,
  editedUser,
  onFieldChange,
  onPermissionChange,
  onSaveChanges,
  onSetUserToDelete,
}: {
  user: UserProfile;
  editedUser: Partial<UserProfile>;
  onFieldChange: (uid: string, field: 'role' | 'position', value: string) => void;
  onPermissionChange: (uid: string, pageGroup: PageGroup, checked: boolean) => void;
  onSaveChanges: (uid: string) => void;
  onSetUserToDelete: (user: UserProfile) => void;
}) => {
  const isModified = 
      user.role !== editedUser.role || 
      user.position !== editedUser.position ||
      !isEqual(user.permissions || {}, editedUser.permissions || {});

  return (
    <TableRow>
      <TableCell className="font-medium align-middle text-center">{user.nickname}</TableCell>
      <TableCell className="align-middle text-center">{`${user.firstName} ${user.lastName}`}</TableCell>
      <TableCell className="align-middle text-center">{user.email}</TableCell>
      <TableCell className="align-middle text-center">
        <Select
          value={editedUser.position || user.position}
          onValueChange={(newPosition: string) => onFieldChange(user.uid, 'position', newPosition)}
        >
          <SelectTrigger className={cn("w-[200px]", (editedUser.position || user.position) === 'Not Assigned' && 'text-destructive font-bold')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {positions.map(pos => (
              <SelectItem key={pos} value={pos}>{pos}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="align-middle text-center">
        <Select
          value={editedUser.role || user.role}
          onValueChange={(newRole: 'admin' | 'user') => onFieldChange(user.uid, 'role', newRole)}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue>
              <Badge variant={editedUser.role === 'admin' ? 'destructive' : 'secondary'}>
                  {(editedUser.role || user.role)?.charAt(0).toUpperCase() + (editedUser.role || user.role)?.slice(1)}
              </Badge>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="align-middle text-center">
          <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="flex items-center gap-1 text-xs">
              View Permissions
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
              <div className="p-2 mt-1 border rounded-md bg-gray-50 text-xs">
              <p className="font-semibold mb-2">Can Edit:</p>
              <div className="grid grid-cols-2 gap-2">
                {allPageGroups.map(group => (
                  <div key={group.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${user.uid}-${group.id}`}
                      checked={hasEditPermission(editedUser.position, group.path, editedUser.permissions)}
                      onCheckedChange={(checked) => onPermissionChange(user.uid, group.id, !!checked)}
                    />
                    <Label htmlFor={`${user.uid}-${group.id}`} className="text-xs font-normal">
                      {group.label}
                    </Label>
                  </div>
                ))}
              </div>
              </div>
          </CollapsibleContent>
          </Collapsible>
      </TableCell>
      <TableCell className="text-center text-xs align-middle">
          {user.lastModified ? formatDateTime(user.lastModified).dateTimeShort : '-'}
      </TableCell>
      <TableCell className="text-center align-middle">
        <Button
          size="sm"
          onClick={() => onSaveChanges(user.uid)}
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
          onClick={() => onSetUserToDelete(user)}
          >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
});
AdminUserTableRow.displayName = 'AdminUserTableRow';


export function AdminUsersTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');
  const [editedUsers, setEditedUsers] = useState<Record<string, Partial<UserProfile>>>({});
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'));
  }, [firestore]);

  const { data: users, isLoading, error, refetch } = useCollection<UserProfile>(usersQuery, undefined, { listen: false });

  useEffect(() => {
    if (users) {
      const initialEdits = users.reduce((acc, user) => {
        acc[user.uid] = { 
          role: user.role, 
          position: user.position,
          permissions: user.permissions || {} 
        };
        return acc;
      }, {} as Record<string, Partial<UserProfile>>);
      setEditedUsers(initialEdits);
    }
  }, [users]);
  
  const handleFieldChange = useCallback((uid: string, field: 'role' | 'position', value: string) => {
    setEditedUsers(prev => {
      const newEditedUser = { ...prev[uid], [field]: value };

      if (field === 'position') {
        const newPosition = value as UserPosition;
        const defaultPerms = defaultPermissions[newPosition] ?? [];
        const newPermissions: UserPermissions = {};

        allPageGroups.forEach(group => {
          newPermissions[group.id] = defaultPerms.includes(group.id);
        });
        
        if (newPosition === 'Page Admin' || newPosition === 'CEO') {
            allPageGroups.forEach(group => {
              newPermissions[group.id] = true;
          });
        }

        newEditedUser.permissions = newPermissions;
      }

      return {
        ...prev,
        [uid]: newEditedUser
      };
    });
  }, []);

  const handlePermissionChange = useCallback((uid: string, pageGroup: PageGroup, checked: boolean) => {
    setEditedUsers(prev => {
        const userChanges = { ...prev[uid] };
        const currentPermissions = { ...(userChanges.permissions || {}) };
        currentPermissions[pageGroup] = checked;
        return {
            ...prev,
            [uid]: { ...userChanges, permissions: currentPermissions }
        };
    });
  }, []);

  const handleSaveChanges = useCallback(async (uid: string) => {
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
      refetch(); 
    } catch (e: any) {
      console.error('Error updating user:', e);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: e.message || `Could not update the user's details.`,
      });
    }
  }, [firestore, editedUsers, toast, refetch]);

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
      (user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (positionFilter === 'All' || user.position === positionFilter) &&
      (roleFilter === 'All' || user.role === roleFilter)
    );
  }, [users, searchTerm, positionFilter, roleFilter]);

  return (
    <>
      <Card className="w-full shadow-xl bg-white text-black h-full flex flex-col border">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-black">User Management</CardTitle>
              <CardDescription className="text-gray-600">
                View and manage user roles and positions.
              </CardDescription>
            </div>
             <div className="flex items-center gap-2">
                 <Select value={positionFilter} onValueChange={setPositionFilter}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by Position" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">All Positions</SelectItem>
                        {positions.map(pos => <SelectItem key={pos} value={pos}>{pos}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[120px]"><SelectValue placeholder="Filter by Role" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">All Roles</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                </Select>
                <Input
                    placeholder="Search by name, nickname, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-gray-100 text-black placeholder:text-gray-500 w-80"
                />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto">
          <div className="border rounded-md h-full">
            <Table>
              <TableHeader className="bg-neutral-800 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="text-white font-bold align-middle text-center">Nickname</TableHead>
                  <TableHead className="text-white font-bold align-middle text-center">Full Name</TableHead>
                  <TableHead className="text-white font-bold align-middle text-center">Email</TableHead>
                  <TableHead className="text-white font-bold align-middle text-center">Position</TableHead>
                  <TableHead className="text-white font-bold align-middle text-center">Page Role</TableHead>
                  <TableHead className="text-white font-bold align-middle text-center">Permission</TableHead>
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
                  filteredUsers.map((user) => (
                    <AdminUserTableRow
                      key={user.uid}
                      user={user}
                      editedUser={editedUsers[user.uid] || {}}
                      onFieldChange={handleFieldChange}
                      onPermissionChange={handlePermissionChange}
                      onSaveChanges={handleSaveChanges}
                      onSetUserToDelete={setUserToDelete}
                    />
                  ))
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
