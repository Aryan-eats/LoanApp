/**
 * Route prefetch utility.
 *
 * Call `prefetchRoute(path)` to eagerly load the JS chunk for a route.
 * Each path is fetched at most once (tracked via a Set).
 */

const prefetched = new Set<string>();

const routeImports: Record<string, () => Promise<unknown>> = {
  // Admin routes
  '/admin':            () => import('../admin/pages/AdminDashboard'),
  '/admin/dashboard':  () => import('../admin/pages/AdminDashboard'),
  '/admin/partners':   () => import('../admin/pages/PartnersPage'),
  '/admin/leads':      () => import('../admin/pages/LeadsPage'),
  '/admin/documents':  () => import('../admin/pages/DocumentsPage'),
  '/admin/banks':      () => import('../admin/pages/BanksPage'),
  '/admin/commissions':() => import('../admin/pages/CommissionsPage'),
  '/admin/users':      () => import('../admin/pages/UsersPage'),
  '/admin/audit-logs': () => import('../admin/pages/AuditLogsPage'),
  '/admin/settings':   () => import('../admin/pages/SettingsPage'),

  // Partner routes
  '/partner':              () => import('../partner/pages/PartnerDashboard'),
  '/partner/add-client':   () => import('../partner/pages/AddClientPage'),
  '/partner/leads':        () => import('../partner/pages/MyLeadsPage'),
  '/partner/credit-check': () => import('../partner/pages/CreditCheckPage'),
  '/partner/documents':    () => import('../partner/pages/DocumentsPage'),
  '/partner/commissions':  () => import('../partner/pages/CommissionsPage'),
  '/partner/bank-offers':  () => import('../partner/pages/BankOffersPage'),
  '/partner/profile':      () => import('../partner/pages/ProfilePage'),
  '/partner/support':      () => import('../partner/pages/SupportPage'),
};

export function prefetchRoute(path: string) {
  if (prefetched.has(path)) return;
  const importFn = routeImports[path];
  if (importFn) {
    prefetched.add(path);
    importFn();
  }
}
