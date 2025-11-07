import React from 'react';
import ChartOne from '../../components/Charts/ChartOne';
import ChartThree from '../../components/Charts/ChartThree';
import ChartTwo from '../../components/Charts/ChartTwo';
import ChartFour from '../../components/Charts/ChartFour';
import TableOne from '../../components/Tables/TableOne';

const Dashboard = () => {
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
