import React, { useState } from 'react';

const ChatPage = ({ 
  conversations, 
  currentPersonality, 
  setCurrentPersonality,
  currentMessages,
  input,
  setInput,
  handleSend,
  handleKeyPress,
  isLoading,
  isGeneratingImage,
  error,
  getPersonalityDisplay,
  getPersonalityImage,
  PersonalityAvatar,
  isCustomPersonality,
  customPersonalities,
  setEditingPersonality,
  setShowCreator,
  deleteConversation,
  deleteMessageAndRevert,
  toggleNotifications,
  notificationsEnabled,
  notificationPermission,
  proactiveEnabled,
  setProactiveEnabled,
  messagesEndRef
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const currentPersonalityImage = getPersonalityImage(currentPersonality);
  
  return (
    <div 
      className="min-h-screen bg-black relative"
      style={{
        backgroundImage: currentPersonalityImage ? `url(${currentPersonalityImage})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Blur overlay */}
      {currentPersonalityImage && (
        <div 
          className="absolute inset-0 blur-overlay"
          style={{ 
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(25px)',
            WebkitBackdropFilter: 'blur(25px)',
            zIndex: 1
          }}
        />
      )}
      
      <div className="container mx-auto max-w-4xl h-screen flex flex-col relative" style={{ zIndex: 10 }}>
        {/* Minimal Header with Back Button and Dropdown */}
        <div className="flex items-center justify-between p-4">
          {/* Back Button */}
          <button
            onClick={() => setCurrentPersonality(null)}
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-2 hover:bg-white/20 transition-colors"
            title="Back to conversations"
          >
            <span className="text-white text-lg">←</span>
          </button>

          {/* Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-2 hover:bg-white/20 transition-colors"
              title="Options"
            >
              <span className="text-white text-lg">⚙️</span>
            </button>

            {/* Dropdown Content */}
            {showDropdown && (
              <div className="absolute top-12 right-0 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-4 min-w-[250px] z-20">
                <div className="space-y-3">
                  {/* Personality Info */}
                  <div className="border-b border-white/20 pb-3">
                    <div className="flex items-center gap-3">
                      <PersonalityAvatar personalityId={currentPersonality} size="medium" />
                      <div>
                        <h3 className="text-white font-medium">{getPersonalityDisplay(currentPersonality)}</h3>
                        <p className="text-white/60 text-sm">
                          {currentMessages.length} messages
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        toggleNotifications();
                        setShowDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded transition-colors ${
                        notificationsEnabled && notificationPermission === 'granted'
                          ? 'bg-green-500/20 text-green-300' 
                          : 'bg-gray-500/20 text-gray-300'
                      }`}
                    >
                      <span>🔔 Notifications</span>
                      <span className="text-xs">
                        {notificationPermission === 'granted' && notificationsEnabled ? 'ON' : 'OFF'}
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setProactiveEnabled(!proactiveEnabled);
                        setShowDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded transition-colors ${
                        proactiveEnabled 
                          ? 'bg-green-500/20 text-green-300' 
                          : 'bg-gray-500/20 text-gray-300'
                      }`}
                    >
                      <span>💬 Proactive Messages</span>
                      <span className="text-xs">{proactiveEnabled ? 'ON' : 'OFF'}</span>
                    </button>

                    {/* Custom Personality Edit Option */}
                    {isCustomPersonality(currentPersonality) && (
                      <button
                        onClick={() => {
                          const personality = customPersonalities.find(p => p.id === currentPersonality);
                          setEditingPersonality(personality);
                          setShowCreator(true);
                          setShowDropdown(false);
                        }}
                        className="w-full flex items-center justify-between p-2 rounded bg-blue-500/20 text-blue-300 transition-colors hover:bg-blue-500/30"
                      >
                        <span>✏️ Edit Personality</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        deleteConversation(currentPersonality);
                        setShowDropdown(false);
                      }}
                      className="w-full flex items-center justify-between p-2 rounded bg-red-500/20 text-red-300 transition-colors hover:bg-red-500/30"
                    >
                      <span>🗑️ Delete Conversation</span>
                    </button>
                  </div>

                  {/* Close Dropdown */}
                  <button
                    onClick={() => setShowDropdown(false)}
                    className="w-full text-center text-white/60 text-sm pt-2 border-t border-white/20"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {currentMessages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <PersonalityAvatar personalityId={currentPersonality} size="small" />
              )}
              <div
                className={`max-w-[80%] ${
                  message.role === 'user'
                    ? 'bg-blue-500/80 text-white'
                    : 'bg-white/10 backdrop-blur-md border border-white/20 text-white'
                } rounded-2xl p-4 relative group`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.image && (
                  <div className="mt-3">
                    <img 
                      src={message.image} 
                      alt="Generated content" 
                      className="max-w-full rounded-lg border border-white/20"
                    />
                    {message.imagePrompt && (
                      <p className="text-xs text-white/60 mt-1 italic">
                        Generated: {message.imagePrompt}
                      </p>
                    )}
                  </div>
                )}
                {message.role === 'assistant' && (
                  <button
                    onClick={() => deleteMessageAndRevert(currentPersonality, index)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-red-500/80 hover:bg-red-600/80 text-white text-xs p-1 rounded transition-all"
                    title="Delete this message and revert conversation"
                  >
                    ×
                  </button>
                )}
              </div>
              {message.role === 'user' && (
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  U
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
            {error && (
              <div className="mb-3 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}
            
            {isGeneratingImage && (
              <div className="mb-3 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-200 text-sm">
                🎨 Generating image... This may take a moment.
              </div>
            )}

            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 bg-white/20 backdrop-blur-md text-white placeholder-white/60 border border-white/30 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors"
              >
                {isLoading ? '⏳' : '➤'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;