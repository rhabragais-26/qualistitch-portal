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
  Shield,
  UserCog,
  MessageSquare,
  Home,
  Megaphone,
  Banknote,
  Ticket,
  LayoutDashboard,
  Receipt,
  BarChart,
  ShoppingCart,
  Building,
  CalendarIcon,
  Camera,
  Gift,
  Newspaper,
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
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useCollection, useFirestore, useMemoFirebase, useUser, useAuth } from '@/firebase';
import { collection, query, doc, getDoc, setDoc } from 'firebase/firestore';
import { Badge } from './ui/badge';
import { signOut } from 'firebase/auth';
import { NotificationBell } from './notification-bell';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from './ui/textarea';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';
import type { UserPosition } from '@/lib/permissions';

type HeaderProps = {
  isNewOrderPageDirty?: boolean;
  isOperationalCasesPageDirty?: boolean;
  children?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
};

type Lead = {
  isSalesAuditRequested?: boolean;
}

type UserProfileInfo = {
  position: string;
};

const HeaderMemo = React.memo(function Header({ 
  isNewOrderPageDirty = false, 
  isOperationalCasesPageDirty = false,
  children,
  onOpenChange
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [nextUrl, setNextUrl] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const { user, userProfile, isAdmin } = useUser();
  const [isAnnouncementDialogOpen, setIsAnnouncementDialogOpen] = useState(false);
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementType, setAnnouncementType] = useState<'banner' | 'notification'>('banner');
  const appStateRef = useMemoFirebase(() => firestore ? doc(firestore, 'appState', 'global') : null, [firestore]);


  const leadsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'leads')) : null),
    [firestore]
  );
  const { data: leads } = useCollection<Lead>(leadsQuery);
  
  const usersQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'users')) : null),
    [firestore]
  );
  const { data: usersData } = useCollection<UserProfileInfo>(usersQuery);

  const auditQueueCount = useMemo(() => {
    if (!leads) return 0;
    return leads.filter(lead => lead.isSalesAuditRequested).length;
  }, [leads]);

  const unassignedUsersCount = useMemo(() => {
    if (!usersData) return 0;
    return usersData.filter(user => user.position === 'Not Assigned').length;
  }, [usersData]);

  const announcementPositions: UserPosition[] = ["CEO", "Sales Manager", "Operations Manager", "HR", "Finance"];
  const canSendAnnouncement = isAdmin || (userProfile && announcementPositions.includes(userProfile.position as UserPosition));

  const canViewFinance = isAdmin || userProfile?.position === 'CEO' || userProfile?.position === 'Finance';

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const handleSendAnnouncement = async () => {
    if (!announcementText.trim() || !appStateRef || !userProfile) {
        toast({
            variant: 'destructive',
            title: 'Announcement is empty',
            description: 'Please write a message before sending.',
        });
        return;
    }

    try {
        await setDoc(appStateRef, {
            announcementText,
            announcementType,
            announcementTimestamp: new Date().toISOString(),
            announcementSender: userProfile.nickname,
        }, { merge: true });

        toast({
            title: 'Announcement Sent!',
            description: 'Your announcement has been broadcast to all users.',
        });
        setAnnouncementText('');
        setIsAnnouncementDialogOpen(false);
    } catch (e: any) {
        toast({
            variant: 'destructive',
            title: 'Failed to Send',
            description: e.message || 'Could not send the announcement.',
        });
    }
  };


  const getActiveMenuClass = useCallback((paths: string[]) => {
    const isActive = paths.some(path => pathname === path || (path !== '/' && pathname.startsWith(path)));
    return isActive
      ? 'bg-white text-primary hover:bg-gray-100'
      : 'bg-primary text-primary-foreground hover:bg-primary/90';
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
  
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  const getInitials = (nickname: string | undefined) => {
    if (!nickname) return '';
    return nickname.charAt(0).toUpperCase();
  };

  const getAvatarColor = (nickname: string | undefined) => {
    if (!nickname) return 'hsl(var(--primary))';
    const colors = [
        'hsl(var(--chart-1))',
        'hsl(var(--chart-2))',
        'hsl(var(--chart-3))',
        'hsl(var(--chart-4))',
        'hsl(var(--chart-5))',
        'hsl(270, 90%, 55%)',
    ];
    let hash = 0;
    if (nickname.length === 0) return colors[0];
    for (let i = 0; i < nickname.length; i++) {
        const char = nickname.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    const index = Math.abs(hash % colors.length);
    return colors[index];
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-black no-print border-b border-white relative">
        <div className="container flex h-14 max-w-screen-2xl items-center">
          <div className="mr-4 flex items-center">
            <Link href="/home" className="mr-6 flex items-center ml-4" onClick={(e) => { e.preventDefault(); handleNavigation('/home'); }}>
              <span className={cn("font-bold font-headline flex items-baseline bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent shining-metal whitespace-nowrap")}>
                <span className="text-3xl">Q</span>
                <span className="text-2xl">UALISTITCH Inc.</span>
              </span>
            </Link>
          </div>
          <nav className="flex items-end gap-2 h-full flex-1">
            {isClient && (
              <>
                {canViewFinance && (
                  <DropdownMenu open={openMenu === 'finance'} onOpenChange={(isOpen) => handleMenuOpenChange('finance', isOpen)}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className={cn("h-10 rounded-t-md rounded-b-none px-4 font-bold", getActiveMenuClass(['/finance']))}>
                        <Banknote className="mr-2" />
                        Finance
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                       <DropdownMenuItem onClick={() => handleNavigation('/finance/cash-inflows')}>
                        <Banknote className="mr-2" />
                        Cash Inflows
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleNavigation('/finance/receivables')}>
                        <Receipt className="mr-2" />
                        Receivables
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleNavigation('/finance/operational-expenses')}>
                        <FileText className="mr-2" />
                        Operational Expenses
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleNavigation('/finance/cost-of-goods')}>
                        <ShoppingCart className="mr-2" />
                        Cost of Goods
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleNavigation('/finance/capital-expenses')}>
                        <Building className="mr-2" />
                        Capital Expenses
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleNavigation('/finance/dashboard')}>
                        <LayoutDashboard className="mr-2" />
                        Dashboard
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <DropdownMenu open={openMenu === 'marketing'} onOpenChange={(isOpen) => handleMenuOpenChange('marketing', isOpen)}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className={cn("h-10 rounded-t-md rounded-b-none px-4 font-bold", getActiveMenuClass(['/marketing']))}>
                      <Megaphone className="mr-2" />
                      Marketing
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleNavigation('/marketing/calendar')}>
                      <CalendarIcon className="mr-2" />
                      Marketing Calendar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleNavigation('/marketing/founding-anniversaries')}>
                      <Gift className="mr-2" />
                      List of Founding Anniversaries
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleNavigation('/marketing/photoshoot-requests')}>
                      <Camera className="mr-2" />
                      Photoshoot Request for Orders
                    </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => handleNavigation('/marketing/daily-ads')}>
                      <Newspaper className="mr-2" />
                      Daily Ads
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleNavigation('/marketing/campaigns')}>
                      <Ticket className="mr-2" />
                      Inquiries per Ticket Size
                    </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => handleNavigation('/marketing/ads-vs-inquiries')}>
                      <Banknote className="mr-2" />
                      Ads Spent vs Inquiries Generated
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleNavigation('/marketing/analytics')}>
                      <LineChart className="mr-2" />
                      Analytics
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu open={openMenu === 'sales'} onOpenChange={(isOpen) => handleMenuOpenChange('sales', isOpen)}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className={cn("h-10 rounded-t-md rounded-b-none px-4 font-bold", getActiveMenuClass(['/new-order', '/records', '/job-order', '/reports', '/sales/audit-for-shipment', '/sales/quotation', '/sales/unclosed-leads']))}>
                      <TrendingUp className="mr-2" />
                      Sales
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleNavigation('/sales/unclosed-leads')}>
                      <ClipboardList className="mr-2" />
                      Unclosed Leads
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleNavigation('/sales/quotation')}>
                      <PenSquare className="mr-2" />
                      Quotation
                    </DropdownMenuItem>
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
                            <div className="flex items-center gap-2">
                                <FileCheck className="mr-2" />
                                <span>Audit for Shipment</span>
                            </div>
                            {auditQueueCount > 0 && (
                                <Badge variant="destructive" className="h-4 w-4 shrink-0 justify-center rounded-full p-0">
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
                <DropdownMenu open={openMenu === 'digitizing'} onOpenChange={(isOpen) => handleMenuOpenChange('digitizing', isOpen)}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className={cn("h-10 rounded-t-md rounded-b-none px-4 font-bold", getActiveMenuClass(['/digitizing/programming-queue', '/digitizing/reports', '/digitizing/program-files-database']))}>
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
                <DropdownMenu open={openMenu === 'inventory'} onOpenChange={(isOpen) => handleMenuOpenChange('inventory', isOpen)}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className={cn("h-10 rounded-t-md rounded-b-none px-4 font-bold", getActiveMenuClass(['/inventory/add-items', '/inventory/item-preparation-for-production', '/inventory/summary', '/inventory/reports']))}>
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
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu open={openMenu === 'production'} onOpenChange={(isOpen) => handleMenuOpenChange('production', isOpen)}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className={cn("h-10 rounded-t-md rounded-b-none px-4 font-bold", getActiveMenuClass(['/production/production-queue', '/production/daily-logs']))}>
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
                    <DropdownMenuItem onClick={() => handleNavigation('/production/daily-logs')}>
                      <FileText className="mr-2" />
                      Embroidery Daily Logs
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu open={openMenu === 'logistics'} onOpenChange={(isOpen) => handleMenuOpenChange('logistics', isOpen)}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className={cn("h-10 rounded-t-md rounded-b-none px-4 font-bold", getActiveMenuClass(['/logistics/shipment-queue', '/logistics/summary', '/inventory/operational-cases']))}>
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
                      <DropdownMenuItem onClick={() => handleNavigation('/inventory/operational-cases')}>
                        <TriangleAlert className="mr-2" />
                        Operational Cases
                      </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" onClick={() => handleNavigation('/order-status')} className={cn("h-10 rounded-t-md rounded-b-none px-4 font-bold", getActiveMenuClass(['/order-status']))}>
                  <ListOrdered className="mr-2" />
                  Order's Progress
                </Button>
              </>
            )}
          </nav>
        </div>
        <div className="absolute top-0 right-4 h-14 flex items-center">
            <NotificationBell />
            {user && userProfile && (
            <DropdownMenu open={openMenu === 'profile'} onOpenChange={(isOpen) => handleMenuOpenChange('profile', isOpen)}>
                <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 h-10 rounded-md pl-3 text-white hover:bg-accent/90">
                    <Avatar className="h-8 w-8">
                    <AvatarImage src={userProfile?.photoURL || ''} alt={userProfile.nickname} />
                    <AvatarFallback 
                        className="text-primary-foreground font-bold"
                        style={{ backgroundColor: getAvatarColor(userProfile?.nickname) }}
                    >
                        {getInitials(userProfile?.nickname)}
                    </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start justify-center">
                    <span className="font-bold text-sm leading-none">{userProfile.nickname}</span>
                    </div>
                    <ChevronDown className="h-4 w-4" />
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => router.push('/profile')}>
                        <div className="flex items-center gap-2">
                            <User />
                            <span>Profile</span>
                        </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleNavigation('/personal-calendar')}>
                         <div className="flex items-center gap-2">
                             <CalendarIcon />
                             <span>Personal Calendar</span>
                         </div>
                    </DropdownMenuItem>
                    {canSendAnnouncement && (
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsAnnouncementDialogOpen(true); }}>
                        <div className="flex items-center gap-2">
                            <Megaphone />
                            <span>Announcement</span>
                        </div>
                    </DropdownMenuItem>
                    )}
                    {isAdmin && (
                    <DropdownMenuItem onClick={() => router.push('/admin/users')}>
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                                <UserCog />
                                <span>Admin Settings</span>
                            </div>
                            {unassignedUsersCount > 0 && (
                                <Badge variant="destructive" className="h-5 w-5 shrink-0 justify-center rounded-full p-0">
                                    {unassignedUsersCount}
                                </Badge>
                            )}
                        </div>
                    </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                         <div className="flex items-center gap-2">
                            <LogOut />
                            <span>Sign Out</span>
                         </div>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            )}
        </div>
      </header>
      
      <main className="flex-1 w-full overflow-y-auto bg-white">
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
       <Dialog open={isAnnouncementDialogOpen} onOpenChange={(isOpen) => {
            setIsAnnouncementDialogOpen(isOpen);
            if (!isOpen) {
                setOpenMenu(null);
            }
        }}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Create an Announcement</DialogTitle>
                <DialogDescription>
                    This message will be broadcast to all logged-in users.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <Textarea
                    placeholder="Type your announcement here..."
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    className="min-h-[100px]"
                />
                <RadioGroup value={announcementType} onValueChange={(v: 'banner' | 'notification') => setAnnouncementType(v)} className="flex space-x-4">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="banner" id="type-banner" />
                        <Label htmlFor="type-banner">Urgent</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="notification" id="type-notification" />
                        <Label htmlFor="type-notification">Non-Urgent</Label>
                    </div>
                </RadioGroup>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleSendAnnouncement} disabled={!announcementText.trim()}>Send</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});

HeaderMemo.displayName = 'Header';

export { HeaderMemo as Header };
