import React, { useState, useEffect } from 'react';
import './index.css';
import Login from './components/Login';
import Chat from './components/Chat';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if already logged in (session active)
    console.log('[DEBUG] Checking session on app load');
    fetch('http://localhost:5000/api/check', { credentials: 'include' })
      .then(res => {
        console.log(`[DEBUG] Session check response status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        console.log(`[DEBUG] Session check data:`, data);
        if (data.loggedIn) {
          console.log(`[DEBUG] User is logged in: ${data.user}`);
          setUser(data.user);
        } else {
          console.log('[DEBUG] User is not logged in');
        }
      })
      .catch(err => console.error('Session check error:', err));
  }, []);

  const handleLoginSuccess = (username) => {
    setUser(username);
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <div className="App">
      {user ? (
        <Chat user={user} onLogout={handleLogout} />
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}

export default App;
