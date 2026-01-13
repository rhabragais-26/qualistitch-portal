
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
  Truck,
  Ship,
  FileText,
  TrendingUp,
  Cog,
  FileCheck,
  PackageSearch,
  FolderKanban,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Avatar, AvatarFallback } from './ui/avatar';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useCollection, useFirestore, useMemoFirebase, useUser, useAuth } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Badge } from './ui/badge';
import { signOut } from 'firebase/auth';

type HeaderProps = {
  isNewOrderPageDirty?: boolean;
  isOperationalCasesPageDirty?: boolean;
  children?: React.ReactNode;
};

type Lead = {
  isSalesAuditRequested?: boolean;
}

const HeaderMemo = React.memo(function Header({ 
  isNewOrderPageDirty = false, 
  isOperationalCasesPageDirty = false,
  children 
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  const { user } = useUser();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const [nextUrl, setNextUrl] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [showExistingPassword, setShowExistingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const firestore = useFirestore();
  const leadsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'leads')) : null),
    [firestore]
  );
  const { data: leads } = useCollection<Lead>(leadsQuery);

  const auditQueueCount = useMemo(() => {
    if (!leads) return 0;
    return leads.filter(lead => lead.isSalesAuditRequested).length;
  }, [leads]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };
  
  const getActiveMenuClass = useCallback((paths: string[]) => {
    const isActive = paths.some(path => pathname === path || (path !== '/' && pathname.startsWith(path)));
    return isActive
      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
      : 'bg-secondary text-secondary-foreground hover:bg-accent/90 hover:text-white';
  }, [pathname]);

  const handleNavigation = useCallback((url: string) => {
    const isDirty = (isNewOrderPageDirty && pathname === '/new-order') || 
                    (isOperationalCasesPageDirty && pathname === '/inventory/operational-cases');

    if (isDirty && pathname !== url) {
      setNextUrl(url);
      setShowConfirmDialog(true);
    } else {
      router.push(url);
    }
  }, [isNewOrderPageDirty, isOperationalCasesPageDirty, pathname, router]);

  const confirmNavigation = useCallback(() => {
    setShowConfirmDialog(false);
    setTimeout(() => {
      if (nextUrl) {
        router.push(nextUrl);
      }
    }, 100);
  }, [nextUrl, router]);

  const cancelNavigation = useCallback(() => {
    setShowConfirmDialog(false);
    setNextUrl('');
  }, []);

  const handleMenuOpenChange = (menuName: string, isOpen: boolean) => {
    if (isOpen) {
      setOpenMenu(menuName);
    } else {
      if (openMenu === menuName) {
        setOpenMenu(null);
      }
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-black no-print">
        <div className="container flex h-14 max-w-screen-2xl items-center">
          <div className="mr-4 flex items-center">
            <Link href="/new-order" className="mr-6 flex items-center ml-4" onClick={(e) => { e.preventDefault(); handleNavigation('/new-order'); }}>
              <span className={cn("font-bold font-headline flex items-baseline shining-metal from-amber-200 via-yellow-400 to-amber-200 shining-text whitespace-nowrap")}>
                <span className="text-3xl">Q</span>
                <span className="text-2xl">UALISTITCH Inc.</span>
              </span>
            </Link>
          </div>
          <nav className="flex items-center gap-2 h-full">
            {isClient && (
              <DropdownMenu open={openMenu === 'sales'} onOpenChange={(isOpen) => handleMenuOpenChange('sales', isOpen)}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className={cn("h-10 rounded-md px-4 font-bold", getActiveMenuClass(['/new-order', '/records', '/job-order', '/reports', '/sales/audit-for-shipment']))}>
                    <TrendingUp className="mr-2" />
                    Sales
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleNavigation('/new-order')}>
                    <PlusSquare className="mr-2" />
                    New Order
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNavigation('/records')}>
                    <Database className="mr-2" />
                    View Orders
                  </DropdownMenuItem>
                   <DropdownMenuItem onClick={() => handleNavigation('/job-order')}>
                    <ClipboardList className="mr-2" />
                    Job Order
                  </DropdownMenuItem>
                   <DropdownMenuItem onClick={() => handleNavigation('/sales/audit-for-shipment')}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        <FileCheck className="mr-2" />
                        <span>Audit for Shipment</span>
                      </div>
                      {auditQueueCount > 0 && (
                        <Badge variant="destructive" className="h-4 w-4 shrink-0 justify-center rounded-full p-0 ml-2">
                          {auditQueueCount}
                        </Badge>
                      )}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNavigation('/reports')}>
                    <LineChart className="mr-2" />
                    Reports
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {isClient && (
              <DropdownMenu open={openMenu === 'digitizing'} onOpenChange={(isOpen) => handleMenuOpenChange('digitizing', isOpen)}>
                <DropdownMenuTrigger asChild>
                   <Button variant="ghost" className={cn("h-10 rounded-md px-4 font-bold", getActiveMenuClass(['/digitizing/programming-queue', '/digitizing/reports', '/digitizing/program-files-database']))}>
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
                  <DropdownMenuItem onClick={() => handleNavigation('/digitizing/program-files-database')}>
                    <FolderKanban className="mr-2" />
                    Program Files Database
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNavigation('/digitizing/reports')}>
                    <LineChart className="mr-2" />
                    Reports
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {isClient && (
              <DropdownMenu open={openMenu === 'inventory'} onOpenChange={(isOpen) => handleMenuOpenChange('inventory', isOpen)}>
                <DropdownMenuTrigger asChild>
                   <Button variant="ghost" className={cn("h-10 rounded-md px-4 font-bold", getActiveMenuClass(['/inventory/add-items', '/inventory/item-preparation-for-production', '/inventory/summary', '/inventory/reports', '/inventory/operational-cases']))}>
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
                  <DropdownMenuItem onClick={() => handleNavigation('/inventory/item-preparation-for-production')}>
                    <Package className="mr-2" />
                    Item Preparation
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
              <DropdownMenu open={openMenu === 'production'} onOpenChange={(isOpen) => handleMenuOpenChange('production', isOpen)}>
                <DropdownMenuTrigger asChild>
                   <Button variant="ghost" className={cn("h-10 rounded-md px-4 font-bold", getActiveMenuClass(['/production/production-queue']))}>
                      <Cog className="mr-2" />
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
            {isClient && (
              <DropdownMenu open={openMenu === 'logistics'} onOpenChange={(isOpen) => handleMenuOpenChange('logistics', isOpen)}>
                <DropdownMenuTrigger asChild>
                   <Button variant="ghost" className={cn("h-10 rounded-md px-4 font-bold", getActiveMenuClass(['/logistics/shipment-queue', '/logistics/summary']))}>
                      <Truck className="mr-2" />
                      Logistics
                      <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                 <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleNavigation('/logistics/shipment-queue')}>
                        <PackageSearch className="mr-2" />
                        Shipment Queue
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleNavigation('/logistics/summary')}>
                        <FileText className="mr-2" />
                        Summary
                    </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button variant="ghost" onClick={() => handleNavigation('/order-status')} className={cn("h-10 rounded-md px-4 font-bold", getActiveMenuClass(['/order-status']))}>
              <ListOrdered className="mr-2" />
              Overall Order Status
            </Button>
          </nav>
           <div className="flex items-center gap-4 ml-auto">
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 text-white hover:bg-accent/90 hover:text-white">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                            {user?.email?.[0].toUpperCase() ?? 'U'}
                        </AvatarFallback>
                    </Avatar>
                    <span>{user?.email?.split('@')[0] ?? 'User'}</span>
                     <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onSelect={() => setIsAccountSettingsOpen(true)}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Account Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={handleSignOut}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Sign Out</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      
      <main className="flex-1 w-full overflow-hidden bg-white">
        {children}
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
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Account Settings</DialogTitle>
            <DialogDescription>
              Update your profile information and password.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4 text-sm">
            <div className="flex items-center gap-4">
               <div className="relative h-24 w-24 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                    <span className="text-3xl">R</span>
                </div>
                <div className="flex-1 space-y-1">
                     <Label htmlFor="profile-picture" className="text-xs">Profile Picture</Label>
                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline" size="sm" className="text-xs">
                            <label htmlFor="profile-picture-upload" className="cursor-pointer">
                                Choose File
                            </label>
                        </Button>
                        <Input id="profile-picture-upload" type="file" className="hidden" />
                    </div>
                </div>
            </div>
             <div className="grid grid-cols-2 gap-3">
               <div className="grid gap-1 col-span-2">
                <Label htmlFor="first-name" className="text-xs">First Name</Label>
                <Input id="first-name" placeholder="Juan" className="text-xs h-9" />
              </div>
              <div className="grid gap-1 col-span-2">
                <Label htmlFor="last-name" className="text-xs">Last Name</Label>
                <Input id="last-name" placeholder="Dela Cruz" className="text-xs h-9" />
              </div>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="nickname" className="text-xs">Nickname</Label>
              <Input id="nickname" defaultValue="Rha" className="text-xs h-9" />
            </div>
             <div className="grid grid-cols-5 gap-3">
              <div className="grid gap-1 col-span-2">
                <Label htmlFor="phone" className="text-xs">Phone Number</Label>
                <Input id="phone" type="tel" placeholder="e.g., 0912-345-6789" className="text-xs h-9" />
              </div>
              <div className="grid gap-1 col-span-3">
                <Label htmlFor="email" className="text-xs">Email</Label>
                <Input id="email" type="email" placeholder="e.g., rha@example.com" className="text-xs h-9" />
              </div>
            </div>
            <div className="grid gap-1 relative">
                <Label htmlFor="existing-password"  className="text-xs">Existing Password</Label>
                <Input id="existing-password" type={showExistingPassword ? 'text' : 'password'} className="text-xs h-9 pr-10" />
                <Button variant="ghost" size="icon" className="absolute right-1 bottom-1 h-7 w-7 text-gray-500" onClick={() => setShowExistingPassword(p => !p)}>
                    {showExistingPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
            </div>
            <div className="grid gap-1 relative">
                <Label htmlFor="new-password"  className="text-xs">New Password</Label>
                <Input id="new-password" type={showNewPassword ? 'text' : 'password'} className="text-xs h-9 pr-10" />
                <Button variant="ghost" size="icon" className="absolute right-1 bottom-1 h-7 w-7 text-gray-500" onClick={() => setShowNewPassword(p => !p)}>
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
            </div>
            <div className="grid gap-1 relative">
                <Label htmlFor="confirm-new-password"  className="text-xs">Confirm New Password</Label>
                <Input id="confirm-new-password" type={showConfirmNewPassword ? 'text' : 'password'} className="text-xs h-9 pr-10" />
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
});

HeaderMemo.displayName = 'Header';

export { HeaderMemo as Header };

    