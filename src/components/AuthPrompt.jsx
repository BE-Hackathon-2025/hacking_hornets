import React from 'react';

const AuthPrompt = ({ 
  title = "Welcome to Money Talk",
  message = "Please sign in to access your personalized dashboard and features.",
  primaryButtonText = "Get Started",
  secondaryButtonText = "Sign In",
  onPrimaryClick = () => window.location.href = '/signup',
  onSecondaryClick = () => window.location.href = '/login',
  showSecondaryButton = true
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white dark:bg-boxdark shadow-xl rounded-2xl p-8 border border-gray-200 dark:border-strokedark">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {title}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            {message}
          </p>
          <div className="space-y-4">
            <button
              onClick={onPrimaryClick}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200"
            >
              {primaryButtonText}
            </button>
            {showSecondaryButton && (
              <button
                onClick={onSecondaryClick}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200"
              >
                {secondaryButtonText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPrompt;