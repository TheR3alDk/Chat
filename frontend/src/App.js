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
    prompt: '',
    scenario: '', // New field for conversation scenario
    isPublic: false, // New field for public/private setting
    tags: '' // New field for tags (comma-separated)
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
        prompt: '',
        scenario: '',
        isPublic: false,
        tags: ''
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
                rows="4"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Tip: Include details about gender, speaking style, interests, and how they should respond to users.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conversation Scenario (Optional)
              </label>
              <textarea
                value={formData.scenario}
                onChange={(e) => setFormData({...formData, scenario: e.target.value})}
                placeholder="Set up a scenario or backstory for how conversations should start. For example: 'You are at a coffee shop and just met the user' or 'You are childhood friends reuniting after years'..."
                rows="3"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                This scenario will influence how the AI starts conversations and provides context for interactions.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visibility Settings
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="visibility"
                    checked={!formData.isPublic}
                    onChange={() => setFormData({...formData, isPublic: false})}
                    className="mr-2"
                  />
                  🔒 Private (Only you can use)
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="visibility"
                    checked={formData.isPublic}
                    onChange={() => setFormData({...formData, isPublic: true})}
                    className="mr-2"
                  />
                  🌍 Public (Everyone can discover and use)
                </label>
              </div>
            </div>

            {formData.isPublic && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (Optional)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({...formData, tags: e.target.value})}
                  placeholder="e.g., gaming, study, roleplay, fantasy"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Separate tags with commas to help others discover your personality
                </p>
              </div>
            )}
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
  const [conversations, setConversations] = useState({}); // {personalityId: messages[]}
  const [currentPersonality, setCurrentPersonality] = useState(null); // null = home page
  const [currentTab, setCurrentTab] = useState('discover'); // discover, chats, profile
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [error, setError] = useState(null);
  const [personalities, setPersonalities] = useState([]);
  const [customPersonalities, setCustomPersonalities] = useState([]);
  const [publicPersonalities, setPublicPersonalities] = useState([]);
  const [userPersonalities, setUserPersonalities] = useState([]);
  const [userId] = useState(() => localStorage.getItem('userId') || `user_${Date.now()}`);
  const [showCreator, setShowCreator] = useState(false);
  const [editingPersonality, setEditingPersonality] = useState(null);
  const [proactiveEnabled, setProactiveEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [lastMessageTimes, setLastMessageTimes] = useState({}); // {personalityId: timestamp}
  const messagesEndRef = useRef(null);
  const proactiveTimersRef = useRef({}); // {personalityId: timerId}

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentPersonality, conversations]);

  // Load data on component mount
  useEffect(() => {
    // Set up user ID in localStorage
    if (!localStorage.getItem('userId')) {
      localStorage.setItem('userId', userId);
    }
    
    loadPersonalities();
    loadCustomPersonalities();
    loadPublicPersonalities();
    loadUserPersonalities();
    
    // Load notification settings
    const savedNotifications = localStorage.getItem('notificationsEnabled');
    if (savedNotifications !== null) {
      setNotificationsEnabled(savedNotifications === 'true');
    }
    
    // Check current notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission('unsupported');
    }
    
    // Request permission if enabled but not granted
    if (notificationsEnabled && Notification.permission === 'default') {
      requestNotificationPermission();
    }
    
    const savedMessages = localStorage.getItem('chatMessages');
    if (savedMessages) {
      setConversations(JSON.parse(savedMessages));
    }
    const savedLastMessageTimes = localStorage.getItem('lastMessageTimes');
    if (savedLastMessageTimes) {
      setLastMessageTimes(JSON.parse(savedLastMessageTimes));
    }
  }, []);

  // Start proactive messaging when personality changes or when enabled
  useEffect(() => {
    if (proactiveEnabled && currentPersonality && lastMessageTimes[currentPersonality]) {
      startProactiveMessaging();
    } else if (proactiveTimersRef.current[currentPersonality]) {
      clearInterval(proactiveTimersRef.current[currentPersonality]);
      delete proactiveTimersRef.current[currentPersonality];
    }
    
    return () => {
      if (proactiveTimersRef.current[currentPersonality]) {
        clearInterval(proactiveTimersRef.current[currentPersonality]);
        delete proactiveTimersRef.current[currentPersonality];
      }
    };
  }, [currentPersonality, proactiveEnabled, lastMessageTimes, customPersonalities]);

  // Save messages and update last message time whenever conversations change
  useEffect(() => {
    if (Object.keys(conversations).length > 0) {
      localStorage.setItem('conversations', JSON.stringify(conversations));
      
      // Update last message times for each conversation
      const newLastMessageTimes = { ...lastMessageTimes };
      Object.entries(conversations).forEach(([personalityId, messages]) => {
        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1];
          if (lastMessage.role === 'user' || lastMessage.role === 'assistant') {
            const timestamp = lastMessage.timestamp || new Date().toISOString();
            newLastMessageTimes[personalityId] = timestamp;
          }
        }
      });
      
      setLastMessageTimes(newLastMessageTimes);
      localStorage.setItem('lastMessageTimes', JSON.stringify(newLastMessageTimes));
    }
  }, [conversations]);

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

  const loadPublicPersonalities = async () => {
    try {
      const response = await axios.get(`${API}/personalities/public`);
      setPublicPersonalities(response.data.personalities || []);
    } catch (err) {
      console.error('Failed to load public personalities:', err);
    }
  };

  const loadUserPersonalities = async () => {
    try {
      const response = await axios.get(`${API}/personalities/user/${userId}`);
      setUserPersonalities(response.data.personalities || []);
    } catch (err) {
      console.error('Failed to load user personalities:', err);
    }
  };

  const saveCustomPersonalities = (personalities) => {
    localStorage.setItem('customPersonalities', JSON.stringify(personalities));
    setCustomPersonalities(personalities);
  };

  const handleSavePersonality = async (personalityData) => {
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

    // If it's public, also save to backend
    if (personalityData.isPublic) {
      try {
        const publicPersonality = {
          ...personalityData,
          creator_id: userId,
          tags: personalityData.tags ? personalityData.tags.split(',').map(tag => tag.trim()) : []
        };

        await axios.post(`${API}/personalities/public`, publicPersonality);
        
        // Reload public and user personalities
        await loadPublicPersonalities();
        await loadUserPersonalities();
        
        console.log('Public personality saved successfully');
      } catch (error) {
        console.error('Error saving public personality:', error);
        alert('Error saving public personality. It will remain private.');
      }
    }
  };

  const handleDeletePersonality = (personalityId) => {
    if (window.confirm('Are you sure you want to delete this personality?')) {
      const updated = customPersonalities.filter(p => p.id !== personalityId);
      saveCustomPersonalities(updated);
      
      // Switch to default if current personality is deleted
      if (currentPersonality === personalityId) {
        setCurrentPersonality('best_friend');
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !currentPersonality) return;

    const userMessage = { role: 'user', content: input.trim(), timestamp: new Date().toISOString() };
    const currentMessages = conversations[currentPersonality] || [];
    const newMessages = [...currentMessages, userMessage];
    setConversations(prev => ({
      ...prev,
      [currentPersonality]: newMessages
    }));
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Find custom personality prompt if using custom personality
      const customPersonality = customPersonalities.find(p => p.id === currentPersonality);
      
      const currentMessages = conversations[currentPersonality] || [];
      const isFirstMessage = currentMessages.length === 0;
      
      const requestData = {
        messages: newMessages,
        personality: currentPersonality,
        custom_personalities: customPersonalities, // Pass custom personalities for self-image generation
        is_first_message: isFirstMessage,
        max_tokens: 1000,
        temperature: 0.7
      };

      // Add custom prompt if it's a custom personality
      if (customPersonality) {
        requestData.custom_prompt = customPersonality.prompt;
      }

      // Check if user is requesting an image (including self-images)
      const imageKeywords = ['create', 'generate', 'make', 'draw', 'show', 'picture', 'image', 'photo'];
      const selfImageKeywords = ['look like', 'selfie', 'yourself', 'what you look', 'see you', 'picture of you', 'image of you'];
      
      const hasImageRequest = imageKeywords.some(keyword => 
        input.toLowerCase().includes(keyword)
      );
      
      const hasSelfImageRequest = selfImageKeywords.some(keyword => 
        input.toLowerCase().includes(keyword)
      );

      if (hasImageRequest || hasSelfImageRequest) {
        setIsGeneratingImage(true);
      }

      const response = await axios.post(`${API}/chat`, requestData, {
        headers: { 'Content-Type': 'application/json' }
      });

      const assistantMessage = {
        role: 'assistant',
        content: response.data.response,
        personality: response.data.personality_used,
        image: response.data.image,
        imagePrompt: response.data.image_prompt,
        timestamp: new Date().toISOString()
      };

      // Debug logging
      if (response.data.image) {
        console.log('Image received:', response.data.image.substring(0, 50) + '...');
        console.log('Image prompt:', response.data.image_prompt);
      } else {
        console.log('No image in response');
      }

      setConversations(prev => ({
        ...prev,
        [currentPersonality]: [...newMessages, assistantMessage]
      }));
      
      // Send notification for regular chat response
      sendMessageNotification(assistantMessage.content, assistantMessage.personality);
    } catch (err) {
      setError(
        err.response?.data?.detail || 
        'Failed to get response. Please try again.'
      );
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
      setIsGeneratingImage(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setConversations({});
    setLastMessageTimes({});
    localStorage.removeItem('conversations');
    localStorage.removeItem('lastMessageTimes');
    
    // Clear proactive timers
    Object.values(proactiveTimersRef.current).forEach(timerId => {
      clearInterval(timerId);
    });
    proactiveTimersRef.current = {};
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

  const startProactiveMessaging = () => {
    if (!proactiveEnabled || !currentPersonality || !lastMessageTimes[currentPersonality]) {
      console.log('Proactive messaging not started:', { proactiveEnabled, currentPersonality, lastMessageTime: !!lastMessageTimes[currentPersonality] });
      return;
    }
    
    // Clear any existing timer for this personality
    if (proactiveTimersRef.current[currentPersonality]) {
      clearInterval(proactiveTimersRef.current[currentPersonality]);
    }
    
    console.log('Starting proactive messaging for', currentPersonality);
    
    // Check immediately on start, then every 2 minutes for more responsive behavior
    checkAndSendProactive();
    
    proactiveTimersRef.current[currentPersonality] = setInterval(async () => {
      checkAndSendProactive();
    }, 2 * 60 * 1000); // Check every 2 minutes
  };

  const checkAndSendProactive = async () => {
    if (!proactiveEnabled || !currentPersonality || !lastMessageTimes[currentPersonality]) return;
    
    try {
      console.log('Checking proactive timing for', currentPersonality, 'last message:', lastMessageTimes[currentPersonality]);
      
      const response = await axios.get(
        `${API}/should_send_proactive/${currentPersonality}?last_message_time=${encodeURIComponent(lastMessageTimes[currentPersonality])}`
      );
      
      console.log('Proactive check result:', response.data);
      
      if (response.data.should_send) {
        console.log('Sending proactive message for', currentPersonality);
        await sendProactiveMessage();
      }
    } catch (error) {
      console.error('Error checking proactive timing:', error);
    }
  };

  const sendProactiveMessage = async () => {
    if (!proactiveEnabled || !currentPersonality) return;
    
    try {
      console.log('Generating proactive message for', currentPersonality);
      
      const customPersonality = customPersonalities.find(p => p.id === currentPersonality);
      const currentMessages = conversations[currentPersonality] || [];
      
      const requestData = {
        personality: currentPersonality,
        custom_personalities: customPersonalities,
        conversation_history: currentMessages.slice(-6), // Last 6 messages for context
        time_since_last_message: lastMessageTimes[currentPersonality] ? 
          Math.floor((Date.now() - new Date(lastMessageTimes[currentPersonality]).getTime()) / (1000 * 60)) : 0
      };

      if (customPersonality) {
        requestData.custom_prompt = customPersonality.prompt;
      }

      const response = await axios.post(`${API}/proactive_message`, requestData, {
        headers: { 'Content-Type': 'application/json' }
      });

      const proactiveMessage = {
        role: 'assistant',
        content: response.data.response,
        personality: response.data.personality_used,
        image: response.data.image,
        imagePrompt: response.data.image_prompt,
        isProactive: true, // Mark as proactive message
        timestamp: new Date().toISOString()
      };

      console.log('Proactive message generated:', proactiveMessage.content.substring(0, 50) + '...');
      
      setConversations(prev => ({
        ...prev,
        [currentPersonality]: [...(prev[currentPersonality] || []), proactiveMessage]
      }));
      
      const newLastMessageTimes = {
        ...lastMessageTimes,
        [currentPersonality]: proactiveMessage.timestamp
      };
      setLastMessageTimes(newLastMessageTimes);
      localStorage.setItem('lastMessageTimes', JSON.stringify(newLastMessageTimes));
      
      // Send notification for proactive message
      sendMessageNotification(proactiveMessage.content, proactiveMessage.personality);

    } catch (error) {
      console.error('Error sending proactive message:', error);
    }
  };

  const generateOpeningMessage = async (personalityId) => {
    const customPersonality = customPersonalities.find(p => p.id === personalityId);
    
    if (!customPersonality || !customPersonality.scenario) {
      return; // No scenario, no opening message needed
    }
    
    try {
      const requestData = {
        messages: [],
        personality: personalityId,
        custom_personalities: customPersonalities,
        custom_prompt: customPersonality.prompt,
        max_tokens: 300,
        temperature: 0.8
      };

      const response = await axios.post(`${API}/opening_message`, requestData, {
        headers: { 'Content-Type': 'application/json' }
      });

      const openingMessage = {
        role: 'assistant',
        content: response.data.response,
        personality: response.data.personality_used,
        image: response.data.image,
        imagePrompt: response.data.image_prompt,
        isOpening: true, // Mark as opening message
        timestamp: new Date().toISOString()
      };

      setConversations(prev => ({
        ...prev,
        [personalityId]: [openingMessage]
      }));

      setLastMessageTimes(prev => ({
        ...prev,
        [personalityId]: openingMessage.timestamp
      }));

      // Send notification for opening message
      sendMessageNotification(openingMessage, personalityId);

    } catch (error) {
      console.error('Error generating opening message:', error);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        
        if (permission === 'granted') {
          // Show a welcome notification
          showNotification(
            'Notifications Enabled! 🔔',
            'You\'ll now receive notifications when your AI companions message you.',
            '🤖'
          );
        }
        
        return permission;
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        setNotificationPermission('denied');
        return 'denied';
      }
    } else {
      console.log('Notifications not supported in this browser');
      setNotificationPermission('unsupported');
      return 'unsupported';
    }
  };

  const showNotification = (title, body, icon = '🤖', tag = null) => {
    if (!notificationsEnabled || notificationPermission !== 'granted') {
      return;
    }

    // Don't show notifications if the page is visible and focused
    if (!document.hidden && document.hasFocus && document.hasFocus()) {
      return;
    }

    try {
      const notification = new Notification(title, {
        body: body,
        icon: icon === '🤖' ? '/favicon.ico' : icon,
        badge: '/favicon.ico',
        tag: tag || 'ai-companion-message',
        requireInteraction: false,
        silent: false,
        vibrate: [200, 100, 200],
        data: {
          timestamp: Date.now(),
          personality: currentPersonality
        }
      });

      // Auto-close notification after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Focus window when notification is clicked
      notification.onclick = function() {
        window.focus();
        this.close();
      };

    } catch (error) {
      console.error('Error showing notification:', error);
    }
  };

  const sendMessageNotification = (message, personalityId) => {
    if (!notificationsEnabled || notificationPermission !== 'granted') {
      return;
    }

    const personalityDisplay = getPersonalityDisplay(personalityId);
    const emoji = getPersonalityEmoji(personalityId);
    
    // Truncate long messages for notification
    const truncatedMessage = message.length > 100 
      ? message.substring(0, 100) + '...' 
      : message;

    const title = message.isProactive 
      ? `${emoji} ${personalityDisplay} reached out to you!`
      : `${emoji} ${personalityDisplay} replied`;

    showNotification(
      title,
      truncatedMessage,
      emoji,
      `message-${personalityId}-${Date.now()}`
    );
  };

  const toggleNotifications = async () => {
    if (!notificationsEnabled && notificationPermission !== 'granted') {
      const permission = await requestNotificationPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        localStorage.setItem('notificationsEnabled', 'true');
      }
    } else {
      const newState = !notificationsEnabled;
      setNotificationsEnabled(newState);
      localStorage.setItem('notificationsEnabled', newState.toString());
      
      if (newState && notificationPermission === 'granted') {
        showNotification(
          'Notifications Re-enabled! 🔔',
          'You\'ll receive notifications for new messages.',
          '✅'
        );
      }
    }
  };

  const deleteConversation = (personalityId) => {
    if (window.confirm(`Are you sure you want to delete your entire conversation with ${getPersonalityDisplay(personalityId)}?`)) {
      const newConversations = { ...conversations };
      delete newConversations[personalityId];
      setConversations(newConversations);
      
      const newLastMessageTimes = { ...lastMessageTimes };
      delete newLastMessageTimes[personalityId];
      setLastMessageTimes(newLastMessageTimes);
      
      // Clear proactive timer for this personality
      if (proactiveTimersRef.current[personalityId]) {
        clearInterval(proactiveTimersRef.current[personalityId]);
        delete proactiveTimersRef.current[personalityId];
      }
      
      // If we're currently viewing this conversation, go back to home
      if (currentPersonality === personalityId) {
        setCurrentPersonality(null);
      }
    }
  };

  const deleteMessageAndRevert = (personalityId, messageIndex) => {
    if (window.confirm('Delete this message and revert the conversation to this point?')) {
      const messages = conversations[personalityId] || [];
      const newMessages = messages.slice(0, messageIndex);
      setConversations(prev => ({
        ...prev,
        [personalityId]: newMessages
      }));
    }
  };



  const triggerProactiveMessage = async () => {
    console.log('Manually triggering proactive message');
    await sendProactiveMessage();
  };

  // Enhanced Card Component
  const PersonalityCard = ({ personality, isPublic = false, onEdit, onDelete, onChat }) => (
    <div className="group">
      <div 
        onClick={() => onChat(personality.id)}
        className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 cursor-pointer hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-xl relative"
      >
        {isPublic && (
          <div className="absolute top-4 right-4 flex gap-2">
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">🌍 Public</span>
            {personality.creator_id === userId && (
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Your Creation</span>
            )}
          </div>
        )}
        {!isPublic && isCustomPersonality(personality.id) && (
          <div className="absolute top-4 right-4">
            <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">🔒 Private</span>
          </div>
        )}
        
        <div className="flex items-start gap-4 mb-4">
          <PersonalityAvatar personalityId={personality.id} size="large" />
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white truncate">{personality.name}</h3>
            <p className="text-white/80 text-sm mb-2">{personality.description}</p>
            {personality.scenario && (
              <p className="text-white/60 text-xs italic truncate">
                📍 {personality.scenario.substring(0, 80)}...
              </p>
            )}
            {isPublic && personality.tags && personality.tags.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {personality.tags.slice(0, 3).map((tag, idx) => (
                  <span key={idx} className="text-xs bg-blue-500/20 text-blue-200 px-2 py-1 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          
          {(onEdit || onDelete) && (
            <div className="opacity-0 group-hover:opacity-100 flex flex-col gap-1 transition-all">
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(personality);
                  }}
                  className="bg-blue-500/80 hover:bg-blue-600/80 text-white p-2 rounded-lg transition-colors"
                  title="Edit personality"
                >
                  ✏️
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(personality.id);
                  }}
                  className="bg-red-500/80 hover:bg-red-600/80 text-white p-2 rounded-lg transition-colors"
                  title="Delete"
                >
                  🗑️
                </button>
              )}
            </div>
          )}
        </div>
        
        <div className="text-white/70 text-sm">
          <p className="truncate">{getLastMessage(personality.id)}</p>
          <p className="text-xs text-white/50 mt-1">
            {lastMessageTimes[personality.id] ? new Date(lastMessageTimes[personality.id]).toLocaleDateString() : 'Never'}
          </p>
        </div>
      </div>
    </div>
  );
    const messages = conversations[personalityId] || [];
    if (messages.length === 0) return 'No messages yet';
    const lastMessage = messages[messages.length - 1];
    const preview = lastMessage.content.length > 50 
      ? lastMessage.content.substring(0, 50) + '...' 
      : lastMessage.content;
    return lastMessage.role === 'user' ? `You: ${preview}` : preview;
  };

  const getUnreadCount = (personalityId) => {
    // For now, return 0. In future could track unread messages
    return 0;
  };

  // Home Page Component - Fixed to show cards instead of old interface
  const HomePage = () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto max-w-6xl p-4">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left">
              <h1 className="text-3xl font-bold text-white flex items-center gap-2 justify-center sm:justify-start">
                🤖 Your AI Companions
              </h1>
              <p className="text-white/80 mt-2">Choose a companion to start chatting</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={toggleNotifications}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  notificationsEnabled && notificationPermission === 'granted'
                    ? 'bg-blue-500/80 hover:bg-blue-600/80 text-white' 
                    : 'bg-gray-500/80 hover:bg-gray-600/80 text-white'
                }`}
                title="Toggle notifications"
              >
                {notificationPermission === 'granted' && notificationsEnabled ? '🔔' : '🔕'} Notify
              </button>
              <button 
                onClick={() => setProactiveEnabled(!proactiveEnabled)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  proactiveEnabled 
                    ? 'bg-green-500/80 hover:bg-green-600/80 text-white' 
                    : 'bg-gray-500/80 hover:bg-gray-600/80 text-white'
                }`}
                title="Toggle proactive messaging"
              >
                {proactiveEnabled ? '🔔' : '🔕'} Auto
              </button>
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
                Clear All
              </button>
            </div>
          </div>
        </div>

        {/* Companions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Built-in Personalities */}
          {personalities.map((p) => (
            <div key={p.id} className="group">
              <div 
                onClick={() => {
                  setCurrentPersonality(p.id);
                  // No opening message for built-in personalities
                }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 cursor-pointer hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                <div className="flex items-center gap-4 mb-4">
                  <PersonalityAvatar personalityId={p.id} size="large" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white truncate">{p.name}</h3>
                    <p className="text-white/60 text-sm">{p.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getUnreadCount(p.id) > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                        {getUnreadCount(p.id)}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(p.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 bg-red-500/80 hover:bg-red-600/80 text-white p-2 rounded-lg transition-all"
                      title="Delete conversation"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="text-white/70 text-sm">
                  <p className="truncate">{getLastMessage(p.id)}</p>
                  <p className="text-xs text-white/50 mt-1">
                    {lastMessageTimes[p.id] ? new Date(lastMessageTimes[p.id]).toLocaleDateString() : 'Never'}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Custom Personalities */}
          {customPersonalities.map((p) => (
            <div key={p.id} className="group">
              <div 
                onClick={async () => {
                  setCurrentPersonality(p.id);
                  // Generate opening message if it's a custom personality with scenario and no existing conversation
                  const currentMessages = conversations[p.id] || [];
                  if (currentMessages.length === 0 && p.scenario) {
                    await generateOpeningMessage(p.id);
                  }
                }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 cursor-pointer hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-xl relative"
              >
                <div className="absolute top-4 right-4">
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Custom</span>
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <PersonalityAvatar personalityId={p.id} size="large" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white truncate">{p.name}</h3>
                    <p className="text-white/60 text-sm truncate">{p.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getUnreadCount(p.id) > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                        {getUnreadCount(p.id)}
                      </span>
                    )}
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-all">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingPersonality(p);
                          setShowCreator(true);
                        }}
                        className="bg-blue-500/80 hover:bg-blue-600/80 text-white p-2 rounded-lg transition-colors"
                        title="Edit personality"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(p.id);
                        }}
                        className="bg-red-500/80 hover:bg-red-600/80 text-white p-2 rounded-lg transition-colors"
                        title="Delete conversation"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
                <div className="text-white/70 text-sm">
                  <p className="truncate">{getLastMessage(p.id)}</p>
                  <p className="text-xs text-white/50 mt-1">
                    {lastMessageTimes[p.id] ? new Date(lastMessageTimes[p.id]).toLocaleDateString() : 'Never'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Welcome Message for New Users */}
        {personalities.length === 0 && customPersonalities.length === 0 && (
          <div className="text-center text-white/60 mt-12">
            <h2 className="text-2xl mb-4">Welcome to your AI Companion App! 🤖</h2>
            <p className="mb-4">Loading your AI companions...</p>
          </div>
        )}

        {personalities.length > 0 && (
          <div className="text-center text-white/60 mt-8">
            <p className="text-sm">
              ✨ Create custom personalities • 🎨 Generate images • 💬 Proactive messaging • 🔔 Smart notifications
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // Individual Chat Page Component
  const ChatPage = () => {
    const currentMessages = conversations[currentPersonality] || [];
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="container mx-auto max-w-4xl h-screen flex flex-col">
          {/* Header */}
          <div className="bg-white/10 backdrop-blur-md border-b border-white/20 p-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setCurrentPersonality(null)}
                  className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg transition-colors"
                  title="Back to home"
                >
                  ← Back
                </button>
                <PersonalityAvatar personalityId={currentPersonality} size="medium" />
                <div>
                  <h1 className="text-xl font-bold text-white">
                    {getPersonalityDisplay(currentPersonality)}
                  </h1>
                  {isCustomPersonality(currentPersonality) && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">Custom</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={toggleNotifications}
                  className={`px-3 py-2 rounded-lg transition-colors text-sm ${
                    notificationsEnabled && notificationPermission === 'granted'
                      ? 'bg-blue-500/80 hover:bg-blue-600/80 text-white' 
                      : 'bg-gray-500/80 hover:bg-gray-600/80 text-white'
                  }`}
                  title="Toggle notifications"
                >
                  {notificationPermission === 'granted' && notificationsEnabled ? '🔔' : '🔕'}
                </button>
                <button 
                  onClick={() => setProactiveEnabled(!proactiveEnabled)}
                  className={`px-3 py-2 rounded-lg transition-colors text-sm ${
                    proactiveEnabled 
                      ? 'bg-green-500/80 hover:bg-green-600/80 text-white' 
                      : 'bg-gray-500/80 hover:bg-gray-600/80 text-white'
                  }`}
                  title="Toggle proactive messaging"
                >
                  {proactiveEnabled ? '🔔' : '🔕'}
                </button>
                {proactiveEnabled && (
                  <button 
                    onClick={triggerProactiveMessage}
                    className="bg-purple-500/80 hover:bg-purple-600/80 text-white px-3 py-2 rounded-lg transition-colors text-sm"
                    title="Trigger proactive message"
                  >
                    💬
                  </button>
                )}
                <button 
                  onClick={() => deleteConversation(currentPersonality)}
                  className="bg-red-500/80 hover:bg-red-600/80 text-white px-3 py-2 rounded-lg transition-colors text-sm"
                  title="Delete conversation"
                >
                  🗑️
                </button>
                {isCustomPersonality(currentPersonality) && (
                  <button
                    onClick={() => {
                      const p = customPersonalities.find(p => p.id === currentPersonality);
                      setEditingPersonality(p);
                      setShowCreator(true);
                    }}
                    className="bg-blue-500/80 hover:bg-blue-600/80 text-white px-3 py-2 rounded-lg transition-colors text-sm"
                    title="Edit personality"
                  >
                    ✏️
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {currentMessages.length === 0 && (
              <div className="text-center text-white/60 mt-8">
                <h2 className="text-xl mb-2">Start a conversation with {getPersonalityDisplay(currentPersonality)}! 💬</h2>
                <p>Type a message below to begin chatting.</p>
                <p className="mt-2 text-sm">
                  💡 Try: "Hello!" • "How are you?" • "Tell me about yourself" • "Draw me a picture"
                </p>
              </div>
            )}
            
            {currentMessages.map((message, index) => (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs sm:max-w-md lg:max-w-lg xl:max-w-xl rounded-2xl p-4 relative group ${
                  message.role === 'user' 
                    ? 'bg-blue-500 text-white ml-12' 
                    : 'bg-white/90 text-gray-800 mr-12'
                }`}>
                  {message.role === 'user' && (
                    <button
                      onClick={() => deleteMessageAndRevert(currentPersonality, index)}
                      className="absolute -top-2 -left-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete message and revert conversation"
                    >
                      ×
                    </button>
                  )}
                  {message.role === 'assistant' && (
                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-2">
                      <PersonalityAvatar personalityId={message.personality || currentPersonality} size="small" />
                      <div className="flex items-center gap-1">
                        {getPersonalityDisplay(message.personality || currentPersonality)}
                        {isCustomPersonality(message.personality || currentPersonality) && (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">Custom</span>
                        )}
                        {message.isProactive && (
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">💬 Proactive</span>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  {message.image && (
                    <div className="mt-3">
                      <img 
                        src={`data:image/jpeg;base64,${message.image}`}
                        alt={message.imagePrompt || "Generated image"}
                        className="max-w-full h-auto rounded-lg border border-gray-200"
                        loading="lazy"
                        onLoad={() => console.log('Image loaded successfully')}
                        onError={(e) => console.log('Image load error:', e)}
                      />
                      {message.imagePrompt && (
                        <p className="text-xs text-gray-500 mt-1 italic">
                          🎨 Generated: {message.imagePrompt}
                        </p>
                      )}
                    </div>
                  )}
                  {/* Debug display */}
                  {message.image && (
                    <div className="text-xs text-gray-400 mt-1">
                      🐛 Debug: Image data length: {message.image.length}
                    </div>
                  )}
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
                    <span className="text-sm text-gray-500">
                      {isGeneratingImage ? 'Creating your image... 🎨' : 'Thinking...'}
                    </span>
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
                placeholder={`Message ${getPersonalityDisplay(currentPersonality)}...`}
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

  // Main render logic
  if (currentPersonality === null) {
    return (
      <>
        <HomePage />
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
      </>
    );
  }

  return (
    <>
      <ChatPage />
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
    </>
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
