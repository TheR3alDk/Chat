import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [personality, setPersonality] = useState('lover');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [personalities, setPersonalities] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load personalities and messages on component mount
  useEffect(() => {
    loadPersonalities();
    const savedMessages = localStorage.getItem('chatMessages');
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
  }, []);

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
  }, [messages]);

  const loadPersonalities = async () => {
    try {
      const response = await axios.get(`${API}/personalities`);
      setPersonalities(response.data.personalities);
    } catch (err) {
      console.error('Failed to load personalities:', err);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API}/chat`,
        {
          messages: newMessages,
          personality: personality,
          max_tokens: 1000,
          temperature: 0.7
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const assistantMessage = {
        role: 'assistant',
        content: response.data.response,
        personality: response.data.personality_used
      };

      setMessages([...newMessages, assistantMessage]);
    } catch (err) {
      setError(
        err.response?.data?.detail || 
        'Failed to get response. Please try again.'
      );
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem('chatMessages');
  };

  const getPersonalityDisplay = (personalityId) => {
    const personality = personalities.find(p => p.id === personalityId);
    return personality ? personality.name : personalityId;
  };

  const getPersonalityEmoji = (personalityId) => {
    const emojis = {
      'lover': '💕',
      'therapist': '🧠',
      'best_friend': '👯‍♀️',
      'fantasy_rpg': '🧚‍♀️',
      'neutral': '👩‍💼'
    };
    return emojis[personalityId] || '👩‍💼';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto max-w-4xl h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-md border-b border-white/20 p-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              🤖 Private AI Chatbot
            </h1>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-white font-medium">Personality:</label>
                <select 
                  value={personality} 
                  onChange={(e) => setPersonality(e.target.value)}
                  className="bg-white/20 backdrop-blur-md text-white border border-white/30 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {personalities.map((p) => (
                    <option key={p.id} value={p.id} className="bg-gray-800">
                      {getPersonalityEmoji(p.id)} {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <button 
                onClick={clearChat} 
                className="bg-red-500/80 hover:bg-red-600/80 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Clear Chat
              </button>
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-white/60 mt-8">
              <h2 className="text-xl mb-2">Welcome to your Private AI Chatbot! 💬</h2>
              <p>Choose a personality and start chatting. Your conversations are stored locally only.</p>
            </div>
          )}
          
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs sm:max-w-md lg:max-w-lg xl:max-w-xl rounded-2xl p-4 ${
                message.role === 'user' 
                  ? 'bg-blue-500 text-white ml-12' 
                  : 'bg-white/90 text-gray-800 mr-12'
              }`}>
                {message.role === 'assistant' && (
                  <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    {getPersonalityEmoji(message.personality || personality)}
                    {getPersonalityDisplay(message.personality || personality)}
                  </div>
                )}
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white/90 text-gray-800 rounded-2xl p-4 mr-12">
                <div className="flex items-center gap-2">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="text-sm text-gray-500">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-4 mb-2 bg-red-500/20 border border-red-500/30 text-red-200 p-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Input Container */}
        <div className="bg-white/10 backdrop-blur-md border-t border-white/20 p-4">
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading}
              rows="2"
              className="flex-1 bg-white/20 backdrop-blur-md text-white placeholder-white/60 border border-white/30 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
            <button 
              onClick={handleSend} 
              disabled={isLoading || !input.trim()}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
            >
              {isLoading ? '⏳' : '📤'} Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <ChatInterface />
    </div>
  );
}

export default App;
