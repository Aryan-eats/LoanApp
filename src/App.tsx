import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Outlet, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import SessionExpiryWarningModal from './components/SessionExpiryWarningModal';
import PageTransition from './components/shared/PageTransition';
import { PageSkeleton } from './components/shared/SkeletonLoader';
import useAuthStore from './stores/authStore';

// Lazy load pages for better performance
const Home = lazy(() => import('./pages/Home'));
const WhyUs = lazy(() => import('./pages/WhyUs'));
const Services = lazy(() => import('./pages/Services'));
const AboutUs = lazy(() => import('./pages/AboutUs'));
const Contact = lazy(() => import('./pages/Contact'));
const Calculator = lazy(() => import('./pages/Calculator'));
const PartnerOnboarding = lazy(() => import('./pages/PartnerOnboarding'));
const LogIn = lazy(() => import('./pages/LogIn'));
const BestOffers = lazy(() => import('./pages/BestOffers'));
const Forbidden = lazy(() => import('./pages/Forbidden'));
const ApplicationForm = lazy(() => import('./components/ApplicationForm'));
const CustomerUploadPage = lazy(() => import('./pages/CustomerUploadPage'));

// Lazy load admin pages
const AdminDashboard = lazy(() => import('./admin/pages/AdminDashboard'));
const PartnersPage = lazy(() => import('./admin/pages/PartnersPage'));
const LeadsPage = lazy(() => import('./admin/pages/LeadsPage'));
const DocumentsPage = lazy(() => import('./admin/pages/DocumentsPage'));
const BanksPage = lazy(() => import('./admin/pages/BanksPage'));
const BankManagePage = lazy(() => import('./admin/pages/BankManagePage'));
const CommissionsPage = lazy(() => import('./admin/pages/CommissionsPage'));
const UsersPage = lazy(() => import('./admin/pages/UsersPage'));
const AuditLogsPage = lazy(() => import('./admin/pages/AuditLogsPage'));
const SettingsPage = lazy(() => import('./admin/pages/SettingsPage'));
const ReqDocPage = lazy(() => import('./admin/pages/ReqDocPage'));

// Lazy load partner dashboard pages
const PartnerLayout = lazy(() => import('./partner/components/PartnerLayout'));
const PartnerDashboard = lazy(() => import('./partner/pages/PartnerDashboard'));
const AddClientPage = lazy(() => import('./partner/pages/AddClientPage'));
const MyLeadsPage = lazy(() => import('./partner/pages/MyLeadsPage'));
const CreditCheckPage = lazy(() => import('./partner/pages/CreditCheckPage'));
const PartnerDocumentsPage = lazy(() => import('./partner/pages/DocumentsPage'));
const PartnerCommissionsPage = lazy(() => import('./partner/pages/CommissionsPage'));
const BankOffersPage = lazy(() => import('./partner/pages/BankOffersPage'));
const BankLoanTypesPage = lazy(() => import('./partner/pages/BankLoanTypesPage'));
const CustomerDetailPage = lazy(() => import('./partner/pages/CustomerDetailPage'));
const ProfilePage = lazy(() => import('./partner/pages/ProfilePage'));
const SupportPage = lazy(() => import('./partner/pages/SupportPage'));

// Layout wrapper component to conditionally render Navbar and Footer
const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isPartnerDashboard = location.pathname.startsWith('/partner');
  const isLoginPage = location.pathname.startsWith('/login');

  const isUploadPage = location.pathname.startsWith('/upload');

  if (isAdminRoute || isPartnerDashboard || isLoginPage || isUploadPage) {
    // Admin, Partner, Login, and Upload pages have their own layout
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-900">
      <Navbar />
      <main className="grow">{children}</main>
      <Footer />
    </div>
  );
};

const AppRoutes = () => {
  const adminRoles = ['super_admin', 'admin', 'manager', 'agent', 'viewer'];
  const adminOperatorRoles = ['super_admin', 'admin', 'manager', 'agent'];

  return (
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/why-us" element={<WhyUs />} />
        <Route path="/services" element={<Services />} />
        <Route path="/about-us" element={<PageTransition><AboutUs /></PageTransition>} />
        <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
        <Route path="/calculator" element={<Calculator />} />
        <Route path="/apply" element={<PageTransition><div className="pt-24 pb-12 px-4"><ApplicationForm /></div></PageTransition>} />
        <Route path="/onboarding" element={<PageTransition><PartnerOnboarding /></PageTransition>} />
        <Route path="/login" element={<Navigate to="/login/partner" replace />} />
        <Route path="/login/partner" element={<PageTransition><LogIn /></PageTransition>} />
        <Route path="/login/restricted-access" element={<PageTransition><LogIn /></PageTransition>} />
        <Route path="/forbidden" element={<PageTransition><Forbidden /></PageTransition>} />
        <Route path="/best-offers" element={<PageTransition><BestOffers /></PageTransition>} />
        <Route path="/upload/:token" element={<CustomerUploadPage />} />

        {/* Admin routes - single ProtectedRoute wrapper, no remount on route change */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={adminRoles}><Outlet /></ProtectedRoute>}>
          <Route index element={<ProtectedRoute allowedRoles={adminOperatorRoles}><AdminDashboard /></ProtectedRoute>} />
          <Route path="dashboard" element={<ProtectedRoute allowedRoles={adminOperatorRoles}><AdminDashboard /></ProtectedRoute>} />
          <Route path="partners" element={<PartnersPage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="documents" element={<ProtectedRoute allowedRoles={adminOperatorRoles}><DocumentsPage /></ProtectedRoute>} />
          <Route path="banks" element={<BanksPage />} />
          <Route path="banks/:bankId" element={<BankManagePage />} />
          <Route path="commissions" element={<ProtectedRoute allowedRoles={adminOperatorRoles}><CommissionsPage /></ProtectedRoute>} />
          <Route path="users" element={<ProtectedRoute allowedRoles={['super_admin']}><UsersPage /></ProtectedRoute>} />
          <Route path="audit-logs" element={<ProtectedRoute allowedRoles={adminOperatorRoles}><AuditLogsPage /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute allowedRoles={adminOperatorRoles}><SettingsPage /></ProtectedRoute>} />
          <Route path="docs/reqdoc" element={<ProtectedRoute allowedRoles={adminOperatorRoles}><ReqDocPage /></ProtectedRoute>} />
        </Route>

        {/* Partner Dashboard routes */}
        <Route path="/partner" element={<ProtectedRoute allowedRoles={['partner']}><PartnerLayout /></ProtectedRoute>}>
          <Route index element={<PartnerDashboard />} />
          <Route path="add-client" element={<AddClientPage />} />
          <Route path="leads" element={<MyLeadsPage />} />
          <Route path="credit-check" element={<CreditCheckPage />} />
          <Route path="documents" element={<PartnerDocumentsPage />} />
          <Route path="commissions" element={<PartnerCommissionsPage />} />
          <Route path="bank-offers" element={<BankOffersPage />} />
          <Route path="bank-offers/:bankId" element={<BankLoanTypesPage />} />
          <Route path="customers/:customerId" element={<CustomerDetailPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="support" element={<SupportPage />} />
        </Route>
      </Routes>
  );
};

const AuthBootstrap = ({ children }: { children: React.ReactNode }) => {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const authInitialized = useAuthStore((state) => state.authInitialized);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  if (!authInitialized) {
    return <PageSkeleton />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AppLayout>
          <Suspense fallback={<PageSkeleton />}>
            <AuthBootstrap>
              <AppRoutes />
            </AuthBootstrap>
          </Suspense>
        </AppLayout>
        <SessionExpiryWarningModal />
      </Router>
    </ErrorBoundary>
  );
}

export default App;
