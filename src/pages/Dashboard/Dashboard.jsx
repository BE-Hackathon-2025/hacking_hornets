import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getUserPortfolios } from '../../services/firestoreService';
import ChartOne from '../../components/Charts/ChartOne';
import ChartThree from '../../components/Charts/ChartThree';
import AppleNews from '../../components/News/AppleNews';
import ChartFour from '../../components/Charts/ChartFour';
import TableOne from '../../components/Tables/TableOne';
import AuthPrompt from '../../components/AuthPrompt';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from "../../firebase/config";

const Dashboard = () => {
  const { currentUser } = useAuth();
  const [user, isloading] = useAuthState(auth);
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      fetchPortfolio();
    }
  }, [currentUser]);

  const fetchPortfolio = async () => {
    try {
      const result = await getUserPortfolios(currentUser.uid);
      if (result.success && result.data.length > 0) {
        setPortfolio(result.data[0]);
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isloading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-boxdark-2">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthPrompt />;
  }
  
  return (
    <>
      <div className="grid grid-cols-12 gap-4 md:gap-6 2xl:gap-7.5">
        <ChartOne portfolio={portfolio} />
        <AppleNews />
        <ChartThree portfolio={portfolio} />
        <ChartFour />
      </div>
    </>
  );
};

export default Dashboard;
