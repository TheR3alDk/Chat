import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Custom Personality Creation Modal
const PersonalityCreator = ({ isOpen, onClose, onSave, editingPersonality }) => {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    emoji: '',
    customImage: null,
    prompt: ''
  });
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (editingPersonality) {
      setFormData(editingPersonality);
      setImagePreview(editingPersonality.customImage || null);
    } else {
      setFormData({
        id: '',
        name: '',
        description: '',
        emoji: '',
        customImage: null,
        prompt: ''
      });
      setImagePreview(null);
    }
  }, [editingPersonality, isOpen]);

  const compressImage = (file, maxWidth = 100, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    try {
      const compressedImage = await compressImage(file);
      setFormData({...formData, customImage: compressedImage});
      setImagePreview(compressedImage);
    } catch (error) {
      console.error('Error compressing image:', error);
      alert('Error processing image. Please try another file.');
    }
  };

  const removeImage = () => {
    setFormData({...formData, customImage: null});
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    if (!formData.name || !formData.prompt) {
      alert('Please fill in name and prompt fields');
      return;
    }

    const personality = {
      ...formData,
      id: formData.id || `custom_${Date.now()}`,
      emoji: formData.emoji || '👤'
    };

    onSave(personality);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {editingPersonality ? 'Edit Personality' : 'Create Custom Personality'}
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
              ×
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Personality Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Gaming Buddy, Study Partner"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Brief description of this personality"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Picture
              </label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Upload a custom picture (max 5MB) or use emoji below
                  </p>
                </div>
                {imagePreview && (
                  <div className="relative">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-300"
                    />
                    <button
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Emoji (Fallback)
              </label>
              <input
                type="text"
                value={formData.emoji}
                onChange={(e) => setFormData({...formData, emoji: e.target.value})}
                placeholder="e.g., 🎮, 📚, 🎨"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                maxLength="2"
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be used if no custom picture is uploaded
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Personality Prompt *
              </label>
              <textarea
                value={formData.prompt}
                onChange={(e) => setFormData({...formData, prompt: e.target.value})}
                placeholder="Describe how this AI personality should behave, speak, and interact. Be specific about traits, tone, and characteristics..."
                rows="6"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Tip: Include details about gender, speaking style, interests, and how they should respond to users.
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              {editingPersonality ? 'Save Changes' : 'Create Personality'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [personality, setPersonality] = useState('best_friend');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [personalities, setPersonalities] = useState([]);
  const [customPersonalities, setCustomPersonalities] = useState([]);
  const [showCreator, setShowCreator] = useState(false);
  const [editingPersonality, setEditingPersonality] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load data on component mount
  useEffect(() => {
    loadPersonalities();
    loadCustomPersonalities();
    const savedMessages = localStorage.getItem('chatMessages');
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
  }, []);

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chatMessages', JSON.stringify(messages));
    }
  }, [messages]);

  const loadPersonalities = async () => {
    try {
      const response = await axios.get(`${API}/personalities`);
      setPersonalities(response.data.personalities);
    } catch (err) {
      console.error('Failed to load personalities:', err);
    }
  };

  const loadCustomPersonalities = () => {
    const saved = localStorage.getItem('customPersonalities');
    if (saved) {
      setCustomPersonalities(JSON.parse(saved));
    }
  };

  const saveCustomPersonalities = (personalities) => {
    localStorage.setItem('customPersonalities', JSON.stringify(personalities));
    setCustomPersonalities(personalities);
  };

  const handleSavePersonality = (personalityData) => {
    const existing = customPersonalities.find(p => p.id === personalityData.id);
    let updated;
    
    if (existing) {
      updated = customPersonalities.map(p => 
        p.id === personalityData.id ? personalityData : p
      );
    } else {
      updated = [...customPersonalities, personalityData];
    }
    
    saveCustomPersonalities(updated);
  };

  const handleDeletePersonality = (personalityId) => {
    if (window.confirm('Are you sure you want to delete this personality?')) {
      const updated = customPersonalities.filter(p => p.id !== personalityId);
      saveCustomPersonalities(updated);
      
      // Switch to default if current personality is deleted
      if (personality === personalityId) {
        setPersonality('best_friend');
      }
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
      // Find custom personality prompt if using custom personality
      const customPersonality = customPersonalities.find(p => p.id === personality);
      
      const requestData = {
        messages: newMessages,
        personality: personality,
        max_tokens: 1000,
        temperature: 0.7
      };

      // Add custom prompt if it's a custom personality
      if (customPersonality) {
        requestData.custom_prompt = customPersonality.prompt;
      }

      const response = await axios.post(`${API}/chat`, requestData, {
        headers: { 'Content-Type': 'application/json' }
      });

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

  const getAllPersonalities = () => {
    return [...personalities, ...customPersonalities];
  };

  const getPersonalityDisplay = (personalityId) => {
    const allPersonalities = getAllPersonalities();
    const personality = allPersonalities.find(p => p.id === personalityId);
    return personality ? personality.name : personalityId;
  };

  const getPersonalityEmoji = (personalityId) => {
    const customPersonality = customPersonalities.find(p => p.id === personalityId);
    if (customPersonality) {
      return customPersonality.emoji || '👤';
    }

    const builtInEmojis = {
      'lover': '💕',
      'therapist': '🧠',
      'best_friend': '👯‍♀️',
      'fantasy_rpg': '🧚‍♀️',
      'neutral': '👩‍💼'
    };
    return builtInEmojis[personalityId] || '👩‍💼';
  };

  const getPersonalityImage = (personalityId) => {
    const customPersonality = customPersonalities.find(p => p.id === personalityId);
    return customPersonality?.customImage || null;
  };

  const PersonalityAvatar = ({ personalityId, size = "small" }) => {
    const customImage = getPersonalityImage(personalityId);
    const emoji = getPersonalityEmoji(personalityId);
    
    const sizeClasses = {
      small: "w-6 h-6",
      medium: "w-8 h-8", 
      large: "w-12 h-12"
    };
    
    if (customImage) {
      return (
        <img 
          src={customImage} 
          alt="Personality" 
          className={`${sizeClasses[size]} rounded-full object-cover border border-gray-300 flex-shrink-0`}
        />
      );
    }
    
    return <span className="text-lg">{emoji}</span>;
  };

  const isCustomPersonality = (personalityId) => {
    return customPersonalities.some(p => p.id === personalityId);
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
                <div className="flex items-center gap-2">
                  <select 
                    value={personality} 
                    onChange={(e) => setPersonality(e.target.value)}
                    className="bg-white/20 backdrop-blur-md text-white border border-white/30 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <optgroup label="Built-in Personalities" className="bg-gray-800">
                      {personalities.map((p) => (
                        <option key={p.id} value={p.id} className="bg-gray-800">
                          {getPersonalityEmoji(p.id)} {p.name}
                        </option>
                      ))}
                    </optgroup>
                    {customPersonalities.length > 0 && (
                      <optgroup label="Custom Personalities" className="bg-gray-800">
                        {customPersonalities.map((p) => (
                          <option key={p.id} value={p.id} className="bg-gray-800">
                            {p.customImage ? '🖼️' : (p.emoji || '👤')} {p.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  {isCustomPersonality(personality) && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          const p = customPersonalities.find(p => p.id === personality);
                          setEditingPersonality(p);
                          setShowCreator(true);
                        }}
                        className="bg-blue-500/80 hover:bg-blue-600/80 text-white p-2 rounded-lg transition-colors"
                        title="Edit personality"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeletePersonality(personality)}
                        className="bg-red-500/80 hover:bg-red-600/80 text-white p-2 rounded-lg transition-colors"
                        title="Delete personality"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setEditingPersonality(null);
                    setShowCreator(true);
                  }}
                  className="bg-green-500/80 hover:bg-green-600/80 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  ➕ Create
                </button>
                <button 
                  onClick={clearChat} 
                  className="bg-red-500/80 hover:bg-red-600/80 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Clear Chat
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-white/60 mt-8">
              <h2 className="text-xl mb-2">Welcome to your Private AI Chatbot! 💬</h2>
              <p>Choose a personality and start chatting. Your conversations are stored locally only.</p>
              <p className="mt-2">✨ <strong>New:</strong> Create your own custom personalities!</p>
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
                  <div className="text-xs text-gray-500 mb-1 flex items-center gap-2">
                    <PersonalityAvatar personalityId={message.personality || personality} size="small" />
                    <div className="flex items-center gap-1">
                      {getPersonalityDisplay(message.personality || personality)}
                      {isCustomPersonality(message.personality || personality) && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">Custom</span>
                      )}
                    </div>
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

      {/* Personality Creator Modal */}
      <PersonalityCreator
        isOpen={showCreator}
        onClose={() => {
          setShowCreator(false);
          setEditingPersonality(null);
        }}
        onSave={handleSavePersonality}
        editingPersonality={editingPersonality}
      />
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
