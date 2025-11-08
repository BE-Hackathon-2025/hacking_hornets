# 🦅 InnoVest - AI-Powered Investment Platform

![InnoVest Banner](https://img.shields.io/badge/InnoVest-AI%20Investment%20Platform-blue?style=for-the-badge)
![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=flat-square&logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?style=flat-square&logo=fastapi)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=flat-square&logo=firebase)

InnoVest is an intelligent investment platform that leverages AI agents to provide personalized portfolio recommendations and rebalancing strategies. Built with React, FastAPI, and powered by GPT-4, it offers real-time market analysis, sentiment tracking, and automated portfolio management.

## 🌟 Features

### 🤖 Dual AI Agent System
- **Agent A**: For new investors - Recommends initial portfolio based on ChromaDB stock database
- **Agent B**: For existing portfolios - Analyzes current holdings and provides rebalancing recommendations using news sentiment and historical data

### 💼 Portfolio Management
- Real-time portfolio tracking with Firebase Firestore
- Automated stock purchases and portfolio updates
- Cash balance management with transaction history
- Interactive chat interface for natural language portfolio queries

### 📊 Market Intelligence
- **News Sentiment Analysis**: Uses TextBlob to analyze stock news headlines from yfinance
- **Historical Performance**: Tracks 1-year price performance for portfolio stocks
- **ChromaDB Integration**: Vector database for intelligent stock search and recommendations
- **Real-time Stock Data**: Live market data via yfinance

### 📈 Dashboard & Analytics
- Interactive charts using ApexCharts
- Portfolio performance visualization
- Stock price tracking
- News feed for Apple (AAPL) and other stocks via NewsAPI

### 💬 AI Chat Interface
- Natural language portfolio queries
- Conversation history saved in Firestore
- General finance Q&A powered by OpenAI GPT-4
- Automatic portfolio detection and routing

## 🏗️ Tech Stack

### Frontend
- **React 18.2** - Modern UI framework
- **Vite** - Fast build tool and dev server
- **TailwindCSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **ApexCharts** - Interactive data visualizations
- **Firebase SDK** - Authentication and Firestore integration
- **React Hot Toast** - Beautiful notifications

### Backend
- **FastAPI** - High-performance Python web framework
- **Pydantic AI** - AI agent orchestration with GPT-4
- **ChromaDB** - Vector database for stock embeddings
- **yfinance** - Real-time stock market data
- **TextBlob** - Natural language processing for sentiment analysis
- **OpenAI GPT-4** - Language model for AI agents
- **Uvicorn** - ASGI server with uvloop

### Data & Storage
- **Firebase Firestore** - NoSQL database for users, portfolios, and conversations
- **Firebase Authentication** - Secure user authentication
- **ChromaDB Persistent Storage** - Local vector database at `./stock_picker/chroma_db`

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **Python** (v3.11 recommended)
- **Firebase Account** - For authentication and Firestore
- **OpenAI API Key** - For GPT-4 access
- **NewsAPI Key** - For stock news feed

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/BE-Hackathon-2025/hacking_hornets.git
cd hacking_hornets
```

### 2. Frontend Setup
```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

Edit `.env` and add your configuration:
```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# API Keys
VITE_NEWS_API_KEY=your_news_api_key
VITE_FASTAPI_URL=http://localhost:8000
```

### 3. Backend Setup
```bash
cd FastApi

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn openai python-dotenv yfinance textblob chromadb pydantic-ai

# Create .env file
cp .env.example .env
```

Edit `FastApi/.env` and add:
```env
OPENAI_API_KEY=your_openai_api_key
```

### 4. Initialize ChromaDB
The ChromaDB collection should be populated with stock data. The database is located at `./stock_picker/chroma_db` with collection name `test_collection2`.

## 🎮 Running the Application

### Start Frontend (Port 5173)
```bash
npm run dev
```
Access at: http://localhost:5173

### Start Backend (Port 8000)
```bash
cd FastApi
source venv/bin/activate  # On Windows: venv\Scripts\activate
python main.py
```
Or with uvicorn directly:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
API Docs at: http://localhost:8000/docs

### Optional: Start Streamlit App (Port 8501)
```bash
cd FastApi
streamlit run innovest.py
```
Access at: http://localhost:8501

## 🔑 Key Components

### AI Agents (`/FastApi/main.py`)

#### Agent A - New Investor Assistant
- Uses ChromaDB to search and recommend stocks
- Generates initial portfolio based on user preferences
- Output: Portfolio with stock picks and reasoning

#### Agent B - Portfolio Rebalancer
- Analyzes existing portfolio holdings
- Checks news sentiment for each stock
- Reviews historical performance (1-year)
- Suggests rebalancing based on market conditions
- Output: Updated portfolio recommendations

### Tools

**stock_search**: Queries ChromaDB for relevant stocks based on user query
```python
@Tool
def stock_search(query: str) -> dict:
    # Searches test_collection2 for top 5 matching stocks
```

**check_news_portfolio**: Analyzes news sentiment for portfolio stocks
```python
@Tool  
def check_news_portfolio(ctx: RunContext[InputModel_b]) -> dict:
    # Fetches news via yfinance and calculates sentiment with TextBlob
```

**check_historical_portfolio**: Reviews 1-year price performance
```python
@Tool
def check_historical_portfolio(ctx: RunContext[InputModel_b]) -> dict:
    # Fetches historical data and calculates percentage change
```

### API Endpoints

**POST /agent_a** - New portfolio recommendations
```json
{
  "query": "I want to invest in AI and tech stocks",
  "portfolio": null,
  "availableCash": 15000
}
```

**POST /agent_b** - Portfolio rebalancing
```json
{
  "query": "Can you rebalance my portfolio?",
  "portfolio": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "shares": 10,
      "avgPrice": 150.00
    }
  ],
  "availableCash": 5000
}
```

**POST /finance_qa** - General finance questions
```json
{
  "query": "What is a P/E ratio?"
}
```

## 📱 Features Walkthrough

### 1. User Authentication
- Sign up / Sign in with Firebase Authentication
- User profile with initial $15,000 cash balance

### 2. AI Chat
- Navigate to AI Chat page
- Ask portfolio-related questions (detected by keyword "portfolio")
- General finance questions route to GPT-4 Q&A
- Conversation history persisted in Firestore

### 3. Portfolio Management
- View current holdings in dashboard
- AI automatically updates portfolio based on recommendations
- Track portfolio value and performance
- Cash balance updates with each transaction

### 4. Market News
- Real-time news feed for stocks
- Sentiment analysis integrated in Agent B decisions
- NewsAPI integration for latest market updates

## 🔧 Configuration

### Firebase Setup
1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication (Email/Password)
3. Enable Firestore Database
4. Add your config to `.env`

### Firestore Collections
```
users/
  {userId}/
    - cashAvailable: number
    - createdAt: timestamp
    - updatedAt: timestamp
    
portfolios/
  {portfolioId}/
    - userId: string
    - name: string
    - holdings: array
      - symbol: string
      - name: string
      - shares: number
      - avgPrice: number
    
conversations/
  {conversationId}/
    - userId: string
    - title: string
    - messages: array
      - role: 'user' | 'assistant'
      - content: string
      - timestamp: timestamp
```

### ChromaDB Setup
The ChromaDB collection `test_collection2` should contain stock embeddings:
```python
{
  "documents": ["Stock description..."],
  "metadatas": [{"symbol": "AAPL", "name": "Apple Inc."}],
  "ids": ["stock_id"]
}
```

## 🎯 Usage Examples

### Create New Portfolio
```
User: "I want to build a portfolio with AI stocks"
Agent A: 
  - Searches ChromaDB for AI-related stocks
  - Returns 5 stock recommendations
  - Automatically adds to portfolio
  - Deducts cost from cash balance
```

### Rebalance Existing Portfolio
```
User: "Can you rebalance my portfolio?"
Agent B:
  - Analyzes current holdings
  - Checks news sentiment for each stock
  - Reviews 1-year performance
  - Suggests adjustments (buy/sell/hold)
  - Updates portfolio accordingly
```

### General Finance Question
```
User: "What is diversification?"
Finance Q&A:
  - Routes to OpenAI GPT-4
  - Returns concise answer (<3 sentences)
  - No portfolio changes
```

## 🐛 Troubleshooting

### Backend Issues
- **Event loop error**: Use `await agent.run()` not `run_sync()` in FastAPI
- **ChromaDB not found**: Ensure `./stock_picker/chroma_db` exists with `test_collection2`
- **CORS errors**: Check FastAPI CORS middleware configuration

### Frontend Issues
- **Firebase connection**: Verify `.env` has correct Firebase config
- **API timeout**: Ensure backend is running on port 8000
- **Duplicate keys warning**: Fixed with unique IDs using `Date.now() + Math.random()`

### Common Errors
```bash
# Port already in use
lsof -ti:8000 | xargs kill -9  # Kill process on port 8000

# Python dependencies
pip install -r requirements.txt

# Node modules
rm -rf node_modules package-lock.json
npm install
```

## 📊 Project Structure
```
hacking_hornets/
├── src/                      # Frontend source
│   ├── components/           # React components
│   │   ├── Charts/          # ApexCharts visualizations
│   │   ├── Header/          # Navigation and user menu
│   │   ├── Sidebar/         # Side navigation
│   │   └── News/            # News feed components
│   ├── pages/               # Page components
│   │   ├── AI/              # AI chat interface
│   │   ├── Dashboard/       # Main dashboard
│   │   └── Authentication/  # Login/Signup
│   ├── services/            # API services
│   │   ├── firestoreService.js
│   │   └── fastApiService.js
│   ├── contexts/            # React contexts
│   └── firebase/            # Firebase config
├── FastApi/                  # Backend source
│   ├── main.py              # FastAPI application
│   ├── Models/              # Pydantic models
│   │   ├── InputModel_a.py
│   │   ├── InputModel_b.py
│   │   ├── PortfolioModel.py
│   │   └── AssetModel.py
│   ├── stock_picker/        # ChromaDB storage
│   │   └── chroma_db/       # Vector database
│   ├── innovest.py          # Streamlit app
│   └── .env                 # Backend environment
├── public/                   # Static assets
├── .env                     # Frontend environment
└── README.md                # This file
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE.md file for details.

## 👥 Team - Hacking Hornets

Built for BE-Hackathon-2025

## 🙏 Acknowledgments

- OpenAI for GPT-4 API
- Firebase for backend infrastructure
- ChromaDB for vector database
- yfinance for market data
- NewsAPI for stock news

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check the troubleshooting section above
- Review API documentation at http://localhost:8000/docs

---

**Built with ❤️ by the Hacking Hornets Team** 🦅