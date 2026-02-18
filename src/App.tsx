import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ApplicationForm from './components/ApplicationForm';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';

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

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
  </div>
);

// Layout wrapper component to conditionally render Navbar and Footer
const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isPartnerDashboard = location.pathname.startsWith('/partner');
  const isLoginPage = location.pathname === '/login';

  if (isAdminRoute || isPartnerDashboard || isLoginPage) {
    // Admin and Partner Dashboard routes have their own layout
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

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AppLayout>
          <Suspense fallback={<PageLoader />}>
            <Routes> 
              {/* Public routes */}
              <Route path="/" element={<Home />} />
              <Route path="/why-us" element={<WhyUs />} />
              <Route path="/services" element={<Services />} />
              <Route path="/about-us" element={<AboutUs />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/calculator" element={<Calculator />} />
              <Route path="/apply" element={<div className="pt-24 pb-12 px-4"><ApplicationForm /></div>} />
              <Route path="/onboarding" element={<PartnerOnboarding />} />
              <Route path="/login" element={<LogIn />} />
              <Route path="/forbidden" element={<Forbidden />} />
              <Route path="/best-offers" element={<BestOffers />} />

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
          </Suspense>
        </AppLayout>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
