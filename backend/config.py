import os
from urllib.parse import urlparse

class Config:
    """Configuration class for environment-specific settings"""
    
    @staticmethod
    def get_base_url():
        """Get the base URL for the application"""
        # Check if we're in production (Theta Edge Cloud)
        if os.getenv('FLASK_ENV') == 'production':
            # In production, get the actual domain from environment
            base_url = os.getenv('BASE_URL')
            if base_url:
                return base_url
            
            # Fallback for Theta Edge Cloud
            return 'https://your-theta-domain.com'
        
        # In development, use localhost
        return 'http://localhost:5000'
    
    @staticmethod
    def get_oauth_redirect_uri():
        """Get the OAuth redirect URI for Google Drive"""
        base_url = Config.get_base_url()
        return f"{base_url}/oauth2callback"
    
    @staticmethod
    def get_websocket_url():
        """Get the WebSocket URL for real-time communication"""
        base_url = Config.get_base_url()
        if base_url.startswith('https://'):
            return base_url.replace('https://', 'wss://')
        else:
            return base_url.replace('http://', 'ws://')
    
    @staticmethod
    def is_production():
        """Check if we're running in production"""
        return os.getenv('FLASK_ENV') == 'production'
