import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getUserConversations,
  createConversation,
  addMessage,
  deleteConversation
} from '../../services/firestoreService';
import toast from 'react-hot-toast';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import StocksSidebar from '../../components/Stocks/StocksSidebar';
import AuthPrompt from '../../components/AuthPrompt';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from "../../firebase/config";

const AI = () => {
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);

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

  // Load conversations on mount
  useEffect(() => {
    if (currentUser) {
      loadConversations();
    }
  }, [currentUser]);

  const loadConversations = async () => {
    try {
      const result = await getUserConversations(currentUser.uid);
      if (result.success) {
        setConversations(result.data);
        if (result.data.length > 0 && !currentConversation) {
          // Load the most recent conversation only if no conversation is current
          setCurrentConversation(result.data[0]);
          setMessages(result.data[0].messages.map((msg, idx) => ({
            ...msg,
            id: idx + 1,
            text: msg.content,
            sender: msg.role === 'user' ? 'user' : 'ai',
            timestamp: msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          })));
        }
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Failed to load conversations');
    }
  };

  const startNewConversation = async () => {
    try {
      setLoading(true);
      const title = `Conversation ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
      const result = await createConversation(currentUser.uid, title);
      
      if (result.success) {
        // Create default welcome message
        const welcomeMessage = {
          id: 1,
          text: "Hello! I'm your Money Talks AI assistant. I can help you with investment strategies, portfolio analysis, market insights, and answer questions about your holdings. How can I assist you today?",
          sender: 'ai',
          role: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        // Save welcome message to Firestore
        await addMessage(currentUser.uid, result.conversationId, {
          role: 'assistant',
          content: welcomeMessage.text
        });
        
        // Set the new conversation as current with welcome message
        const newConversation = {
          id: result.conversationId,
          title: title,
          messages: [welcomeMessage]
        };
        setCurrentConversation(newConversation);
        setMessages([welcomeMessage]);
        
        // Reload conversations list without changing current conversation
        const convResult = await getUserConversations(currentUser.uid);
        if (convResult.success) {
          setConversations(convResult.data);
        }
        
        toast.success('New conversation started');
        return result.conversationId;
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (inputMessage.trim() === '' || loading) return;

    try {
      setLoading(true);

      // Store the user input before clearing
      const userInput = inputMessage;
      setInputMessage('');

      // If no current conversation, create one first
      let conversationId = currentConversation?.id;
      if (!conversationId) {
        const newConvId = await startNewConversation();
        if (!newConvId) {
          setLoading(false);
          return;
        }
        conversationId = newConvId;
      }

      // Add user message to UI
      const userMessage = {
        id: messages.length + 1,
        text: userInput,
        sender: 'user',
        role: 'user',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, userMessage]);

      // Save user message to Firestore
      console.log('Saving user message to conversation:', conversationId);
      await addMessage(currentUser.uid, conversationId, {
        role: 'user',
        content: userInput
      });
      console.log('User message saved successfully');

      // Simulate AI response after a short delay
      setTimeout(async () => {
        const aiMessage = {
          id: messages.length + 2,
          text: "Thank you for your message! This is a demo AI response. In a real application, this would be connected to an AI service like OpenAI or Google Gemini.",
          sender: 'ai',
          role: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        setMessages(prev => [...prev, aiMessage]);
        
        // Save AI message to Firestore
        console.log('Saving AI response to conversation:', conversationId);
        await addMessage(currentUser.uid, conversationId, {
          role: 'assistant',
          content: aiMessage.text
        });
        console.log('AI response saved successfully');
        
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      setLoading(false);
    }
  };

  const handleDeleteConversation = async (conversationId) => {
    try {
      await deleteConversation(currentUser.uid, conversationId);
      toast.success('Conversation deleted');
      await loadConversations();
      
      // If deleted conversation was current, reset
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
    }
  };

  const handleLoadConversation = (conversation) => {
    setCurrentConversation(conversation);
    const formattedMessages = conversation.messages.map((msg, idx) => ({
      ...msg,
      id: idx + 1,
      text: msg.content,
      sender: msg.role === 'user' ? 'user' : 'ai',
      timestamp: msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));
    setMessages(formattedMessages);
  };

  return (
    <>
      <Breadcrumb pageName="AI Assistant" />

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* Main Chat Area - Takes up 8 columns on large screens */}
        <div className="col-span-12 xl:col-span-8">
          <div className="flex flex-col gap-9">
            {/* Chat Container */}
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark flex justify-between items-center">
                <h3 className="font-medium text-black dark:text-white">
                  AI Chat Interface
                </h3>
                <button
                  onClick={startNewConversation}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
                >
                  <svg className="fill-current" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1V15M1 8H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  New Chat
                </button>
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
                      disabled={loading}
                      className="flex items-center justify-center rounded-lg bg-primary px-6 py-3 font-medium text-white hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                      <span className="ml-2">{loading ? 'Sending...' : 'Send'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Conversation History */}
            {conversations.length > 0 && (
              <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
                <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
                  <h3 className="font-medium text-black dark:text-white">
                    Conversation History
                  </h3>
                </div>
                <div className="p-6.5">
                  <div className="flex flex-col gap-2">
                    {conversations.map((conv) => (
                      <div
                        key={conv.id}
                        className={`flex items-center justify-between p-3 rounded border cursor-pointer transition-colors ${
                          currentConversation?.id === conv.id
                            ? 'border-primary bg-primary bg-opacity-10 dark:bg-opacity-20'
                            : 'border-stroke dark:border-strokedark hover:bg-gray-2 dark:hover:bg-meta-4'
                        }`}
                      >
                        <div 
                          className="flex-1"
                          onClick={() => handleLoadConversation(conv)}
                        >
                          <p className="text-sm font-medium text-black dark:text-white">
                            {conv.title}
                          </p>
                          <p className="text-xs text-bodydark">
                            {conv.messages?.length || 0} messages
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteConversation(conv.id);
                          }}
                          className="text-danger hover:text-opacity-80"
                          title="Delete conversation"
                        >
                          <svg className="fill-current" width="18" height="18" viewBox="0 0 18 18">
                            <path d="M13.7535 2.47502H11.5879V1.9969C11.5879 1.15315 10.9129 0.478149 10.0691 0.478149H7.90352C7.05977 0.478149 6.38477 1.15315 6.38477 1.9969V2.47502H4.21914C3.40352 2.47502 2.72852 3.15002 2.72852 3.96565V4.8094C2.72852 5.42815 3.09414 5.9344 3.62852 6.1594L4.07852 15.4688C4.13477 16.6219 5.09102 17.5219 6.24414 17.5219H11.7004C12.8535 17.5219 13.8098 16.6219 13.866 15.4688L14.3441 6.13127C14.8785 5.90627 15.2441 5.3719 15.2441 4.78127V3.93752C15.2441 3.15002 14.5691 2.47502 13.7535 2.47502ZM7.67852 1.9969C7.67852 1.85627 7.79102 1.74377 7.93164 1.74377H10.0973C10.2379 1.74377 10.3504 1.85627 10.3504 1.9969V2.47502H7.70664V1.9969H7.67852ZM4.02227 3.96565C4.02227 3.85315 4.10664 3.74065 4.24727 3.74065H13.7535C13.866 3.74065 13.9785 3.82502 13.9785 3.96565V4.8094C13.9785 4.9219 13.8941 5.0344 13.7535 5.0344H4.24727C4.13477 5.0344 4.02227 4.95002 4.02227 4.8094V3.96565ZM11.7285 16.2563H6.27227C5.79414 16.2563 5.40039 15.8906 5.37227 15.3844L4.95039 6.2719H13.0785L12.6566 15.3844C12.6004 15.8625 12.2066 16.2563 11.7285 16.2563Z"/>
                            <path d="M9.00039 9.11255C8.66289 9.11255 8.35352 9.3938 8.35352 9.75942V13.3313C8.35352 13.6688 8.63477 13.9782 9.00039 13.9782C9.33789 13.9782 9.64727 13.6969 9.64727 13.3313V9.75942C9.64727 9.3938 9.33789 9.11255 9.00039 9.11255Z"/>
                            <path d="M11.2502 9.67504C10.8846 9.64692 10.6033 9.90004 10.5752 10.2657L10.4064 12.7407C10.3783 13.0782 10.6314 13.3875 10.9971 13.4157C11.0252 13.4157 11.0252 13.4157 11.0533 13.4157C11.3908 13.4157 11.6721 13.1625 11.6721 12.825L11.8408 10.35C11.8408 9.98442 11.5877 9.70317 11.2502 9.67504Z"/>
                            <path d="M6.72245 9.67504C6.38495 9.70317 6.1037 10.0125 6.13182 10.35L6.3287 12.825C6.35683 13.1625 6.63808 13.4157 6.94745 13.4157C6.97558 13.4157 6.97558 13.4157 7.0037 13.4157C7.3412 13.3875 7.62245 13.0782 7.59433 12.7407L7.39745 10.2657C7.39745 9.90004 7.08808 9.64692 6.72245 9.67504Z"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Stocks Sidebar - Takes up 4 columns on large screens */}
        <div className="col-span-12 xl:col-span-4">
          <StocksSidebar />
        </div>
      </div>
    </>
  );
};

export default AI;
