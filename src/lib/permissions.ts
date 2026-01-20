
export type UserPosition = 
  | 'SCES'
  | 'Sales Supervisor'
  | 'Sales Manager'
  | 'Inventory Officer'
  | 'Production Line Leader'
  | 'Production Head'
  | 'Logistics Officer'
  | 'Operations Manager'
  | 'HR'
  | 'Finance'
  | 'CEO'
  | 'Page Admin'
  | 'Not Assigned';

export type PageGroup = 'sales' | 'digitizing' | 'inventory' | 'production' | 'logistics' | 'admin' | 'profile' | 'order-status';

export const allPageGroups: { id: PageGroup, label: string, path: string }[] = [
    { id: 'sales', label: 'Sales', path: '/records' },
    { id: 'digitizing', label: 'Digitizing', path: '/digitizing/programming-queue' },
    { id: 'inventory', label: 'Inventory', path: '/inventory/summary' },
    { id: 'production', label: 'Production', path: '/production/production-queue' },
    { id: 'logistics', label: 'Logistics', path: '/logistics/shipment-queue' },
];

type UserPermissions = {
  [key in PageGroup]?: boolean;
};

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
  '/inventory/operational-cases': 'inventory',
  '/production/production-queue': 'production',
  '/production/completed-production': 'production',
  '/logistics/shipment-queue': 'logistics',
  '/logistics/completed-shipments': 'logistics',
  '/logistics/summary': 'logistics',
  '/admin/users': 'admin',
  '/profile': 'profile',
  '/order-status': 'order-status',
};

const defaultPermissions: { [key in UserPosition]?: PageGroup[] } = {
  'SCES': ['sales'],
  'Sales Supervisor': ['sales'],
  'Sales Manager': ['sales'],
  'Inventory Officer': ['inventory'],
  'Production Line Leader': ['production'],
  'Production Head': ['production'],
  'Logistics Officer': ['logistics'],
  'Operations Manager': ['inventory', 'production', 'logistics'],
  'Page Admin': ['sales', 'digitizing', 'inventory', 'production', 'logistics', 'admin', 'profile'],
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
  if (position === 'Page Admin') {
    return true;
  }

  return defaultPermissions[position]?.includes(group) ?? false;
}
