import React from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from "../../firebase/config";
import { signOut } from 'firebase/auth';
import AuthPrompt from '../../components/AuthPrompt';

export default function Home() {
  const [user, loading] = useAuthState(auth);

  if (loading) {
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
    <div className="min-h-screen bg-gray-50 dark:bg-boxdark-2 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Welcome Header */}
        <div className="bg-white dark:bg-boxdark shadow-lg rounded-2xl p-8 mb-8 border border-gray-200 dark:border-strokedark">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome back, {user.displayName || user.email}!
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            We're glad to see you again. Here's what's happening today.
          </p>
        </div>

        {/* Quick Stats/Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-boxdark shadow-md rounded-xl p-6 border border-gray-200 dark:border-strokedark">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Recent Activity
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Check your latest updates and notifications
            </p>
          </div>
          
          <div className="bg-white dark:bg-boxdark shadow-md rounded-xl p-6 border border-gray-200 dark:border-strokedark">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Your Profile
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Manage your account settings and preferences
            </p>
          </div>
          
          <div className="bg-white dark:bg-boxdark shadow-md rounded-xl p-6 border border-gray-200 dark:border-strokedark">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Quick Actions
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Access frequently used features
            </p>
          </div>
        </div>

        {/* Recent Items or Quick Links */}
        <div className="bg-white dark:bg-boxdark shadow-md rounded-2xl p-6 border border-gray-200 dark:border-strokedark">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Get Started
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button className="text-left p-4 border border-gray-200 dark:border-strokedark rounded-lg hover:bg-gray-50 dark:hover:bg-boxdark-2 transition duration-200">
              <h3 className="font-semibold text-gray-900 dark:text-white">Explore Features</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Discover what you can do with our app
              </p>
            </button>
            
            <button className="text-left p-4 border border-gray-200 dark:border-strokedark rounded-lg hover:bg-gray-50 dark:hover:bg-boxdark-2 transition duration-200">
              <h3 className="font-semibold text-gray-900 dark:text-white">View Documentation</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Learn how to make the most of our platform
              </p>
            </button>
          </div>
        </div>

        {/* Sign Out Button */}
        <div className="text-center mt-8">
          <button
            onClick={() => signOut(auth)}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-6 rounded-lg transition duration-200"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}