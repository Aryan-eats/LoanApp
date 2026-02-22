import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Outlet } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import PageTransition from './components/shared/PageTransition';
import { PageSkeleton } from './components/shared/SkeletonLoader';
import {
  preloadHome, preloadWhyUs, preloadServices, preloadAboutUs,
  preloadContact, preloadCalculator, preloadOnboarding, preloadLogIn,
  preloadBestOffers, preloadForbidden, preloadApply
} from './utils/routePreloaders';

// Lazy load pages for better performance
const Home = lazy(preloadHome);
const WhyUs = lazy(preloadWhyUs);
const Services = lazy(preloadServices);
const AboutUs = lazy(preloadAboutUs);
const Contact = lazy(preloadContact);
const Calculator = lazy(preloadCalculator);
const PartnerOnboarding = lazy(preloadOnboarding);
const LogIn = lazy(preloadLogIn);
const BestOffers = lazy(preloadBestOffers);
const Forbidden = lazy(preloadForbidden);
const ApplicationForm = lazy(preloadApply);
const CustomerUploadPage = lazy(() => import('./pages/CustomerUploadPage'));

// Lazy load admin pages
const AdminDashboard = lazy(() => import('./admin/pages/AdminDashboard'));
const PartnersPage = lazy(() => import('./admin/pages/PartnersPage'));
const LeadsPage = lazy(() => import('./admin/pages/LeadsPage'));
const DocumentsPage = lazy(() => import('./admin/pages/DocumentsPage'));
const BanksPage = lazy(() => import('./admin/pages/BanksPage'));
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
const ProfilePage = lazy(() => import('./partner/pages/ProfilePage'));
const SupportPage = lazy(() => import('./partner/pages/SupportPage'));

// Layout wrapper component to conditionally render Navbar and Footer
const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isPartnerDashboard = location.pathname.startsWith('/partner');
  const isLoginPage = location.pathname === '/login';

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

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="sync" initial={false}>
      <Routes location={location} key={location.pathname}> 
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/why-us" element={<WhyUs />} />
        <Route path="/services" element={<Services />} />
        <Route path="/about-us" element={<PageTransition><AboutUs /></PageTransition>} />
        <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
        <Route path="/calculator" element={<Calculator />} />
        <Route path="/apply" element={<PageTransition><div className="pt-24 pb-12 px-4"><ApplicationForm /></div></PageTransition>} />
        <Route path="/onboarding" element={<PageTransition><PartnerOnboarding /></PageTransition>} />
        <Route path="/login" element={<PageTransition><LogIn /></PageTransition>} />
        <Route path="/forbidden" element={<PageTransition><Forbidden /></PageTransition>} />
        <Route path="/best-offers" element={<PageTransition><BestOffers /></PageTransition>} />
        <Route path="/upload/:token" element={<CustomerUploadPage />} />

        {/* Admin routes - single ProtectedRoute wrapper, no remount on route change */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><Outlet /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="partners" element={<PartnersPage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="banks" element={<BanksPage />} />
          <Route path="commissions" element={<CommissionsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="docs/reqdoc" element={<ReqDocPage />} />
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
          <Route path="profile" element={<ProfilePage />} />
          <Route path="support" element={<SupportPage />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AppLayout>
          <Suspense fallback={<PageSkeleton />}>
            <AnimatedRoutes />
          </Suspense>
        </AppLayout>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
