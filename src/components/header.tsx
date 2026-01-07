
'use client';

import {
  PenSquare,
  Database,
  PlusSquare,
  ChevronDown,
  LineChart,
  ListOrdered,
  ClipboardList,
  ScanLine,
  Boxes,
  TriangleAlert,
  Package,
  Factory,
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
import { cn } from '@/lib/utils';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';

type Lead = {
  id: string;
  customerName: string;
  companyName?: string;
  contactNumber: string;
  landlineNumber?: string;
  location: string;
  salesRepresentative: string;
  priorityType: string;
  paymentType: string;
  orderType: string;
  courier: string;
  orders: any[];
  submissionDateTime: string;
  lastModified: string;
  joNumber?: number;
  isUnderProgramming?: boolean;
  isInitialApproval?: boolean;
  isLogoTesting?: boolean;
  isRevision?: boolean;
  isFinalApproval?: boolean;
  isFinalProgram?: boolean;
  isPreparedForProduction?: boolean;
  isSentToProduction?: boolean;
  isDigitizingArchived?: boolean;
  layouts?: any[];
  underProgrammingTimestamp?: string;
  initialApprovalTimestamp?: string;
  logoTestingTimestamp?: string;
  revisionTimestamp?: string;
  finalApprovalTimestamp?: string;
  finalProgramTimestamp?: string;
  digitizingArchivedTimestamp?: string;
  sentToProductionTimestamp?: string;
  isCutting?: boolean;
  isSewing?: boolean;
  isTrimming?: boolean;
  isDone?: boolean;
};


type HeaderProps = {
  isNewOrderPageDirty?: boolean;
  children?: (leads: Lead[], isLoading: boolean, error: Error | null) => React.ReactNode;
};

export function Header({ isNewOrderPageDirty = false, children }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [nextUrl, setNextUrl] = useState('');
  const [isClient, setIsClient] = useState(false);
  
  const firestore = useFirestore();
  const { user } = useUser();

  const leadsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'leads'));
  }, [firestore, user]);

  const { data: leads, isLoading, error } = useCollection<Lead>(leadsQuery);

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
      <header className="sticky top-0 z-50 w-full border-b bg-neutral-800 text-neutral-100">
        <div className="container flex h-14 max-w-screen-2xl items-center">
          <div className="mr-4 flex items-center">
            <Link href="/" className="mr-6 flex items-center ml-4">
              <span className={cn("font-bold shining-metal font-headline flex items-baseline")}>
                <span className="text-3xl">Q</span>
                <span className="text-2xl">UALISTITCH Inc.</span>
              </span>
            </Link>
          </div>
          <nav className="flex items-center gap-4 ml-auto">
            {isClient && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-neutral-100 hover:bg-accent hover:text-white">
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
                   <DropdownMenuItem onClick={() => handleNavigation('/job-order')}>
                    <ClipboardList className="mr-2" />
                    Job Order
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNavigation('/reports')}>
                    <LineChart className="mr-2" />
                    Reports
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {isClient && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                   <Button variant="ghost" className="text-neutral-100 hover:bg-accent hover:text-white">
                      <ScanLine className="mr-2" />
                      Digitizing
                      <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                 <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleNavigation('/digitizing/programming-queue')}>
                    <ClipboardList className="mr-2" />
                    Programming Queue
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNavigation('/digitizing/reports')}>
                    <LineChart className="mr-2" />
                    Reports
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {isClient && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                   <Button variant="ghost" className="text-neutral-100 hover:bg-accent hover:text-white">
                      <Boxes className="mr-2" />
                      Inventory
                      <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                 <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleNavigation('/inventory/add-items')}>
                    <PlusSquare className="mr-2" />
                    Add Items
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNavigation('/inventory/prod-preparation')}>
                    <Package className="mr-2" />
                    Prod Preparation
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNavigation('/inventory/summary')}>
                    <Database className="mr-2" />
                    Summary
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNavigation('/inventory/reports')}>
                    <LineChart className="mr-2" />
                    Reports
                  </DropdownMenuItem>
                   <DropdownMenuItem onClick={() => handleNavigation('/inventory/operational-cases')}>
                    <TriangleAlert className="mr-2" />
                    Operational Cases
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {isClient && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                   <Button variant="ghost" className="text-neutral-100 hover:bg-accent hover:text-white">
                      <Factory className="mr-2" />
                      Production
                      <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                 <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleNavigation('/production/production-queue')}>
                    <ClipboardList className="mr-2" />
                    Production Queue
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button variant="ghost" onClick={() => handleNavigation('/order-status')} className="text-neutral-100 hover:bg-accent hover:text-white">
              <ListOrdered className="mr-2" />
              Order Status
            </Button>
          </nav>
        </div>
      </header>
      
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 overflow-hidden">
        {children && children(leads || [], isLoading, error)}
      </main>

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
