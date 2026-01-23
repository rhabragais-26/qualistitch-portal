export type UserPosition = 
  | 'SCES'
  | 'Sales Supervisor'
  | 'Sales Manager'
  | 'S.E Officer'
  | 'Inventory Officer'
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
  | 'Not Assigned';

export type PageGroup = 'sales' | 'digitizing' | 'inventory' | 'production' | 'logistics' | 'admin' | 'profile' | 'order-status' | 'finance' | 'marketing';

export const allPageGroups: { id: PageGroup, label: string, path: string }[] = [
    { id: 'sales', label: 'Sales', path: '/records' },
    { id: 'digitizing', label: 'Digitizing', path: '/digitizing/programming-queue' },
    { id: 'inventory', label: 'Inventory', path: '/inventory/summary' },
    { id: 'production', label: 'Production', path: '/production/production-queue' },
    { id: 'logistics', label: 'Logistics', path: '/logistics/shipment-queue' },
    { id: 'finance', label: 'Finance', path: '/finance' },
];

const pageGroupMapping: { [key: string]: PageGroup } = {
  '/new-order': 'sales',
  '/records/completed': 'sales',
  '/records': 'sales',
  '/job-order': 'sales',
  '/sales/audit-for-shipment': 'sales',
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
  '/production/completed-production': 'production',
  '/logistics/shipment-queue': 'logistics',
  '/logistics/shipped-orders': 'logistics',
  '/logistics/completed-shipments': 'logistics',
  '/logistics/summary': 'logistics',
  '/admin/users': 'admin',
  '/profile': 'profile',
  '/order-status': 'order-status',
  '/finance/dashboard': 'finance',
  '/finance/receivables': 'finance',
  '/finance/fully-paid-orders': 'finance',
  '/finance/operational-expenses': 'finance',
  '/finance/cost-of-goods': 'finance',
  '/finance/capital-expenses': 'finance',
  '/marketing/campaigns': 'marketing',
  '/marketing/ads-vs-inquiries': 'marketing',
  '/marketing/analytics': 'marketing',
};

const defaultPermissions: { [key in UserPosition]?: PageGroup[] } = {
  'SCES': ['sales', 'marketing'],
  'Sales Supervisor': ['sales', 'marketing'],
  'Sales Manager': ['sales', 'marketing'],
  'S.E Officer': ['sales', 'marketing'],
  'Inventory Officer': ['inventory'],
  'Digitizer': ['digitizing'],
  'E.D Coordinator': ['digitizing'],
  'Production Line Leader': ['production'],
  'Production Head': ['inventory', 'logistics'],
  'Logistics Officer': ['logistics'],
  'Operations Manager': ['inventory', 'production', 'logistics'],
  'Finance': ['finance'],
  'Page Admin': ['sales', 'digitizing', 'inventory', 'production', 'logistics', 'admin', 'profile', 'finance', 'marketing'],
};

export function hasEditPermission(position: UserPosition | undefined, pathname: string, customPermissions?: UserPermissions): boolean {
  if (!position) {
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
