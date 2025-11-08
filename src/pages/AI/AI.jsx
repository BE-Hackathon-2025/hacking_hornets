import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getUserConversations,
  createConversation,
  addMessage,
  deleteConversation,
  createPortfolio,
  getUserPortfolios,
  updatePortfolio,
  buyShares,
  getUserCash,
  updateUserCash
} from '../../services/firestoreService';
import { getPortfolioAdvice, getFinanceQA } from '../../services/fastApiService';
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

  // Helper function to detect if query is portfolio-related
  const isPortfolioQuery = (query) => {
    const lowerQuery = query.toLowerCase();
    // Only detect as portfolio query if user explicitly mentions "portfolio"
    return lowerQuery.includes('portfolio');
  };

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
            id: `msg-${msg.timestamp?.seconds || Date.now()}-${idx}-${Math.random()}`,
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

  // Helper function to parse agent output and extract portfolio data
  const parseAgentOutput = (responseText) => {
    try {
      console.log('🔍 Parsing agent output:', responseText);
      
      // Look for AgentRunResult pattern
      const agentResultMatch = responseText.match(/AgentRunResult\(output=PortfolioModel\(portfolio=\[(.*?)\]\)\)/s);
      
      if (agentResultMatch) {
        console.log('✅ Found AgentRunResult pattern');
        const portfolioContent = agentResultMatch[1];
        console.log('📦 Portfolio content:', portfolioContent);
        const assets = [];
        
        // Extract individual AssetModel entries
        const assetPattern = /AssetModel\(name='([^']+)',\s*symbol='([^']+)',\s*shares=(\d+),\s*avgPrice=([\d.]+)\)/g;
        let match;
        
        while ((match = assetPattern.exec(portfolioContent)) !== null) {
          const asset = {
            name: match[1],
            symbol: match[2],
            shares: parseInt(match[3]),
            avgPrice: parseFloat(match[4])
          };
          console.log('📈 Extracted asset:', asset);
          assets.push(asset);
        }
        
        console.log(`✅ Total assets extracted: ${assets.length}`, assets);
        return assets.length > 0 ? assets : null;
      } else {
        console.log('❌ No AgentRunResult pattern found in response');
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error parsing agent output:', error);
      return null;
    }
  };

  // Helper function to clean AI response text
  const cleanAIResponse = (responseText) => {
    // Remove AgentRunResult pattern
    let cleaned = responseText.replace(/AgentRunResult\(output=PortfolioModel\(portfolio=\[.*?\]\)\)/s, '').trim();
    
    // Replace escaped newlines with actual newlines
    cleaned = cleaned.replace(/\\n/g, '\n');
    
    // Remove common AI preambles and verbose text
    cleaned = cleaned.replace(/Based on your query:.*?\n/i, '').trim();
    cleaned = cleaned.replace(/After analyzing your current holdings and market conditions,?\s*/gi, '').trim();
    cleaned = cleaned.replace(/I recommend the following portfolio adjustments:?\s*/gi, '').trim();
    cleaned = cleaned.replace(/I recommend starting with a diversified portfolio focusing on.*?:\s*/gi, '').trim();
    cleaned = cleaned.replace(/These additions will enhance your portfolio.*?\./gi, '').trim();
    cleaned = cleaned.replace(/These stocks provide.*?\./gi, '').trim();
    cleaned = cleaned.replace(/Here's what I think:?\s*/gi, '').trim();
    cleaned = cleaned.replace(/Let me explain:?\s*/gi, '').trim();
    
    // Remove extra spaces and clean up
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
    
    // Remove any remaining escaped quotes
    cleaned = cleaned.replace(/\\"/g, '"');
    
    // Remove leading/trailing whitespace from each line
    cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');
    
    return cleaned;
  };

  // Function to create/update portfolio from AI recommendations
  const handlePortfolioUpdate = async (assets) => {
    try {
      console.log('💼 Starting portfolio update with assets:', assets);
      
      if (!assets || assets.length === 0) {
        console.log('❌ No assets to update');
        return;
      }

      // Get user's current cash balance
      const cashResult = await getUserCash(currentUser.uid);
      if (!cashResult.success) {
        toast.error('Failed to check available cash');
        return;
      }
      
      const availableCash = cashResult.cashAvailable;
      console.log('💰 Available cash:', availableCash);

      // Calculate total cost of new purchases
      let totalCost = 0;
      const portfoliosResult = await getUserPortfolios(currentUser.uid);
      const currentPortfolio = portfoliosResult.success && portfoliosResult.data.length > 0 
        ? portfoliosResult.data[0] 
        : null;
      const currentHoldings = currentPortfolio?.holdings || [];

      for (const asset of assets) {
        const existingHolding = currentHoldings.find(h => h.symbol === asset.symbol);
        
        if (existingHolding) {
          // If increasing shares, calculate additional cost
          const additionalShares = asset.shares - existingHolding.shares;
          if (additionalShares > 0) {
            totalCost += additionalShares * asset.avgPrice;
            console.log(`📈 ${asset.symbol}: Adding ${additionalShares} shares @ $${asset.avgPrice} = $${additionalShares * asset.avgPrice}`);
          }
        } else {
          // New purchase
          totalCost += asset.shares * asset.avgPrice;
          console.log(`🆕 ${asset.symbol}: ${asset.shares} shares @ $${asset.avgPrice} = $${asset.shares * asset.avgPrice}`);
        }
      }

      console.log(`💵 Total cost: $${totalCost.toFixed(2)}`);
      console.log(`💰 Available cash: $${availableCash.toFixed(2)}`);

      // Check if user has enough cash
      if (totalCost > availableCash) {
        const shortfall = totalCost - availableCash;
        toast.error(`Insufficient funds! You need $${totalCost.toFixed(2)} but only have $${availableCash.toFixed(2)}. Short by $${shortfall.toFixed(2)}`);
        console.log('❌ Insufficient funds for portfolio update');
        
        // Add a message to chat explaining the issue
        const errorMessage = {
          id: messages.length + 1,
          text: `❌ Cannot complete portfolio update.\n\nRequired: $${totalCost.toFixed(2)}\nAvailable: $${availableCash.toFixed(2)}\nShortfall: $${shortfall.toFixed(2)}\n\nPlease adjust your portfolio request or add more funds.`,
          sender: 'ai',
          role: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, errorMessage]);
        return;
      }

      // Get user's portfolios
      console.log('📂 Fetching user portfolios...');
      
      let portfolioId;
      
      if (!portfoliosResult.success || portfoliosResult.data.length === 0) {
        // Create new portfolio
        console.log('📝 Creating new portfolio...');
        const newPortfolioResult = await createPortfolio(currentUser.uid, {
          name: 'AI Recommended Portfolio',
          description: 'Portfolio created from AI recommendations',
          holdings: []
        });
        
        if (newPortfolioResult.success) {
          portfolioId = newPortfolioResult.portfolioId;
          console.log('✅ Portfolio created with ID:', portfolioId);
          toast.success('Created new portfolio!');
        } else {
          throw new Error('Failed to create portfolio');
        }
      } else {
        // Use the first portfolio
        portfolioId = portfoliosResult.data[0].id;
        console.log('📁 Using existing portfolio ID:', portfolioId);
      }

      // Add each asset to the portfolio using updatePortfolio to directly modify holdings
      console.log(`📊 Adding ${assets.length} assets to portfolio...`);
      const updatedHoldings = [...currentHoldings];
      
      // Add or update holdings
      for (const asset of assets) {
        console.log('➕ Processing asset:', asset);
        const existingIndex = updatedHoldings.findIndex(h => h.symbol === asset.symbol);
        
        if (existingIndex >= 0) {
          // Update existing holding
          updatedHoldings[existingIndex] = {
            symbol: asset.symbol,
            name: asset.name,
            shares: asset.shares,
            avgPrice: asset.avgPrice
          };
          console.log('✏️ Updated existing holding:', asset.symbol);
        } else {
          // Add new holding
          updatedHoldings.push({
            symbol: asset.symbol,
            name: asset.name,
            shares: asset.shares,
            avgPrice: asset.avgPrice
          });
          console.log('➕ Added new holding:', asset.symbol);
        }
      }

      // Update portfolio with new holdings
      await updatePortfolio(currentUser.uid, portfolioId, {
        holdings: updatedHoldings
      });

      // Deduct the cost from user's cash
      await updateUserCash(currentUser.uid, -totalCost);
      console.log(`💸 Deducted $${totalCost.toFixed(2)} from cash balance`);
      
      const newBalance = availableCash - totalCost;
      console.log(`💰 New cash balance: $${newBalance.toFixed(2)}`);

      console.log('🎉 All assets added successfully!');
      toast.success(`Successfully added ${assets.length} stock(s) to your portfolio!`);
      
    } catch (error) {
      console.error('❌ Error updating portfolio:', error);
      toast.error('Failed to update portfolio from AI recommendations');
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
          id: `welcome-${Date.now()}-${Math.random()}`,
          text: "Hello! I'm your InnoVest AI assistant. I analyze your investment needs and provide personalized portfolio recommendations. Whether you're starting fresh or optimizing existing holdings, I'll help you make informed investment decisions. Ask me anything about investing!",
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
        id: `user-${Date.now()}-${Math.random()}`,
        text: userInput,
        sender: 'user',
        role: 'user',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, userMessage]);

      // Add loading message bubble
      const loadingMessage = {
        id: `loading-${Date.now()}-${Math.random()}`,
        text: 'thinking...',
        sender: 'ai',
        role: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isLoading: true
      };
      setMessages(prev => [...prev, loadingMessage]);

      // Save user message to Firestore
      console.log('Saving user message to conversation:', conversationId);
      await addMessage(currentUser.uid, conversationId, {
        role: 'user',
        content: userInput
      });
      console.log('User message saved successfully');

      // Detect if query is portfolio-related or general finance question
      const isPortfolioRelated = isPortfolioQuery(userInput);
      console.log('Query type:', isPortfolioRelated ? 'Portfolio-related' : 'General finance');

      try {
        let aiResponseText;
        
        if (isPortfolioRelated) {
          // Portfolio-related query: use agent_a or agent_b
          // Fetch user's current portfolio to send to agent_b
          let currentPortfolio = null;
          const portfoliosResult = await getUserPortfolios(currentUser.uid);
          
          if (portfoliosResult.success && portfoliosResult.data.length > 0) {
            // Get the first portfolio's holdings
            const portfolio = portfoliosResult.data[0];
            currentPortfolio = portfolio.holdings || [];
            console.log('📊 Sending portfolio to AI:', currentPortfolio);
          } else {
            console.log('📭 No portfolio found, will use agent_a');
          }
          
          // Get user's available cash to ensure AI stays within budget
          const cashResult = await getUserCash(currentUser.uid);
          const availableCash = (cashResult.success && cashResult.cashAvailable !== undefined) 
            ? cashResult.cashAvailable 
            : 0;
          console.log(`💰 User has $${availableCash.toFixed(2)} available cash`);
          
          // Add budget constraint to the query
          const budgetQuery = `${userInput}\n\nIMPORTANT: The user has $${availableCash.toFixed(2)} available cash. Do not recommend purchases exceeding this amount.`;
          
          const result = await getPortfolioAdvice(budgetQuery, currentPortfolio, currentUser.uid, availableCash);
          
          if (result.success) {
            aiResponseText = result.data || "I analyzed your request, but couldn't format the response properly.";
            
            // Parse agent output for portfolio recommendations
            const portfolioAssets = parseAgentOutput(aiResponseText);
            
            if (portfolioAssets && portfolioAssets.length > 0) {
              // Calculate total cost for display
              const totalCost = portfolioAssets.reduce((sum, asset) => 
                sum + (asset.shares * asset.avgPrice), 0
              );
              
              console.log(`🔍 AI recommended portfolio cost: $${totalCost.toFixed(2)}`);
              console.log(`💰 Available cash: $${availableCash.toFixed(2)}`);
              
              // Automatically apply the portfolio updates regardless of cost
              await handlePortfolioUpdate(portfolioAssets);
              
              // Build detailed message showing what changed
              let detailsMessage = '✅ Portfolio updated!\n\n';
              detailsMessage += 'Added/Updated stocks:\n';
              let totalSpent = 0;
              portfolioAssets.forEach(asset => {
                const cost = asset.shares * asset.avgPrice;
                totalSpent += cost;
                detailsMessage += `• ${asset.name} (${asset.symbol}): ${asset.shares} shares @ $${asset.avgPrice.toFixed(2)} = $${cost.toFixed(2)}\n`;
              });
              detailsMessage += `\nTotal invested: $${totalSpent.toFixed(2)}`;
              
              // Show warning if exceeded budget
              if (totalCost > availableCash) {
                const shortfall = totalCost - availableCash;
                detailsMessage += `\n⚠️ Note: This exceeds your available cash by $${shortfall.toFixed(2)}`;
                detailsMessage += `\nNew balance: -$${(totalSpent - availableCash).toFixed(2)}`;
              } else {
                detailsMessage += `\nRemaining cash: $${(availableCash - totalSpent).toFixed(2)}`;
              }
              
              aiResponseText = detailsMessage;
            } else {
              // Clean the response text only if no portfolio update
              aiResponseText = cleanAIResponse(aiResponseText);
            }
          } else {
            aiResponseText = "I'm sorry, I encountered an error while processing your request. Please make sure the backend server is running and try again.";
          }
        } else {
          // General finance question: use OpenAI Q&A
          const result = await getFinanceQA(userInput);
          
          if (result.success) {
            aiResponseText = result.data || "I couldn't generate a response to your question.";
          } else {
            aiResponseText = "I'm sorry, I encountered an error while processing your question. Please try again.";
          }
        }

        // Remove loading message and add actual response
        setMessages(prev => prev.filter(msg => !msg.isLoading));

        const aiMessage = {
          id: `ai-${Date.now()}-${Math.random()}`,
          text: aiResponseText,
          sender: 'ai',
          role: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        setMessages(prev => [...prev, aiMessage]);
        
        // Save AI message to Firestore
        await addMessage(currentUser.uid, conversationId, {
          role: 'assistant',
          content: aiMessage.text
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error getting AI response:', error);
        
        // Remove loading message
        setMessages(prev => prev.filter(msg => !msg.isLoading));
        
        const errorMessage = {
          id: `error-${Date.now()}-${Math.random()}`,
          text: "I'm sorry, I couldn't connect to the AI service. Please make sure the backend is running on http://localhost:8000",
          sender: 'ai',
          role: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, errorMessage]);
        setLoading(false);
      }
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
      id: `conv-${conversation.id}-${msg.timestamp?.seconds || Date.now()}-${idx}-${Math.random()}`,
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
                          {message.isLoading ? (
                            <div className="flex items-center gap-2">
                              <div className="flex gap-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                              </div>
                              <span className="text-sm text-gray-500 dark:text-gray-400">Thinking...</span>
                            </div>
                          ) : (
                            <>
                              <p className={`text-sm whitespace-pre-wrap ${message.sender === 'user' ? 'text-white' : 'text-black dark:text-white'}`}>
                                {message.text}
                              </p>
                              <span
                                className={`mt-1 block text-xs ${
                                  message.sender === 'user' ? 'text-white opacity-80' : 'text-bodydark'
                                }`}
                              >
                                {message.timestamp}
                              </span>
                            </>
                          )}
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
