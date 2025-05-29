import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';
import ChatPage from './ChatPage';
import HomePage from './HomePage';

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
    prompt: '',
    scenario: '',
    gender: 'female',
    isPublic: false,
    tags: []
  });
  const [availableCategories, setAvailableCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [selectedTagFilters, setSelectedTagFilters] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (editingPersonality) {
      setFormData({
        ...editingPersonality,
        tags: editingPersonality.tags || []
      });
      setImagePreview(editingPersonality.customImage || null);
    } else {
      setFormData({
        id: '',
        name: '',
        description: '',
        emoji: '',
        customImage: null,
        prompt: '',
        scenario: '',
        gender: 'female',
        isPublic: false,
        tags: []
      });
      setImagePreview(null);
    }
  }, [editingPersonality]);

  // Fetch available tags for categorization
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await axios.get(`${API}/personalities/tags`);
        setAvailableCategories(response.data);
      } catch (error) {
        console.error('Error fetching tags:', error);
      }
    };
    fetchTags();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleTagToggle = (tag) => {
    const updatedTags = formData.tags.includes(tag)
      ? formData.tags.filter(t => t !== tag)
      : [...formData.tags, tag];
    
    setFormData({
      ...formData,
      tags: updatedTags
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setFormData({
          ...formData,
          customImage: reader.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-white/20 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-4">
          {editingPersonality ? 'Edit Personality' : 'Create New AI Personality'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div>
            <label className="block text-white mb-1">Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full bg-gray-800 text-white border border-gray-700 rounded p-2"
              required
            />
          </div>
          
          <div>
            <label className="block text-white mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full bg-gray-800 text-white border border-gray-700 rounded p-2 h-20"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white mb-1">Emoji</label>
              <input
                type="text"
                name="emoji"
                value={formData.emoji}
                onChange={handleChange}
                className="w-full bg-gray-800 text-white border border-gray-700 rounded p-2"
                placeholder="🤖"
              />
            </div>
            
            <div>
              <label className="block text-white mb-1">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full bg-gray-800 text-white border border-gray-700 rounded p-2"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>
          </div>
          
          {/* Custom Image Upload */}
          <div>
            <label className="block text-white mb-1">Custom Image (Optional)</label>
            <div className="flex items-center gap-4">
              {imagePreview && (
                <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-700">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                {imagePreview ? 'Change Image' : 'Upload Image'}
              </button>
              {imagePreview && (
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    setFormData({
                      ...formData,
                      customImage: null
                    });
                  }}
                  className="text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
              />
            </div>
          </div>
          
          {/* Personality Prompt */}
          <div>
            <label className="block text-white mb-1">Personality Prompt</label>
            <textarea
              name="prompt"
              value={formData.prompt}
              onChange={handleChange}
              className="w-full bg-gray-800 text-white border border-gray-700 rounded p-2 h-32"
              placeholder="Describe how this AI should behave, speak, and what knowledge they should have..."
              required
            />
          </div>
          
          {/* Scenario */}
          <div>
            <label className="block text-white mb-1">Scenario (Optional)</label>
            <textarea
              name="scenario"
              value={formData.scenario}
              onChange={handleChange}
              className="w-full bg-gray-800 text-white border border-gray-700 rounded p-2 h-20"
              placeholder="Describe the scenario or context for conversations with this AI..."
            />
          </div>
          
          {/* Tags/Categories */}
          <div>
            <label className="block text-white mb-2">Categories (Optional)</label>
            <div className="flex flex-wrap gap-2">
              {availableCategories.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagToggle(tag)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    formData.tags.includes(tag)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          
          {/* Public/Private Setting */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPublic"
              name="isPublic"
              checked={formData.isPublic}
              onChange={handleChange}
              className="mr-2"
            />
            <label htmlFor="isPublic" className="text-white">
              Make this personality public (others can use it)
            </label>
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              {editingPersonality ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Discovery Page Component
const DiscoveryPage = () => {
  const [publicPersonalities, setPublicPersonalities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [selectedTagFilters, setSelectedTagFilters] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);

  useEffect(() => {
    const fetchPublicPersonalities = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API}/personalities/public`);
        setPublicPersonalities(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching public personalities:', error);
        setLoading(false);
      }
    };

    const fetchTags = async () => {
      try {
        const response = await axios.get(`${API}/personalities/tags`);
        setAvailableTags(response.data);
      } catch (error) {
        console.error('Error fetching tags:', error);
      }
    };

    fetchPublicPersonalities();
    fetchTags();
  }, []);

  const filteredPersonalities = Array.isArray(publicPersonalities) 
    ? publicPersonalities.filter(p => {
        // Search term filter
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.description.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Gender filter
        const matchesGender = !genderFilter || p.gender === genderFilter;
        
        // Tags filter
        const matchesTags = selectedTagFilters.length === 0 || 
                            (p.tags && selectedTagFilters.every(tag => p.tags.includes(tag)));
        
        return matchesSearch && matchesGender && matchesTags;
      })
    : [];

  const handleTagToggle = (tag) => {
    setSelectedTagFilters(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6 text-white">Discover AI Companions</h1>
      
      {/* Search and Filters */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-white/80 mb-1 text-sm">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or description..."
              className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white"
            />
          </div>
          
          {/* Gender Filter */}
          <div>
            <label className="block text-white/80 mb-1 text-sm">Gender</label>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white"
            >
              <option value="">All Genders</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>
          
          {/* Clear Filters */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setGenderFilter('');
                setSelectedTagFilters([]);
              }}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
        
        {/* Tags Filter */}
        <div className="mt-4">
          <label className="block text-white/80 mb-1 text-sm">Categories</label>
          <div className="flex flex-wrap gap-2">
            {availableTags.map(tag => (
              <button
                key={tag}
                onClick={() => handleTagToggle(tag)}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedTagFilters.includes(tag)
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPersonalities.length > 0 ? (
            filteredPersonalities.map((personality) => (
              <div 
                key={personality.id} 
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-4 hover:bg-white/20 transition-colors cursor-pointer"
                onClick={() => window.location.href = `/chat/${personality.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                    {personality.emoji || personality.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{personality.name}</h3>
                    <p className="text-white/60 text-sm">{personality.description}</p>
                  </div>
                </div>
                {personality.tags && personality.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {personality.tags.map(tag => (
                      <span key={tag} className="bg-white/10 text-white/70 text-xs px-2 py-1 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-white/60">
              <p className="text-xl mb-2">No personalities found</p>
              <p>Try adjusting your filters or create your own!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Profile Page Component
const ProfilePage = () => {
  const [customPersonalities, setCustomPersonalities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, this would fetch from an API with authentication
    // For this demo, we'll use localStorage
    const fetchCustomPersonalities = () => {
      try {
        const storedPersonalities = localStorage.getItem('customPersonalities');
        setCustomPersonalities(storedPersonalities ? JSON.parse(storedPersonalities) : []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching custom personalities:', error);
        setLoading(false);
      }
    };

    fetchCustomPersonalities();
  }, []);

  const handleDeletePersonality = (id) => {
    const updatedPersonalities = customPersonalities.filter(p => p.id !== id);
    setCustomPersonalities(updatedPersonalities);
    localStorage.setItem('customPersonalities', JSON.stringify(updatedPersonalities));
  };

  const handleClearAllData = () => {
    if (window.confirm('Are you sure you want to clear all your data? This will delete all conversations and custom personalities.')) {
      localStorage.clear();
      setCustomPersonalities([]);
      window.location.reload();
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6 text-white">Your Profile</h1>
      
      {/* User Settings */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Settings</h2>
        
        <div className="space-y-4">
          <div>
            <button
              onClick={handleClearAllData}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Clear All Data
            </button>
            <p className="text-white/60 text-sm mt-1">
              This will delete all your conversation history and custom personalities.
            </p>
          </div>
        </div>
      </div>
      
      {/* Custom Personalities */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Your Custom Personalities</h2>
        
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : customPersonalities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customPersonalities.map((personality) => (
              <div 
                key={personality.id} 
                className="bg-white/5 border border-white/10 rounded-lg p-4 group"
              >
                <div className="flex justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-lg">
                      {personality.emoji || personality.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-white font-medium">{personality.name}</h3>
                      <p className="text-white/60 text-xs">{personality.description}</p>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDeletePersonality(personality.id)}
                      className="text-red-400 hover:text-red-300 p-1"
                      title="Delete personality"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                {personality.tags && personality.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {personality.tags.map(tag => (
                      <span key={tag} className="bg-white/10 text-white/70 text-xs px-2 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-white/60">
            <p>You haven't created any custom personalities yet.</p>
            <p className="mt-2">Click the + button to create your first one!</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Tab Navigation Component
const TabNavigation = ({ activeTab, setActiveTab }) => (
  <div className="mobile-bottom-nav bg-white/10 backdrop-blur-md border-t border-white/20 p-2 md:bg-white/10 md:border md:border-white/20 md:rounded-2xl md:mb-6 md:border-t-0">
    <div className="flex gap-2">
      <button
        onClick={() => setActiveTab('discover')}
        className={`flex-1 py-3 px-4 rounded-lg transition-colors font-medium text-center ${
          activeTab === 'discover'
            ? 'bg-blue-500 text-white'
            : 'text-white/70 hover:text-white hover:bg-white/10'
        }`}
      >
        <div className="flex flex-col items-center gap-1 md:flex-row md:justify-center md:gap-2">
          <span className="text-lg md:text-base">🌍</span>
          <span className="text-xs md:text-sm">Discover</span>
        </div>
      </button>
      <button
        onClick={() => setActiveTab('chats')}
        className={`flex-1 py-3 px-4 rounded-lg transition-colors font-medium text-center ${
          activeTab === 'chats'
            ? 'bg-blue-500 text-white'
            : 'text-white/70 hover:text-white hover:bg-white/10'
        }`}
      >
        <div className="flex flex-col items-center gap-1 md:flex-row md:justify-center md:gap-2">
          <span className="text-lg md:text-base">💬</span>
          <span className="text-xs md:text-sm">My Chats</span>
        </div>
      </button>
      <button
        onClick={() => setActiveTab('profile')}
        className={`flex-1 py-3 px-4 rounded-lg transition-colors font-medium text-center ${
          activeTab === 'profile'
            ? 'bg-blue-500 text-white'
            : 'text-white/70 hover:text-white hover:bg-white/10'
        }`}
      >
        <div className="flex flex-col items-center gap-1 md:flex-row md:justify-center md:gap-2">
          <span className="text-lg md:text-base">👤</span>
          <span className="text-xs md:text-sm">Profile</span>
        </div>
      </button>
    </div>
  </div>
);

// Main App Component
function App() {
  const [activeTab, setActiveTab] = useState('chats');
  const [showCreator, setShowCreator] = useState(false);
  const [editingPersonality, setEditingPersonality] = useState(null);
  const [personalities, setPersonalities] = useState([]);
  const [customPersonalities, setCustomPersonalities] = useState([]);
  const [conversations, setConversations] = useState({});
  const [selectedPersonality, setSelectedPersonality] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [lastMessageTimes, setLastMessageTimes] = useState({});

  // Load personalities from API
  useEffect(() => {
    const fetchPersonalities = async () => {
      try {
        const response = await axios.get(`${API}/personalities`);
        setPersonalities(response.data);
      } catch (error) {
        console.error('Error fetching personalities:', error);
      }
    };

    fetchPersonalities();
  }, []);

  // Load custom personalities from localStorage
  useEffect(() => {
    const storedPersonalities = localStorage.getItem('customPersonalities');
    if (storedPersonalities) {
      setCustomPersonalities(JSON.parse(storedPersonalities));
    }

    const storedConversations = localStorage.getItem('conversations');
    if (storedConversations) {
      setConversations(JSON.parse(storedConversations));
    }

    const storedUnreadCounts = localStorage.getItem('unreadCounts');
    if (storedUnreadCounts) {
      setUnreadCounts(JSON.parse(storedUnreadCounts));
    }

    const storedLastMessageTimes = localStorage.getItem('lastMessageTimes');
    if (storedLastMessageTimes) {
      setLastMessageTimes(JSON.parse(storedLastMessageTimes));
    }
  }, []);

  // Save custom personalities to localStorage when they change
  useEffect(() => {
    if (customPersonalities.length > 0) {
      localStorage.setItem('customPersonalities', JSON.stringify(customPersonalities));
    }
  }, [customPersonalities]);

  // Save conversations to localStorage when they change
  useEffect(() => {
    if (Object.keys(conversations).length > 0) {
      localStorage.setItem('conversations', JSON.stringify(conversations));
    }
  }, [conversations]);

  // Save unread counts to localStorage when they change
  useEffect(() => {
    if (Object.keys(unreadCounts).length > 0) {
      localStorage.setItem('unreadCounts', JSON.stringify(unreadCounts));
    }
  }, [unreadCounts]);

  // Save last message times to localStorage when they change
  useEffect(() => {
    if (Object.keys(lastMessageTimes).length > 0) {
      localStorage.setItem('lastMessageTimes', JSON.stringify(lastMessageTimes));
    }
  }, [lastMessageTimes]);

  const handleSavePersonality = (personalityData) => {
    const newPersonality = {
      ...personalityData,
      id: personalityData.id || `custom-${Date.now()}`
    };

    if (editingPersonality) {
      // Update existing personality
      setCustomPersonalities(prev => 
        prev.map(p => p.id === newPersonality.id ? newPersonality : p)
      );
    } else {
      // Add new personality
      setCustomPersonalities(prev => [...prev, newPersonality]);
    }

    setEditingPersonality(null);
  };

  const deleteConversation = (personalityId) => {
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      setConversations(prev => {
        const newConversations = { ...prev };
        delete newConversations[personalityId];
        return newConversations;
      });
      
      setUnreadCounts(prev => {
        const newCounts = { ...prev };
        delete newCounts[personalityId];
        return newCounts;
      });
      
      setLastMessageTimes(prev => {
        const newTimes = { ...prev };
        delete newTimes[personalityId];
        return newTimes;
      });
    }
  };

  const getUnreadCount = (personalityId) => {
    return unreadCounts[personalityId] || 0;
  };

  const getLastMessage = (personalityId) => {
    const convo = conversations[personalityId];
    if (!convo || convo.length === 0) return 'No messages yet';
    
    const lastMessage = convo[convo.length - 1];
    return lastMessage.content.length > 50 
      ? `${lastMessage.content.substring(0, 50)}...` 
      : lastMessage.content;
  };

  // If a personality is selected, show the chat page
  if (selectedPersonality) {
    return (
      <ChatPage
        personality={selectedPersonality}
        initialMessages={conversations[selectedPersonality.id] || []}
        onBack={() => {
          setSelectedPersonality(null);
          // Mark as read when leaving chat
          setUnreadCounts(prev => ({
            ...prev,
            [selectedPersonality.id]: 0
          }));
        }}
        onMessageSent={(messages) => {
          setConversations(prev => ({
            ...prev,
            [selectedPersonality.id]: messages
          }));
          setLastMessageTimes(prev => ({
            ...prev,
            [selectedPersonality.id]: new Date().toISOString()
          }));
        }}
      />
    );
  }

  // Main app with tabs
  return (
    <div className="min-h-screen bg-black pb-20 md:pb-0">
      <div className="container mx-auto max-w-6xl p-4">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 mb-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white flex items-center gap-2 justify-center">
              🤖 AI Companion Platform
            </h1>
            <p className="text-white/80 mt-2">Your personal social network of AI personalities</p>
          </div>
        </div>

        {/* Tab Navigation - Hidden on mobile, shown on desktop at top */}
        <div className="hidden md:block">
          <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        {/* Tab Content */}
        {activeTab === 'discover' && <DiscoveryPage />}
        {activeTab === 'chats' && <HomePage />}
        {activeTab === 'profile' && <ProfilePage />}

        {/* Create Button - Always Visible but positioned to avoid tab bar */}
        <div className="fixed bottom-24 right-6 md:bottom-6 z-40">
          <button
            onClick={() => {
              setEditingPersonality(null);
              setShowCreator(true);
            }}
            className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg transition-colors"
            title="Create new personality"
          >
            ➕
          </button>
        </div>
      </div>
      
      {/* Mobile Bottom Tab Navigation - Only shown on mobile */}
      <div className="md:hidden">
        <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* Personality Creator Modal */}
      <PersonalityCreator
        isOpen={showCreator}
        onClose={() => setShowCreator(false)}
        onSave={handleSavePersonality}
        editingPersonality={editingPersonality}
      />
    </div>
  );
}

export default App;