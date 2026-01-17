// src/components/temp-test-alert-dialog.tsx
"use client";

import React, { useState, useEffect } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
} from './ui/alert-dialog'; // Assuming path to shadcn/ui alert-dialog
import { Button } from './ui/button'; // Assuming path to shadcn/ui button
import { useToast } from '@/hooks/use-toast'; // Still useful for confirmation

export function TempTestAlertDialog() {
  const [isTestAlertDialogOpen, setIsTestAlertDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    console.log("TempTestAlertDialog: isTestAlertDialogOpen changed to", isTestAlertDialogOpen);
  }, [isTestAlertDialogOpen]);

  return (
    <div className="p-8">
      <h1>Test Alert Dialog Freeze Issue</h1>
      <Button onClick={() => {
        console.log("TempTestAlertDialog: Open Alert Button clicked.");
        setIsTestAlertDialogOpen(true);
      }} className="mt-4">
        Open Test Alert Dialog
      </Button>

      <AlertDialog open={isTestAlertDialogOpen} onOpenChange={setIsTestAlertDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Test Alert Dialog</AlertDialogTitle>
              <AlertDialogDescription>
                This is a standalone alert dialog to test freezing.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                  console.log("TempTestAlertDialog: AlertDialog Cancel clicked.");
                  setIsTestAlertDialogOpen(false);
                  toast({ title: "Canceled!", description: "Test dialog closed." });
              }}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                  console.log("TempTestAlertDialog: AlertDialog Confirm clicked.");
                  setIsTestAlertDialogOpen(false);
                  toast({ title: "Confirmed!", description: "Test dialog action." });
              }}>Confirm</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
