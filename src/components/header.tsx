'use client';

import {
  PenSquare,
  Database,
  PlusSquare,
  ChevronDown,
  LineChart,
  ListOrdered,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type HeaderProps = {
  isNewOrderPageDirty?: boolean;
};

export function Header({ isNewOrderPageDirty = false }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [nextUrl, setNextUrl] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleNavigation = (url: string) => {
    if (isNewOrderPageDirty && pathname === '/' && pathname !== url) {
      setNextUrl(url);
      setShowConfirmDialog(true);
    } else {
      router.push(url);
    }
  };

  const confirmNavigation = () => {
    setShowConfirmDialog(false);
    router.push(nextUrl);
  };

  const cancelNavigation = () => {
    setShowConfirmDialog(false);
    setNextUrl('');
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
          <div className="mr-4 flex items-center">
            <Link href="/" className="mr-6 flex items-center pl-24">
              <span className="font-bold font-headline sm:inline-block text-primary text-xl">
                Qualistitch Inc.
              </span>
            </Link>
          </div>
          <nav className="flex items-center gap-4">
            {isClient && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost">
                    <PenSquare className="mr-2" />
                    Data Entry
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleNavigation('/')}>
                    <PlusSquare className="mr-2" />
                    New Order
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNavigation('/records')}>
                    <Database className="mr-2" />
                    View Records
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNavigation('/reports')}>
                    <LineChart className="mr-2" />
                    Reports
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button variant="ghost" onClick={() => handleNavigation('/order-status')}>
              <ListOrdered className="mr-2" />
              Order Status
            </Button>
          </nav>
        </div>
      </header>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to discard them
              and leave the page?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelNavigation}>Stay</AlertDialogCancel>
            <AlertDialogAction onClick={confirmNavigation}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
