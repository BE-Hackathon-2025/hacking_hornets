import React, { useState } from 'react';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';

const AI = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your AI assistant. How can I help you today?",
      sender: 'ai',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');

  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (inputMessage.trim() === '') return;

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      text: inputMessage,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages([...messages, userMessage]);
    setInputMessage('');

    // Simulate AI response after a short delay
    setTimeout(() => {
      const aiMessage = {
        id: messages.length + 2,
        text: "Thank you for your message! This is a demo AI response. In a real application, this would be connected to an AI service.",
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMessage]);
    }, 1000);
  };

  return (
    <>
      <Breadcrumb pageName="AI Assistant" />

      <div className="flex flex-col gap-9">
        {/* Chat Container */}
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
            <h3 className="font-medium text-black dark:text-white">
              AI Chat Interface
            </h3>
          </div>

          <div className="p-6.5">
            {/* Messages Area */}
            <div className="mb-6 h-[500px] overflow-y-auto rounded-sm border border-stroke bg-gray p-4 dark:border-strokedark dark:bg-meta-4">
              <div className="flex flex-col gap-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-3 ${
                        message.sender === 'user'
                          ? 'bg-primary text-white'
                          : 'bg-white dark:bg-boxdark border border-stroke dark:border-strokedark'
                      }`}
                    >
                      <p className={`text-sm ${message.sender === 'user' ? 'text-white' : 'text-black dark:text-white'}`}>
                        {message.text}
                      </p>
                      <span
                        className={`mt-1 block text-xs ${
                          message.sender === 'user' ? 'text-white opacity-80' : 'text-bodydark'
                        }`}
                      >
                        {message.timestamp}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage}>
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type your message here..."
                    className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>
                <button
                  type="submit"
                  className="flex items-center justify-center rounded-lg bg-primary px-6 py-3 font-medium text-white hover:bg-opacity-90 transition"
                >
                  <svg
                    className="fill-current"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M2.5 10.625L18.125 2.5L10 18.125L8.125 11.875L2.5 10.625Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="ml-2">Send</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Info Card */}
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
            <h3 className="font-medium text-black dark:text-white">
              About This AI Assistant
            </h3>
          </div>
          <div className="p-6.5">
            <p className="text-black dark:text-white">
              This is a demo AI chat interface. In a production environment, you would integrate
              this with an AI service like OpenAI's GPT, Google's Gemini, or other AI APIs to
              provide intelligent responses to user queries.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 rounded-full bg-success"></span>
                <span className="text-sm text-bodydark dark:text-bodydark">Connected</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 rounded-full bg-primary"></span>
                <span className="text-sm text-bodydark dark:text-bodydark">Demo Mode Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AI;
