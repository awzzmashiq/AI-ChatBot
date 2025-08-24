// Configuration for different environments
const config = {
  // API base URL - will be automatically detected
  getApiBaseUrl: () => {
    // In production (Theta Edge Cloud), use relative URLs
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return ''; // Relative URL - same domain
    }
    // In development, use localhost
    return 'http://localhost:5000';
  },
  
  // WebSocket URL - will be automatically detected
  getWebSocketUrl: () => {
    // In production, use secure WebSocket on same domain
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}`;
    }
    // In development, use localhost
    return 'ws://localhost:8098';
  }
};

export default config;
