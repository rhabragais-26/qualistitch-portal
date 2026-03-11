'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Edit, Trash2, PlusCircle, Save, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const departmentOptions = ['Production', 'Sales', 'Marketing', 'Finance', 'Human Resources', 'Programming & I.T.', 'Operations'];

type FinanceCategory = {
  id: string;
  name: string;
  department: string;
  group: 'Fixed' | 'Variable' | 'One-Time';
};

export function ManageCategories() {
  const firestore = useFirestore();
  const { userProfile, isAdmin } = useUser();
  const { toast } = useToast();

  const canEdit = isAdmin || userProfile?.position === 'Finance';

  const categoriesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'financeCategories'), orderBy('name')) : null, [firestore]);
  const { data: categories, isLoading, refetch } = useCollection<FinanceCategory>(categoriesQuery, undefined, { listen: false });
  
  const [newCategoryName, setNewCategoryName] = useState<Record<string, string>>({});
  const [editingCategory, setEditingCategory] = useState<FinanceCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<FinanceCategory | null>(null);

  const handleAddCategory = async (department: string) => {
    const name = newCategoryName[department]?.trim();
    if (!name || !firestore) return;

    const newId = uuidv4();
    const docRef = doc(firestore, 'financeCategories', newId);
    try {
      await setDoc(docRef, { id: newId, name, department, group: 'Variable' });
      toast({ title: 'Category Added', description: `"${name}" has been added to ${department}.` });
      setNewCategoryName(prev => ({...prev, [department]: ''}));
      refetch();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Add Failed', description: e.message });
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editingCategory.name.trim() || !firestore) return;
    const docRef = doc(firestore, 'financeCategories', editingCategory.id);
    try {
      await setDoc(docRef, editingCategory, { merge: true });
      toast({ title: 'Category Updated' });
      setEditingCategory(null);
      refetch();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
    }
  };
  
  const handleDeleteCategory = async () => {
    if (!deletingCategory || !firestore) return;
    try {
      const docRef = doc(firestore, 'financeCategories', deletingCategory.id);
      await deleteDoc(docRef);
      toast({ title: 'Category Deleted' });
      setDeletingCategory(null);
      refetch();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Delete Failed', description: e.message });
    }
  };


  const categoriesByDepartment = useMemo(() => {
    const grouped: Record<string, FinanceCategory[]> = {};
    departmentOptions.forEach(dept => grouped[dept] = []);
    if (categories) {
      categories.forEach(cat => {
        if (cat.department && grouped[cat.department]) {
          grouped[cat.department].push(cat);
        }
      });
    }
    return grouped;
  }, [categories]);

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Manage Forecast Categories</CardTitle>
        <CardDescription>Add, edit, or delete expense categories for each department.</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
            {departmentOptions.map(dept => (
                <AccordionItem value={dept} key={dept}>
                    <AccordionTrigger>{dept}</AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-2">
                            {categoriesByDepartment[dept]?.map(cat => (
                                <div key={cat.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50">
                                    {editingCategory?.id === cat.id ? (
                                        <>
                                            <Input
                                                value={editingCategory.name}
                                                onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                                className="h-8 flex-1"
                                                autoFocus
                                            />
                                            <Button size="icon" className="h-8 w-8" onClick={handleUpdateCategory}><Save className="h-4 w-4"/></Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingCategory(null)}><X className="h-4 w-4"/></Button>
                                        </>
                                    ) : (
                                        <>
                                            <span className="flex-1">{cat.name}</span>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingCategory(cat)} disabled={!canEdit}><Edit className="h-4 w-4"/></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingCategory(cat)} disabled={!canEdit}><Trash2 className="h-4 w-4"/></Button>
                                        </>
                                    )}
                                </div>
                            ))}
                             {canEdit && (
                                <div className="flex items-center gap-2 p-2">
                                <Input
                                    placeholder="New category name..."
                                    value={newCategoryName[dept] || ''}
                                    onChange={(e) => setNewCategoryName(prev => ({...prev, [dept]: e.target.value}))}
                                    className="h-8 flex-1"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddCategory(dept);
                                      }
                                    }}
                                />
                                <Button size="sm" onClick={() => handleAddCategory(dept)}><PlusCircle className="mr-2 h-4 w-4"/> Add</Button>
                                </div>
                            )}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
        <AlertDialog open={!!deletingCategory} onOpenChange={() => setDeletingCategory(null)}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                This will permanently delete the category "{deletingCategory?.name}". This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
