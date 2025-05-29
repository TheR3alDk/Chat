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
  const [conversations, setConversations] = useState({}); // {personalityId: messages[]}
  const [currentPersonality, setCurrentPersonality] = useState(null); // null = home page
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [error, setError] = useState(null);
  const [personalities, setPersonalities] = useState([]);
  const [customPersonalities, setCustomPersonalities] = useState([]);
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
    loadPersonalities();
    loadCustomPersonalities();
    
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
    
    const savedConversations = localStorage.getItem('conversations');
    if (savedConversations) {
      setConversations(JSON.parse(savedConversations));
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
      
      const requestData = {
        messages: newMessages,
        personality: currentPersonality,
        custom_personalities: customPersonalities, // Pass custom personalities for self-image generation
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

  const triggerProactiveMessage = async () => {
    console.log('Manually triggering proactive message');
    await sendProactiveMessage();
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

  const getLastMessage = (personalityId) => {
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

  // Home Page Component
  const HomePage = () => (
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
                  <PersonalityAvatar personalityId={currentPersonality} size="medium" />
                  <select 
                    value={currentPersonality || ''} 
                    onChange={(e) => setCurrentPersonality(e.target.value)}
                    className="bg-white/20 backdrop-blur-md text-white border border-white/30 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="">Select a personality</option>
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
                  {isCustomPersonality(currentPersonality) && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          const p = customPersonalities.find(p => p.id === currentPersonality);
                          setEditingPersonality(p);
                          setShowCreator(true);
                        }}
                        className="bg-blue-500/80 hover:bg-blue-600/80 text-white p-2 rounded-lg transition-colors"
                        title="Edit personality"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeletePersonality(currentPersonality)}
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
                  onClick={toggleNotifications}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    notificationsEnabled && notificationPermission === 'granted'
                      ? 'bg-blue-500/80 hover:bg-blue-600/80 text-white' 
                      : notificationsEnabled && notificationPermission === 'default'
                      ? 'bg-yellow-500/80 hover:bg-yellow-600/80 text-white'
                      : 'bg-gray-500/80 hover:bg-gray-600/80 text-white'
                  }`}
                  title={
                    notificationPermission === 'granted' && notificationsEnabled
                      ? 'Notifications ON - Click to disable'
                      : notificationPermission === 'denied'
                      ? 'Notifications blocked by browser'
                      : notificationPermission === 'default'
                      ? 'Click to enable notifications'
                      : 'Notifications OFF - Click to enable'
                  }
                >
                  {notificationPermission === 'granted' && notificationsEnabled
                    ? '🔔' 
                    : notificationPermission === 'denied'
                    ? '🚫'
                    : '🔕'
                  } Notify
                </button>
                <button 
                  onClick={() => setProactiveEnabled(!proactiveEnabled)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    proactiveEnabled 
                      ? 'bg-green-500/80 hover:bg-green-600/80 text-white' 
                      : 'bg-gray-500/80 hover:bg-gray-600/80 text-white'
                  }`}
                  title={proactiveEnabled ? 'Proactive messaging ON' : 'Proactive messaging OFF'}
                >
                  {proactiveEnabled ? '🔔' : '🔕'} Auto
                </button>
                {proactiveEnabled && (
                  <button 
                    onClick={triggerProactiveMessage}
                    className="bg-purple-500/80 hover:bg-purple-600/80 text-white px-4 py-2 rounded-lg transition-colors"
                    title="Trigger proactive message now (for testing)"
                  >
                    💬 Test
                  </button>
                )}
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
          {(!currentPersonality || !conversations[currentPersonality] || conversations[currentPersonality].length === 0) && (
            <div className="text-center text-white/60 mt-8">
              <h2 className="text-xl mb-2">Welcome to your Private AI Chatbot! 💬</h2>
              <p>Choose a personality and start chatting. Your conversations are stored locally only.</p>
              <p className="mt-2">✨ <strong>New:</strong> Create your own custom personalities!</p>
              <p className="mt-1">🎨 <strong>Plus:</strong> Ask for images and I'll create them for you!</p>
              <p className="mt-1">💬 <strong>Amazing:</strong> Your chatbots will message you proactively!</p>
              <p className="mt-1">🔔 <strong>Notifications:</strong> Get notified when they reach out!</p>
              <p className="text-sm mt-3 text-white/40">
                Try: "Draw me a sunset" or "Create a picture of a cute cat"
              </p>
              <p className="text-sm mt-1 text-white/40">
                Click "🔔 Notify" to enable notifications • "🔔 Auto" for proactive messaging
              </p>
            </div>
          )}
          
          {currentPersonality && conversations[currentPersonality]?.map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs sm:max-w-md lg:max-w-lg xl:max-w-xl rounded-2xl p-4 ${
                message.role === 'user' 
                  ? 'bg-blue-500 text-white ml-12' 
                  : 'bg-white/90 text-gray-800 mr-12'
              }`}>
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
};

function App() {
  return (
    <div className="App">
      <ChatInterface />
    </div>
  );
}

export default App;
