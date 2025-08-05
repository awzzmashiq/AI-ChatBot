import os
import json
import shutil
from abc import ABC, abstractmethod
from typing import List, Dict, Optional, BinaryIO
import datetime

class StorageProvider(ABC):
    """Abstract base class for storage providers"""
    
    @abstractmethod
    def save_file(self, user: str, filename: str, file_data: BinaryIO) -> bool:
        """Save a file to storage"""
        pass
    
    @abstractmethod
    def get_file(self, user: str, filename: str) -> Optional[BinaryIO]:
        """Get a file from storage"""
        pass
    
    @abstractmethod
    def delete_file(self, user: str, filename: str) -> bool:
        """Delete a file from storage"""
        pass
    
    @abstractmethod
    def list_files(self, user: str) -> List[Dict]:
        """List all files for a user"""
        pass
    
    @abstractmethod
    def file_exists(self, user: str, filename: str) -> bool:
        """Check if a file exists"""
        pass

class LocalStorageProvider(StorageProvider):
    """Local file system storage provider"""
    
    def __init__(self, base_path: str = "books"):
        self.base_path = base_path
        os.makedirs(base_path, exist_ok=True)
    
    def _get_user_path(self, user: str) -> str:
        """Get user's storage directory path"""
        safe_user = "".join(c for c in user if c.isalnum() or c in ('@', '.', '_')).replace('@', '_at_')
        return os.path.join(self.base_path, safe_user)
    
    def save_file(self, user: str, filename: str, file_data: BinaryIO) -> bool:
        """Save file to local storage"""
        try:
            user_dir = self._get_user_path(user)
            os.makedirs(user_dir, exist_ok=True)
            
            file_path = os.path.join(user_dir, filename)
            with open(file_path, 'wb') as f:
                shutil.copyfileobj(file_data, f)
            
            return True
        except Exception as e:
            print(f"[LocalStorage] Save error: {e}")
            return False
    
    def get_file(self, user: str, filename: str) -> Optional[BinaryIO]:
        """Get file from local storage"""
        try:
            user_dir = self._get_user_path(user)
            file_path = os.path.join(user_dir, filename)
            
            if os.path.exists(file_path):
                return open(file_path, 'rb')
            return None
        except Exception as e:
            print(f"[LocalStorage] Get error: {e}")
            return None
    
    def delete_file(self, user: str, filename: str) -> bool:
        """Delete file from local storage"""
        try:
            user_dir = self._get_user_path(user)
            file_path = os.path.join(user_dir, filename)
            
            if os.path.exists(file_path):
                os.remove(file_path)
                return True
            return False
        except Exception as e:
            print(f"[LocalStorage] Delete error: {e}")
            return False
    
    def list_files(self, user: str) -> List[Dict]:
        """List all files for user"""
        try:
            user_dir = self._get_user_path(user)
            if not os.path.exists(user_dir):
                return []
            
            files = []
            for filename in os.listdir(user_dir):
                if filename == "indexed_files.json":
                    continue
                    
                file_path = os.path.join(user_dir, filename)
                if os.path.isfile(file_path):
                    stat = os.stat(file_path)
                    files.append({
                        "filename": filename,
                        "size": stat.st_size,
                        "upload_date": datetime.datetime.fromtimestamp(stat.st_ctime).isoformat(),
                        "last_modified": datetime.datetime.fromtimestamp(stat.st_mtime).isoformat(),
                        "file_type": filename.lower().rsplit('.', 1)[-1] if '.' in filename else 'unknown'
                    })
            
            return files
        except Exception as e:
            print(f"[LocalStorage] List error: {e}")
            return []
    
    def file_exists(self, user: str, filename: str) -> bool:
        """Check if file exists"""
        try:
            user_dir = self._get_user_path(user)
            file_path = os.path.join(user_dir, filename)
            return os.path.exists(file_path)
        except Exception as e:
            print(f"[LocalStorage] Exists error: {e}")
            return False

class GoogleDriveStorageProvider(StorageProvider):
    """Google Drive storage provider (Real implementation)"""
    
    def __init__(self, credentials_path: str = "credentials.json"):
        self.credentials_path = credentials_path
        self.drive_service = None
        self.initialized = False
        self.auth_url = None
        self.real_provider = None
        self.mock_storage = {}
        # Don't initialize immediately - wait until needed
    
    def _initialize_drive_service(self):
        """Initialize Google Drive API service"""
        try:
            # Check if credentials file exists
            if not os.path.exists(self.credentials_path):
                print(f"[GoogleDrive] Credentials file not found: {self.credentials_path}")
                print("[GoogleDrive] Please download credentials.json from Google Cloud Console")
                print("[GoogleDrive] Falling back to mock implementation")
                self._initialize_mock_service()
                return
            
            # Try to initialize real Google Drive service
            from real_google_drive import RealGoogleDriveStorageProvider
            self.real_provider = RealGoogleDriveStorageProvider(self.credentials_path)
            
            # Check if real provider is available (has credentials)
            if self.real_provider.credentials_available:
                print("[GoogleDrive] Real Google Drive provider initialized with credentials")
                print("[GoogleDrive] Authentication will be triggered when needed")
                self.initialized = True
            else:
                print("[GoogleDrive] Real Google Drive credentials not available, using mock")
                self._initialize_mock_service()
            
        except Exception as e:
            print(f"[GoogleDrive] Real implementation error: {e}")
            print("[GoogleDrive] Falling back to mock implementation")
            self._initialize_mock_service()
    
    def _initialize_mock_service(self):
        """Initialize mock Google Drive service as fallback"""
        try:
            print("[GoogleDrive] Mock Google Drive service initialized")
            print("[GoogleDrive] This is a demonstration - files are stored locally but organized like Google Drive")
            self.mock_storage = {}  # Simulate Google Drive storage
            self.initialized = True
            
        except Exception as e:
            print(f"[GoogleDrive] Mock initialization error: {e}")
            self.initialized = False
    
    def is_authenticated(self, user: str = None):
        """Check if Google Drive is properly authenticated for a specific user"""
        # Initialize if not done yet
        if self.real_provider is None:
            self._initialize_drive_service()
        
        # If real provider is available, check its authentication status
        if self.real_provider and self.real_provider.credentials_available:
            return self.real_provider.is_authenticated(user)
        
        # Otherwise, return mock authentication status
        return self.initialized
    
    def get_auth_url(self, user: str = None):
        """Get the authorization URL for Google Drive for a specific user"""
        # Initialize if not done yet
        if self.real_provider is None:
            self._initialize_drive_service()
        
        if self.real_provider:
            return self.real_provider.get_auth_url(user)
        return "https://accounts.google.com/o/oauth2/auth?client_id=demo&redirect_uri=http://localhost:3000"
    
    def complete_auth(self, auth_code, user: str = None):
        """Complete the OAuth flow with the authorization code for a specific user"""
        # Initialize if not done yet
        if self.real_provider is None:
            self._initialize_drive_service()
        
        if self.real_provider:
            return self.real_provider.complete_auth(auth_code, user)
        
        try:
            # Mock authentication - always succeeds for demo
            print(f"[GoogleDrive] Mock authentication completed successfully for user {user}")
            return True
            
        except Exception as e:
            print(f"[GoogleDrive] Authentication error for user {user}: {e}")
            return False
    
    def save_file(self, user: str, filename: str, file_data: BinaryIO) -> bool:
        """Save file to Google Drive"""
        # Initialize if not done yet
        if self.real_provider is None:
            self._initialize_drive_service()
        
        # Try to use real provider if available and authenticated
        if self.real_provider and self.real_provider.is_authenticated(user):
            print("[GoogleDrive] Using real Google Drive for file upload")
            return self.real_provider.save_file(user, filename, file_data)
        
        # If real provider exists but not authenticated, try to authenticate
        if self.real_provider and not self.real_provider.is_authenticated(user):
            print("[GoogleDrive] Real provider available but not authenticated")
            print("[GoogleDrive] Please complete authentication first")
            return False
        
        # Fallback to mock implementation
        if not self.is_authenticated():
            print("[GoogleDrive] Not authenticated. Please authenticate first.")
            return False
        
        try:
            # Mock file storage - store in memory for demo
            file_content = file_data.read()
            file_data.seek(0)  # Reset file pointer
            
            if user not in self.mock_storage:
                self.mock_storage[user] = {}
            
            self.mock_storage[user][filename] = {
                'content': file_content,
                'size': len(file_content),
                'created_time': datetime.datetime.now().isoformat(),
                'modified_time': datetime.datetime.now().isoformat(),
                'file_type': filename.lower().rsplit('.', 1)[-1] if '.' in filename else 'unknown'
            }
            
            print(f"[GoogleDrive] Mock file saved: {filename} for user {user}")
            return True
            
        except Exception as e:
            print(f"[GoogleDrive] Save error: {e}")
            return False
    
    def get_file(self, user: str, filename: str) -> Optional[BinaryIO]:
        """Get file from Google Drive"""
        if hasattr(self, 'real_provider') and self.real_provider.is_authenticated(user):
            return self.real_provider.get_file(user, filename)
        
        # Fallback to mock implementation
        if not self.is_authenticated(user):
            print("[GoogleDrive] Not authenticated. Please authenticate first.")
            return None
        
        try:
            if user not in self.mock_storage or filename not in self.mock_storage[user]:
                return None
            
            # Return mock file content
            from io import BytesIO
            file_content = self.mock_storage[user][filename]['content']
            return BytesIO(file_content)
            
        except Exception as e:
            print(f"[GoogleDrive] Get error: {e}")
            return None
    
    def delete_file(self, user: str, filename: str) -> bool:
        """Delete file from Google Drive"""
        if hasattr(self, 'real_provider') and self.real_provider.is_authenticated(user):
            return self.real_provider.delete_file(user, filename)
        
        # Fallback to mock implementation
        if not self.is_authenticated(user):
            print("[GoogleDrive] Not authenticated. Please authenticate first.")
            return False
        
        try:
            if user not in self.mock_storage or filename not in self.mock_storage[user]:
                return False
            
            # Delete from mock storage
            del self.mock_storage[user][filename]
            print(f"[GoogleDrive] Mock file deleted: {filename} for user {user}")
            return True
            
        except Exception as e:
            print(f"[GoogleDrive] Delete error: {e}")
            return False
    
    def list_files(self, user: str) -> List[Dict]:
        """List all files for user in Google Drive"""
        if hasattr(self, 'real_provider') and self.real_provider.is_authenticated(user):
            return self.real_provider.list_files(user)
        
        # Fallback to mock implementation
        if not self.is_authenticated(user):
            print("[GoogleDrive] Not authenticated. Please authenticate first.")
            return []
        
        try:
            if user not in self.mock_storage:
                return []
            
            file_list = []
            for filename, file_info in self.mock_storage[user].items():
                file_list.append({
                    "filename": filename,
                    "size": file_info['size'],
                    "upload_date": file_info['created_time'],
                    "last_modified": file_info['modified_time'],
                    "file_type": file_info['file_type'],
                    "drive_id": f"mock_id_{filename}"
                })
            
            return file_list
            
        except Exception as e:
            print(f"[GoogleDrive] List error: {e}")
            return []
    
    def file_exists(self, user: str, filename: str) -> bool:
        """Check if file exists in Google Drive"""
        if hasattr(self, 'real_provider') and self.real_provider.is_authenticated(user):
            return self.real_provider.file_exists(user, filename)
        
        # Fallback to mock implementation
        if not self.is_authenticated(user):
            print("[GoogleDrive] Not authenticated. Please authenticate first.")
            return False
        
        try:
            return user in self.mock_storage and filename in self.mock_storage[user]
            
        except Exception as e:
            print(f"[GoogleDrive] Exists error: {e}")
            return False

class StorageManager:
    """Main storage manager that handles different storage providers"""
    
    def __init__(self):
        self.providers = {
            'local': LocalStorageProvider(),
            'google_drive': None  # Initialize lazily when needed
        }
        self.user_preferences = self._load_user_preferences()
        print("[StorageManager] Initialized with local storage only")
    
    def _load_user_preferences(self) -> Dict:
        """Load user storage preferences"""
        try:
            if os.path.exists('storage_preferences.json'):
                with open('storage_preferences.json', 'r') as f:
                    return json.load(f)
        except Exception as e:
            print(f"[StorageManager] Load preferences error: {e}")
        return {}
    
    def _save_user_preferences(self):
        """Save user storage preferences"""
        try:
            with open('storage_preferences.json', 'w') as f:
                json.dump(self.user_preferences, f, indent=2)
        except Exception as e:
            print(f"[StorageManager] Save preferences error: {e}")
    
    def set_user_storage_preference(self, user: str, provider: str):
        """Set user's preferred storage provider"""
        # Initialize Google Drive provider if needed
        if provider == 'google_drive' and self.providers['google_drive'] is None:
            self.providers['google_drive'] = GoogleDriveStorageProvider()
        
        if provider not in self.providers:
            raise ValueError(f"Unknown storage provider: {provider}")
        
        self.user_preferences[user] = provider
        self._save_user_preferences()
        print(f"[StorageManager] User {user} set to use {provider} storage")
    
    def get_user_storage_provider(self, user: str) -> StorageProvider:
        """Get user's preferred storage provider"""
        provider_name = self.user_preferences.get(user, 'local')
        
        # Initialize Google Drive provider if needed
        if provider_name == 'google_drive' and self.providers['google_drive'] is None:
            self.providers['google_drive'] = GoogleDriveStorageProvider()
        
        return self.providers[provider_name]
    
    def is_storage_available(self, user: str, provider_name: str) -> bool:
        """Check if a storage provider is available for use by the user"""
        if provider_name == 'local':
            return True
        
        if provider_name == 'google_drive':
            if self.providers['google_drive'] is None:
                self.providers['google_drive'] = GoogleDriveStorageProvider()
            return self.providers['google_drive'].is_authenticated(user)
        
        return False
    
    def get_effective_storage_provider(self, user: str) -> StorageProvider:
        """Get the effective storage provider (falls back to local if preferred is not available)"""
        provider_name = self.user_preferences.get(user, 'local')
        
        if self.is_storage_available(user, provider_name):
            return self.get_user_storage_provider(user)
        else:
            # Fall back to local storage if preferred provider is not available
            return self.providers['local']
    
    def get_available_providers(self) -> List[str]:
        """Get list of available storage providers"""
        # Initialize Google Drive provider if not already done
        if self.providers['google_drive'] is None:
            self.providers['google_drive'] = GoogleDriveStorageProvider()
        
        return list(self.providers.keys())
    
    def migrate_user_data(self, user: str, from_provider: str, to_provider: str) -> bool:
        """Migrate user data between storage providers"""
        try:
            if from_provider not in self.providers or to_provider not in self.providers:
                return False
            
            from_storage = self.providers[from_provider]
            to_storage = self.providers[to_provider]
            
            # Get all files from source
            files = from_storage.list_files(user)
            
            # Copy each file to destination
            for file_info in files:
                filename = file_info['filename']
                
                # Get file from source
                file_data = from_storage.get_file(user, filename)
                if file_data:
                    # Save to destination
                    success = to_storage.save_file(user, filename, file_data)
                    if success:
                        # Delete from source
                        from_storage.delete_file(user, filename)
                    file_data.close()
            
            # Update user preference
            self.set_user_storage_preference(user, to_provider)
            
            return True
            
        except Exception as e:
            print(f"[StorageManager] Migration error: {e}")
            return False

# Global storage manager instance
storage_manager = StorageManager() 