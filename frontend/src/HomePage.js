import React, { useState, useEffect } from 'react';

const HomePage = () => {
  const [personalities, setPersonalities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPersonalities = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/personalities`);
        if (!response.ok) {
          throw new Error('Failed to fetch personalities');
        }
        const data = await response.json();
        setPersonalities(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchPersonalities();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4">
        <div className="text-red-500 mb-4">Error: {error}</div>
        <button 
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6 text-white">AI Companions</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.isArray(personalities) && personalities.length > 0 ? (
          personalities.map((personality) => (
            <div 
              key={personality.id} 
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-4 hover:bg-white/20 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                  {personality.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-white font-medium">{personality.name}</h3>
                  <p className="text-white/60 text-sm">{personality.description}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-white/60">
            <p className="text-xl mb-2">No companions found</p>
            <p>Create your first AI companion by clicking the + button</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
