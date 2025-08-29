import React, { useState, useEffect } from 'react';
import './index.css';
import Login from './components/Login';
import Chat from './components/Chat';
import { ThemeProvider } from './contexts/ThemeContext';
import config from './config';

function App() {
  const [user, setUser] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [orientation, setOrientation] = useState('portrait');

  // Mobile detection and responsive handling
  useEffect(() => {
    const checkDevice = () => {
      const mobile = window.innerWidth <= 768;
      const currentOrientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
      
      setIsMobile(mobile);
      setOrientation(currentOrientation);
    };

    // Initial check
    checkDevice();

    // Listen for resize and orientation changes
    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', checkDevice);

    // Cleanup
    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
    };
  }, []);

  useEffect(() => {
    // Check if already logged in (session active)
    console.log('[DEBUG] Checking session on app load');
    const apiBaseUrl = config.getApiBaseUrl();
    fetch(`${apiBaseUrl}/api/check`, { credentials: 'include' })
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
    <ThemeProvider>
      <div className={`App ${isMobile ? 'mobile' : 'desktop'} ${orientation}`}>
        {user ? (
          <Chat 
            user={user} 
            onLogout={handleLogout} 
            isMobile={isMobile}
            orientation={orientation}
          />
        ) : (
          <Login 
            onLoginSuccess={handleLoginSuccess} 
            isMobile={isMobile}
            orientation={orientation}
          />
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;