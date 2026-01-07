
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
  User,
  Settings,
  LogOut,
  Upload,
  Eye,
  EyeOff,
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
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Input } from './ui/input';
import { Label } from './ui/label';

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

type OperationalCase = {
  id: string;
  joNumber: string;
  caseType: string;
  remarks: string;
  image?: string;
  submissionDateTime: string;
  customerName: string;
  contactNumber?: string;
  landlineNumber?: string;
  quantity?: number;
  isArchived?: boolean;
  isDeleted?: boolean;
};

type HeaderProps = {
  isNewOrderPageDirty?: boolean;
  children?: (
    leads: Lead[], 
    operationalCases: OperationalCase[],
    isLoading: boolean, 
    error: Error | null
  ) => React.ReactNode;
};

export function Header({ isNewOrderPageDirty = false, children }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const [nextUrl, setNextUrl] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [showExistingPassword, setShowExistingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  
  const firestore = useFirestore();
  const { user } = useUser();

  const leadsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'leads'));
  }, [firestore, user]);

  const operationalCasesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'operationalCases'));
  }, [firestore, user]);

  const { data: leads, isLoading: areLeadsLoading, error: leadsError } = useCollection<Lead>(leadsQuery);
  const { data: operationalCases, isLoading: areCasesLoading, error: casesError } = useCollection<OperationalCase>(operationalCasesQuery);

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

  const isLoading = areLeadsLoading || areCasesLoading;
  const error = leadsError || casesError;

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
          <nav className="flex items-center gap-4">
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
           <div className="flex items-center gap-4 ml-auto">
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 text-neutral-100 hover:bg-accent hover:text-white">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground">R</AvatarFallback>
                    </Avatar>
                    <span>Rha</span>
                     <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onSelect={() => setIsAccountSettingsOpen(true)}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Account Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Sign Out</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 overflow-hidden">
        {children && children(leads || [], operationalCases || [], isLoading, error)}
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

      <Dialog open={isAccountSettingsOpen} onOpenChange={setIsAccountSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Account Settings</DialogTitle>
            <DialogDescription>
              Update your profile information and password.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                    <AvatarImage src="" alt="User profile" />
                    <AvatarFallback className="text-3xl">R</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                     <Label htmlFor="profile-picture">Profile Picture</Label>
                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline" size="sm">
                            <label htmlFor="profile-picture-upload" className="cursor-pointer">
                                Choose File
                            </label>
                        </Button>
                        <Input id="profile-picture-upload" type="file" className="hidden" />
                        <Button size="sm" variant="ghost">
                            <Upload className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
             <div className="grid grid-cols-2 gap-4">
               <div className="grid gap-2">
                <Label htmlFor="first-name">First Name</Label>
                <Input id="first-name" placeholder="Juan" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="last-name">Last Name</Label>
                <Input id="last-name" placeholder="Dela Cruz" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nickname">Nickname</Label>
              <Input id="nickname" defaultValue="Rha" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" placeholder="e.g., 0912-345-6789" />
            </div>
             <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="e.g., rha@example.com" />
            </div>
            <div className="grid gap-2 relative">
                <Label htmlFor="existing-password">Existing Password</Label>
                <Input id="existing-password" type={showExistingPassword ? 'text' : 'password'} />
                <Button variant="ghost" size="icon" className="absolute right-1 bottom-1 h-7 w-7 text-gray-500" onClick={() => setShowExistingPassword(p => !p)}>
                    {showExistingPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
            </div>
            <div className="grid gap-2 relative">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type={showNewPassword ? 'text' : 'password'} />
                <Button variant="ghost" size="icon" className="absolute right-1 bottom-1 h-7 w-7 text-gray-500" onClick={() => setShowNewPassword(p => !p)}>
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
            </div>
            <div className="grid gap-2 relative">
                <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                <Input id="confirm-new-password" type={showConfirmNewPassword ? 'text' : 'password'} />
                <Button variant="ghost" size="icon" className="absolute right-1 bottom-1 h-7 w-7 text-gray-500" onClick={() => setShowConfirmNewPassword(p => !p)}>
                    {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" className="text-white font-bold">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

    