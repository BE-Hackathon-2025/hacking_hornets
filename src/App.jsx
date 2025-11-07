import { useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';

import Loader from './common/Loader';
import PageTitle from './components/PageTitle';
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
    <DefaultLayout>
      <Routes>
        <Route
          path="/dashboard"
          element={
            <>
              <PageTitle title="Dashboard | Money Talks - AI-Powered Investment Portfolio" />
              <Dashboard />
            </>
          }
        />
        <Route
          path="/calendar"
          element={
            <>
              <PageTitle title="Calendar | Money Talks - AI-Powered Investment Portfolio" />
              <Calendar />
            </>
          }
        />
        <Route
          path="/profile"
          element={
            <>
              <PageTitle title="Profile | Money Talks - AI-Powered Investment Portfolio" />
              <Profile />
            </>
          }
        />
        <Route
          path="/portfolio"
          element={
            <>
              <PageTitle title="Portfolio | Money Talks - AI-Powered Investment Portfolio" />
              <Portfolio />
            </>
          }
        />
        <Route
          path="/watchlist"
          element={
            <>
              <PageTitle title="Watchlist | Money Talks - AI-Powered Investment Portfolio" />
              <Watchlist />
            </>
          }
        />
        <Route
          path="/about"
          element={
            <>
              <PageTitle title="About | Money Talks - AI-Powered Investment Portfolio" />
              <About />
            </>
          }
        />
        <Route
          path="/ai"
          element={
            <>
              <PageTitle title="AI Assistant | Money Talks - AI-Powered Investment Portfolio" />
              <AI />
            </>
          }
        />
        <Route
          path="/forms/form-elements"
          element={
            <>
              <PageTitle title="Form Elements | Money Talks - AI-Powered Investment Portfolio" />
              <FormElements />
            </>
          }
        />
        <Route
          path="/forms/form-layout"
          element={
            <>
              <PageTitle title="Form Layout | Money Talks - AI-Powered Investment Portfolio" />
              <FormLayout />
            </>
          }
        />
        <Route
          path="/tables"
          element={
            <>
              <PageTitle title="Tables | Money Talks - AI-Powered Investment Portfolio" />
              <Tables />
            </>
          }
        />
        <Route
          path="/settings"
          element={
            <>
              <PageTitle title="Settings | Money Talks - AI-Powered Investment Portfolio" />
              <Settings />
            </>
          }
        />
        <Route
          path="/chart"
          element={
            <>
              <PageTitle title="Basic Chart | Money Talks - AI-Powered Investment Portfolio" />
              <Chart />
            </>
          }
        />
        <Route
          path="/ui/alerts"
          element={
            <>
              <PageTitle title="Alerts | Money Talks - AI-Powered Investment Portfolio" />
              <Alerts />
            </>
          }
        />
        <Route
          path="/ui/buttons"
          element={
            <>
              <PageTitle title="Buttons | Money Talks - AI-Powered Investment Portfolio" />
              <Buttons />
            </>
          }
        />
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
      </Routes>
    </DefaultLayout>
  );
}

export default App;
