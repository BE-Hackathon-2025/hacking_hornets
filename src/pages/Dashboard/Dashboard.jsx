import React from 'react';
import ChartOne from '../../components/Charts/ChartOne';
import ChartThree from '../../components/Charts/ChartThree';
import ChartTwo from '../../components/Charts/ChartTwo';
import ChartFour from '../../components/Charts/ChartFour';
import TableOne from '../../components/Tables/TableOne';
import AuthPrompt from '../../components/AuthPrompt';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from "../../firebase/config";

const Dashboard = () => {

  const [user, isloading] = useAuthState(auth);

  if (isloading) {
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
        <ChartOne />
        <ChartTwo />
        <ChartThree />
        <ChartFour />
        <div className="col-span-12">
          <TableOne />
        </div>
      </div>
    </>
  );
};

export default Dashboard;
