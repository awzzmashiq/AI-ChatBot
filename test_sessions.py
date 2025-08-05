import requests
import json

# Test configuration
BASE_URL = "http://localhost:5000"
TEST_USER = {
    "username": "testuser@example.com",
    "password": "test_password_123"  # Use a generic test password
}

def test_session_management():
    print("🧪 Testing Session Management...")
    
    # Test login
    try:
        response = requests.post(f"{BASE_URL}/api/login", json=TEST_USER)
        print(f"✅ Login: {response.status_code}")
        
        if response.status_code == 200:
            cookies = response.cookies
            
            # Test session creation
            session_data = {"name": "Test Study Session"}
            response = requests.post(f"{BASE_URL}/api/sessions", 
                                   json=session_data, cookies=cookies)
            print(f"✅ Session creation: {response.status_code}")
            
            # Test session listing
            response = requests.get(f"{BASE_URL}/api/sessions", cookies=cookies)
            print(f"✅ Session listing: {response.status_code}")
            
            if response.status_code == 200:
                sessions = response.json().get('sessions', [])
                print(f"📋 Found {len(sessions)} sessions")
                
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_session_management() 