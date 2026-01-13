
export type UserPosition = 
  | 'SCES / Sales Representative'
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

type PageGroup = 'sales' | 'digitizing' | 'inventory' | 'production' | 'logistics' | 'admin' | 'profile' | 'order-status';

const pageGroupMapping: { [key: string]: PageGroup } = {
  '/new-order': 'sales',
  '/records': 'sales',
  '/job-order': 'sales',
  '/sales/audit-for-shipment': 'sales',
  '/reports': 'sales',
  '/digitizing/programming-queue': 'digitizing',
  '/digitizing/program-files-database': 'digitizing',
  '/digitizing/reports': 'digitizing',
  '/inventory/add-items': 'inventory',
  '/inventory/item-preparation-for-production': 'inventory',
  '/inventory/summary': 'inventory',
  '/inventory/reports': 'inventory',
  '/inventory/operational-cases': 'inventory',
  '/production/production-queue': 'production',
  '/logistics/shipment-queue': 'logistics',
  '/logistics/summary': 'logistics',
  '/admin/users': 'admin',
  '/profile': 'profile',
  '/order-status': 'order-status',
};

const permissions: { [key in UserPosition]?: PageGroup[] } = {
  'SCES / Sales Representative': ['sales'],
  'Sales Supervisor': ['sales'],
  'Sales Manager': ['sales'],
  'Inventory Officer': ['inventory'],
  'Production Line Leader': ['production'],
  'Production Head': ['production'],
  'Logistics Officer': ['logistics'],
  'Operations Manager': ['inventory', 'production', 'logistics'],
  'Page Admin': ['sales', 'digitizing', 'inventory', 'production', 'logistics', 'admin', 'profile'],
};

export function hasEditPermission(position: UserPosition | undefined, pathname: string): boolean {
  if (!position) {
    return false;
  }
  
  if (position === 'Page Admin') {
    return true;
  }

  const pageGroup = Object.keys(pageGroupMapping).find(path => pathname.startsWith(path));
  const group = pageGroup ? pageGroupMapping[pageGroup] : undefined;

  if (group === 'profile') {
      return true;
  }
  
  if (!group) {
    return false; // Default to no permission if page group is not defined
  }

  return permissions[position]?.includes(group) ?? false;
}
