import { useEffect, useState } from 'react';
import { Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

import Loader from './common/Loader';
import PageTitle from './components/PageTitle';
import ProtectedRoute from './components/ProtectedRoute';
import SignIn from './pages/Authentication/SignIn';
import SignUp from './pages/Authentication/SignUp';
import Calendar from './pages/Calendar';
import Chart from './pages/Chart';
import Dashboard from './pages/Dashboard/Dashboard';
import FormElements from './pages/Form/FormElements';
import FormLayout from './pages/Form/FormLayout';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Tables from './pages/Tables';
import Alerts from './pages/UiElements/Alerts';
import Buttons from './pages/UiElements/Buttons';
import AI from './pages/AI/AI';
import Portfolio from './pages/Portfolio/Portfolio';
import Watchlist from './pages/Watchlist/Watchlist';
import About from './pages/About/About';
import DefaultLayout from './layout/DefaultLayout';

function App() {
  const [loading, setLoading] = useState(true);
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  return loading ? (
    <Loader />
  ) : (
    <AuthProvider>
      <Routes>
        {/* Public Routes - Login and Signup */}
        <Route
          path="/login"
          element={
            <>
              <PageTitle title="Signin | Money Talks - AI-Powered Investment Portfolio" />
              <SignIn />
            </>
          }
        />
        <Route
          path="/signup"
          element={
            <>
              <PageTitle title="Signup | Money Talks - AI-Powered Investment Portfolio" />
              <SignUp />
            </>
          }
        />

        {/* Protected Routes - Require Authentication */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DefaultLayout>
                <Navigate to="/dashboard" replace />
              </DefaultLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DefaultLayout>
                <PageTitle title="Dashboard | Money Talks - AI-Powered Investment Portfolio" />
                <Dashboard />
              </DefaultLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <DefaultLayout>
                <PageTitle title="Calendar | Money Talks - AI-Powered Investment Portfolio" />
                <Calendar />
              </DefaultLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <DefaultLayout>
                <PageTitle title="Profile | Money Talks - AI-Powered Investment Portfolio" />
                <Profile />
              </DefaultLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/portfolio"
          element={
            <ProtectedRoute>
              <DefaultLayout>
                <PageTitle title="Portfolio | Money Talks - AI-Powered Investment Portfolio" />
                <Portfolio />
              </DefaultLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/watchlist"
          element={
            <ProtectedRoute>
              <DefaultLayout>
                <PageTitle title="Watchlist | Money Talks - AI-Powered Investment Portfolio" />
                <Watchlist />
              </DefaultLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/about"
          element={
            <ProtectedRoute>
              <DefaultLayout>
                <PageTitle title="About | Money Talks - AI-Powered Investment Portfolio" />
                <About />
              </DefaultLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai"
          element={
            <ProtectedRoute>
              <DefaultLayout>
                <PageTitle title="AI Assistant | Money Talks - AI-Powered Investment Portfolio" />
                <AI />
              </DefaultLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/forms/form-elements"
          element={
            <ProtectedRoute>
              <DefaultLayout>
                <PageTitle title="Form Elements | Money Talks - AI-Powered Investment Portfolio" />
                <FormElements />
              </DefaultLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/forms/form-layout"
          element={
            <ProtectedRoute>
              <DefaultLayout>
                <PageTitle title="Form Layout | Money Talks - AI-Powered Investment Portfolio" />
                <FormLayout />
              </DefaultLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tables"
          element={
            <ProtectedRoute>
              <DefaultLayout>
                <PageTitle title="Tables | Money Talks - AI-Powered Investment Portfolio" />
                <Tables />
              </DefaultLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <DefaultLayout>
                <PageTitle title="Settings | Money Talks - AI-Powered Investment Portfolio" />
                <Settings />
              </DefaultLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/chart"
          element={
            <ProtectedRoute>
              <DefaultLayout>
                <PageTitle title="Basic Chart | Money Talks - AI-Powered Investment Portfolio" />
                <Chart />
              </DefaultLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/ui/alerts"
          element={
            <ProtectedRoute>
              <DefaultLayout>
                <PageTitle title="Alerts | Money Talks - AI-Powered Investment Portfolio" />
                <Alerts />
              </DefaultLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/ui/buttons"
          element={
            <ProtectedRoute>
              <DefaultLayout>
                <PageTitle title="Buttons | Money Talks - AI-Powered Investment Portfolio" />
                <Buttons />
              </DefaultLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

export default App;
