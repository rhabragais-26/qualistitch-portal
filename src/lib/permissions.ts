
export type UserPosition = 
  | 'SCES'
  | 'Sales Supervisor'
  | 'Sales Manager'
  | 'S.E Officer'
  | 'Inventory Officer'
  | 'Purchasing Officer'
  | 'Production Line Leader'
  | 'Production Head'
  | 'Logistics Officer'
  | 'Operations Manager'
  | 'Operations Head'
  | 'Digitizer'
  | 'E.D Coordinator'
  | 'HR'
  | 'Finance'
  | 'CEO'
  | 'Page Admin'
  | 'Marketing Head'
  | 'Social Media Manager'
  | 'Content Marketing Specialist'
  | 'Not Assigned'
  | 'RESIGNED';

export type PageGroup = 'sales' | 'digitizing' | 'inventory' | 'production' | 'logistics' | 'profile' | 'order-status' | 'finance' | 'marketing' | 'admin';

export const allPageGroups: { id: PageGroup, label: string, path: string }[] = [
    { id: 'sales', label: 'Sales', path: '/records' },
    { id: 'digitizing', label: 'Digitizing', path: '/digitizing/programming-queue' },
    { id: 'inventory', label: 'Inventory', path: '/inventory/summary' },
    { id: 'production', label: 'Production', path: '/production/production-queue' },
    { id: 'logistics', label: 'Logistics', path: '/logistics/shipment-queue' },
    { id: 'finance', label: 'Finance', path: '/finance/dashboard' },
    { id: 'marketing', label: 'Marketing', path: '/marketing/calendar' },
    { id: 'admin', label: 'Admin', path: '/admin/users'},
];

const pageGroupMapping: { [key: string]: PageGroup } = {
  '/new-order': 'sales',
  '/records/completed': 'sales',
  '/records': 'sales',
  '/job-order': 'sales',
  '/sales/audit-for-shipment': 'sales',
  '/sales/quotation': 'sales',
  '/sales/unclosed-leads': 'sales',
  '/reports': 'sales',
  '/digitizing/programming-queue': 'digitizing',
  '/digitizing/completed-programs': 'digitizing',
  '/digitizing/program-files-database': 'digitizing',
  '/digitizing/reports': 'digitizing',
  '/inventory/add-items': 'inventory',
  '/inventory/item-preparation-for-production': 'inventory',
  '/inventory/completed-endorsement': 'inventory',
  '/inventory/summary': 'inventory',
  '/inventory/reports': 'inventory',
  '/inventory/operational-cases': 'logistics',
  '/production/production-queue': 'production',
  '/production/daily-logs': 'production',
  '/production/completed-production': 'production',
  '/logistics/shipment-queue': 'logistics',
  '/logistics/shipped-orders': 'logistics',
  '/logistics/completed-shipments': 'logistics',
  '/logistics/summary': 'logistics',
  '/profile': 'profile',
  '/order-status': 'order-status',
  '/finance/dashboard': 'finance',
  '/finance/receivables': 'finance',
  '/finance/fully-paid-orders': 'finance',
  '/finance/operational-expenses': 'finance',
  '/finance/cost-of-goods': 'finance',
  '/finance/capital-expenses': 'finance',
  '/finance/cash-inflows': 'finance',
  '/marketing/calendar': 'marketing',
  '/marketing/photoshoot-requests': 'marketing',
  '/marketing/campaigns': 'marketing',
  '/marketing/ads-vs-inquiries': 'marketing',
  '/marketing/daily-ads': 'marketing',
  '/marketing/analytics': 'marketing',
  '/marketing/founding-anniversaries': 'marketing',
};

export const defaultPermissions: { [key in UserPosition]?: PageGroup[] } = {
  'SCES': ['sales'],
  'Sales Supervisor': ['sales'],
  'Sales Manager': ['sales'],
  'S.E Officer': ['sales'],
  'Inventory Officer': ['inventory'],
  'Purchasing Officer': ['inventory', 'logistics'],
  'Digitizer': ['digitizing'],
  'E.D Coordinator': ['digitizing'],
  'Production Line Leader': ['production'],
  'Production Head': ['production'],
  'Logistics Officer': ['logistics'],
  'Operations Manager': ['inventory', 'production', 'logistics'],
  'Operations Head': ['inventory', 'logistics'],
  'Finance': ['finance'],
  'Marketing Head': ['marketing'],
  'Social Media Manager': ['marketing'],
  'Content Marketing Specialist': ['marketing'],
  'Page Admin': ['sales', 'digitizing', 'inventory', 'production', 'logistics', 'profile', 'finance', 'marketing', 'admin'],
};

export function hasEditPermission(position: UserPosition | undefined, pathname: string, customPermissions?: UserPermissions): boolean {
  if (!position) {
    return false;
  }
  
  // Admin page is protected separately by the isAdmin flag in useUser hook
  if (pathname.startsWith('/admin')) {
      return false; 
  }

  const pageGroup = Object.keys(pageGroupMapping).find(path => pathname.startsWith(path));
  const group = pageGroup ? pageGroupMapping[pageGroup] : undefined;
  
  if (group === 'profile') {
    return true;
  }
  
  if (!group) {
    return false; 
  }

  // Check for custom permission first
  if (customPermissions && customPermissions[group] !== undefined) {
    return customPermissions[group]!;
  }
  
  // Fallback to default position-based permissions
  if (position === 'Page Admin' || position === 'CEO') {
    return true;
  }

  return defaultPermissions[position]?.includes(group) ?? false;
}

type UserPermissions = {
  [key in PageGroup]?: boolean;
};
