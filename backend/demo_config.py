# Demo Configuration for Investor Presentations
import os
from functools import wraps
from flask import request, jsonify, g
import secrets

class DemoSecurity:
    """Security settings for demo deployment"""
    
    # Demo access codes (set these in environment variables)
    DEMO_ACCESS_CODES = [
        os.getenv('DEMO_CODE_1', 'INVESTOR_DEMO_2024'),
        os.getenv('DEMO_CODE_2', 'POC_ACCESS_KEY'),
        os.getenv('DEMO_CODE_3', 'STARTUP_SHOWCASE')
    ]
    
    # Rate limiting for demo
    MAX_REQUESTS_PER_HOUR = 100
    MAX_USERS_SIMULTANEOUS = 10
    
    # Demo user limits
    MAX_DOCUMENTS_PER_USER = 5
    MAX_FILE_SIZE_MB = 10
    
    @staticmethod
    def generate_demo_credentials():
        """Generate secure demo credentials for investors"""
        return {
            'demo_username': f'demo_{secrets.token_hex(4)}',
            'demo_password': secrets.token_urlsafe(12),
            'access_code': secrets.token_hex(8).upper()
        }

def require_demo_access(f):
    """Decorator to require demo access code"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Check for demo access code in headers or query params
        access_code = (
            request.headers.get('X-Demo-Access-Code') or 
            request.args.get('demo_code') or
            request.json.get('demo_code') if request.is_json else None
        )
        
        if access_code not in DemoSecurity.DEMO_ACCESS_CODES:
            return jsonify({
                'error': 'Demo access required',
                'message': 'Please contact the team for demo access'
            }), 403
            
        g.is_demo_user = True
        return f(*args, **kwargs)
    
    return decorated_function

# Demo environment detection
def is_demo_environment():
    """Check if running in demo mode"""
    return os.getenv('FLASK_ENV') == 'demo' or os.getenv('DEMO_MODE') == 'true'

# Demo data cleanup (optional)
def setup_demo_data_cleanup():
    """Clean up demo data periodically"""
    import atexit
    import shutil
    import glob
    
    def cleanup():
        if is_demo_environment():
            # Clean up demo user data
            demo_files = glob.glob('*demo*')
            for file in demo_files:
                try:
                    if os.path.isfile(file):
                        os.remove(file)
                    elif os.path.isdir(file):
                        shutil.rmtree(file)
                except:
                    pass
    
    atexit.register(cleanup)