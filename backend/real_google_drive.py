#!/usr/bin/env python3
"""
Real Google Drive Storage Provider
Uses actual Google Drive API for file storage and management
"""

import os
import json
import pickle
from typing import List, Dict, Optional, BinaryIO
import datetime
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload, MediaIoBaseDownload
from googleapiclient.errors import HttpError
from io import BytesIO

# If modifying these scopes, delete the file token.pickle.
SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'openid',
    'email',
    'profile'
]

class RealGoogleDriveStorageProvider:
    """Real Google Drive storage provider using Google Drive API"""
    
    def __init__(self, credentials_path: str = "credentials.json"):
        self.credentials_path = credentials_path
        self.user_services = {}  # Store service per user
        self.user_authenticated = {}  # Track authentication per user
        self.credentials_available = False  # Initialize this variable
        self.used_auth_codes = set()  # Track used authorization codes to prevent reuse
        self._initialize_service()
    
    def _initialize_service(self):
        """Initialize Google Drive API service (lazy authentication)"""
        try:
            if not os.path.exists(self.credentials_path):
                print(f"[GoogleDrive] Credentials file not found: {self.credentials_path}")
                print("[GoogleDrive] Will use mock implementation until credentials are provided")
                return
            
            # Just check if credentials file is valid, don't authenticate yet
            try:
                with open(self.credentials_path, 'r') as f:
                    creds_data = json.load(f)
                if 'web' in creds_data:
                    print("[GoogleDrive] Credentials file found - ready for authentication when needed")
                    self.credentials_available = True
                else:
                    print("[GoogleDrive] Invalid credentials file format")
                    self.credentials_available = False
            except Exception as e:
                print(f"[GoogleDrive] Error reading credentials file: {e}")
                self.credentials_available = False
                
        except Exception as e:
            print(f"[GoogleDrive] Initialization error: {e}")
            self.credentials_available = False
    
    def _get_user_token_path(self, user: str) -> str:
        """Get user-specific token file path"""
        safe_user = "".join(c for c in user if c.isalnum() or c in ('@', '.', '_')).replace('@', '_at_')
        return f"token_{safe_user}.pickle"
    
    def _authenticate_user_if_needed(self, user: str):
        """Authenticate specific user with Google Drive only when needed"""
        if user in self.user_authenticated and self.user_authenticated[user]:
            return True
            
        if not self.credentials_available:
            return False
            
        try:
            # Load credentials
            flow = InstalledAppFlow.from_client_secrets_file(
                self.credentials_path, SCOPES)
            
            # Check if we have valid credentials for this user
            creds = None
            token_path = self._get_user_token_path(user)
            
            if os.path.exists(token_path):
                with open(token_path, 'rb') as token:
                    creds = pickle.load(token)
            
            # If there are no (valid) credentials available, let the user log in.
            if not creds or not creds.valid:
                if creds and creds.expired and creds.refresh_token:
                    creds.refresh(Request())
                else:
                    print(f"[GoogleDrive] User {user} needs to authenticate with Google Drive")
                    # Don't auto-authenticate - let the user do it through the web interface
                    return False
                
                # Save the credentials for this user
                with open(token_path, 'wb') as token:
                    pickle.dump(creds, token)
            
            # Build the service for this user
            self.user_services[user] = build('drive', 'v3', credentials=creds)
            self.user_authenticated[user] = True
            print(f"[GoogleDrive] Successfully authenticated user {user} with Google Drive API")
            return True
            
        except Exception as e:
            print(f"[GoogleDrive] Authentication error for user {user}: {e}")
            self.user_authenticated[user] = False
            return False
    
    def is_authenticated(self, user: str = None):
        """Check if Google Drive is properly authenticated for a specific user"""
        if user is None:
            # For backward compatibility, check if any user is authenticated
            return any(self.user_authenticated.values())
        
        # Check if specific user is authenticated
        return user in self.user_authenticated and self.user_authenticated[user]
    
    def get_auth_url(self, user: str = None):
        """Get the authorization URL for Google Drive for a specific user"""
        try:
            if not os.path.exists(self.credentials_path):
                return None
            
            # Clear any used auth codes when getting a new auth URL
            print(f"[GoogleDrive] 🧹 Clearing used auth codes for fresh authentication")
            self.used_auth_codes.clear()
            
            # Use a specific redirect URI for this user
            redirect_uri = "http://localhost:5000/oauth2callback"
            
            # Read credentials to see what's configured
            with open(self.credentials_path, 'r') as f:
                creds_data = json.load(f)
            
            # Create flow with specific redirect URI
            flow = InstalledAppFlow.from_client_secrets_file(
                self.credentials_path, SCOPES)
            flow.redirect_uri = redirect_uri
            
            # Encode user in state parameter for OAuth callback
            state = None
            if user:
                import base64
                state = base64.b64encode(user.encode()).decode()
                print(f"[GoogleDrive] 🔐 Encoding user '{user}' in state parameter: {state}")
            
            # Generate authorization URL
            auth_url, _ = flow.authorization_url(
                access_type='offline',
                include_granted_scopes='true',
                prompt='consent',  # Force consent screen to get refresh token
                state=state
            )
            
            print(f"[GoogleDrive] Generated auth URL for user {user} with state: {state}")
            return auth_url
            
        except Exception as e:
            print(f"[GoogleDrive] Error generating auth URL for user {user}: {e}")
            return None
    
    def complete_auth(self, auth_code: str, user: str = None):
        """Complete Google Drive OAuth flow for a specific user"""
        print(f"[GoogleDrive] 🔐 Starting authentication completion for user: {user}")
        print(f"[GoogleDrive] 📝 Auth code received: {auth_code[:20]}...")
        
        # Check if this auth code has already been used
        if auth_code in self.used_auth_codes:
            print(f"[GoogleDrive] 🚫 Authorization code already used: {auth_code[:20]}...")
            return False
        
        try:
            if not os.path.exists(self.credentials_path):
                print(f"[GoogleDrive] ❌ Credentials file not found: {self.credentials_path}")
                return False
            
            # Use a specific redirect URI
            redirect_uri = "http://localhost:5000/oauth2callback"
            print(f"[GoogleDrive] 🔗 Using redirect URI: {redirect_uri}")
            
            # Clear any existing tokens for this user first
            token_path = self._get_user_token_path(user)
            if os.path.exists(token_path):
                print(f"[GoogleDrive] 🗑️ Removing existing token file: {token_path}")
                os.remove(token_path)
            
            # Clear from memory
            if user in self.user_authenticated:
                del self.user_authenticated[user]
            if user in self.user_services:
                del self.user_services[user]
            
            # Manual OAuth token exchange to bypass scope issues
            print(f"[GoogleDrive] 🔧 Attempting manual OAuth token exchange...")
            
            try:
                # Read credentials file
                with open(self.credentials_path, 'r') as f:
                    creds_data = json.load(f)
                
                # Extract client info
                client_id = creds_data['web']['client_id']
                client_secret = creds_data['web']['client_secret']
                
                # Prepare token exchange request
                import requests
                
                token_url = "https://oauth2.googleapis.com/token"
                token_data = {
                    'client_id': client_id,
                    'client_secret': client_secret,
                    'code': auth_code,
                    'grant_type': 'authorization_code',
                    'redirect_uri': redirect_uri
                }
                
                print(f"[GoogleDrive] 🔄 Sending manual token exchange request...")
                response = requests.post(token_url, data=token_data)
                
                if response.status_code == 200:
                    token_response = response.json()
                    print(f"[GoogleDrive] ✅ Manual token exchange successful")
                    
                    # Create credentials object from response
                    from google.oauth2.credentials import Credentials
                    creds = Credentials(
                        token=token_response['access_token'],
                        refresh_token=token_response.get('refresh_token'),
                        token_uri="https://oauth2.googleapis.com/token",
                        client_id=client_id,
                        client_secret=client_secret,
                        scopes=token_response.get('scope', '').split() if 'scope' in token_response else SCOPES
                    )
                    
                else:
                    print(f"[GoogleDrive] ❌ Manual token exchange failed: {response.status_code} - {response.text}")
                    # Mark this auth code as used to prevent future attempts
                    self.used_auth_codes.add(auth_code)
                    return False
                    
            except Exception as manual_error:
                print(f"[GoogleDrive] ❌ Manual token exchange error: {manual_error}")
                # Mark this auth code as used to prevent future attempts
                self.used_auth_codes.add(auth_code)
                return False
            
            # Mark this auth code as successfully used
            self.used_auth_codes.add(auth_code)
            
            # Get credentials from the flow
            if 'creds' not in locals():
                creds = flow.credentials
            print(f"[GoogleDrive] 📋 Credentials obtained successfully")
            
            # Save credentials for this specific user
            print(f"[GoogleDrive] 💾 Saving credentials to: {token_path}")
            with open(token_path, 'wb') as token:
                pickle.dump(creds, token)
            
            # Build service for this user
            print(f"[GoogleDrive] 🔨 Building Google Drive service...")
            self.user_services[user] = build('drive', 'v3', credentials=creds)
            self.user_authenticated[user] = True
            
            print(f"[GoogleDrive] 🎉 Successfully completed authentication for user {user}")
            return True
            
        except Exception as e:
            print(f"[GoogleDrive] 💥 Error completing auth for user {user}: {e}")
            print(f"[GoogleDrive] 🔍 Full error details: {type(e).__name__}: {str(e)}")
            # Mark this auth code as used even if it failed
            self.used_auth_codes.add(auth_code)
            return False
    
    def _get_user_folder_id(self, user: str) -> Optional[str]:
        """Get or create user's folder in Google Drive"""
        try:
            if not self._authenticate_user_if_needed(user):
                return None
            
            service = self.user_services.get(user)
            if not service:
                return None
            
            # Search for existing folder
            folder_name = f"EduAssist_{user}"
            query = f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
            
            results = service.files().list(
                q=query,
                spaces='drive',
                fields='files(id, name)'
            ).execute()
            
            files = results.get('files', [])
            
            if files:
                # Folder exists, return its ID
                return files[0]['id']
            else:
                # Create new folder
                folder_metadata = {
                    'name': folder_name,
                    'mimeType': 'application/vnd.google-apps.folder'
                }
                
                folder = service.files().create(
                    body=folder_metadata,
                    fields='id'
                ).execute()
                
                print(f"[GoogleDrive] Created folder for user {user}: {folder_name}")
                return folder.get('id')
                
        except Exception as e:
            print(f"[GoogleDrive] Folder creation error for user {user}: {e}")
            return None
    
    def save_file(self, user: str, filename: str, file_data: BinaryIO) -> bool:
        """Save file to Google Drive for specific user"""
        if not self._authenticate_user_if_needed(user):
            print(f"[GoogleDrive] Authentication required for user {user}.")
            return False
        
        try:
            service = self.user_services.get(user)
            if not service:
                return False
            
            folder_id = self._get_user_folder_id(user)
            if not folder_id:
                return False
            
            # Check if file already exists
            query = f"name='{filename}' and '{folder_id}' in parents and trashed=false"
            results = service.files().list(
                q=query,
                spaces='drive',
                fields='files(id)'
            ).execute()
            
            existing_files = results.get('files', [])
            
            # Prepare file metadata
            file_metadata = {
                'name': filename,
                'parents': [folder_id]
            }
            
            # Create media upload
            media = MediaIoBaseUpload(
                file_data,
                mimetype='application/octet-stream',
                resumable=True
            )
            
            if existing_files:
                # Update existing file
                file_id = existing_files[0]['id']
                file = service.files().update(
                    fileId=file_id,
                    media_body=media
                ).execute()
                print(f"[GoogleDrive] Updated file for user {user}: {filename}")
            else:
                # Create new file
                file = service.files().create(
                    body=file_metadata,
                    media_body=media,
                    fields='id'
                ).execute()
                print(f"[GoogleDrive] Created file for user {user}: {filename}")
            
            return True
            
        except Exception as e:
            print(f"[GoogleDrive] Save error for user {user}: {e}")
            return False
    
    def get_file(self, user: str, filename: str) -> Optional[BinaryIO]:
        """Get file from Google Drive for specific user"""
        if not self._authenticate_user_if_needed(user):
            print(f"[GoogleDrive] Authentication required for user {user}.")
            return None
        
        try:
            service = self.user_services.get(user)
            if not service:
                return None
            
            folder_id = self._get_user_folder_id(user)
            if not folder_id:
                return None
            
            # Find the file
            query = f"name='{filename}' and '{folder_id}' in parents and trashed=false"
            results = service.files().list(
                q=query,
                spaces='drive',
                fields='files(id, name)'
            ).execute()
            
            files = results.get('files', [])
            if not files:
                return None
            
            file_id = files[0]['id']
            
            # Download the file
            request = service.files().get_media(fileId=file_id)
            file_data = BytesIO()
            downloader = MediaIoBaseDownload(file_data, request)
            
            done = False
            while done is False:
                status, done = downloader.next_chunk()
            
            file_data.seek(0)
            print(f"[GoogleDrive] Retrieved file for user {user}: {filename}")
            return file_data
            
        except Exception as e:
            print(f"[GoogleDrive] Get error for user {user}: {e}")
            return None
    
    def delete_file(self, user: str, filename: str) -> bool:
        """Delete file from Google Drive for specific user"""
        if not self._authenticate_user_if_needed(user):
            print(f"[GoogleDrive] Authentication required for user {user}.")
            return False
        
        try:
            service = self.user_services.get(user)
            if not service:
                return False
            
            folder_id = self._get_user_folder_id(user)
            if not folder_id:
                return False
            
            # Find the file
            query = f"name='{filename}' and '{folder_id}' in parents and trashed=false"
            results = service.files().list(
                q=query,
                spaces='drive',
                fields='files(id, name)'
            ).execute()
            
            files = results.get('files', [])
            if not files:
                return False
            
            file_id = files[0]['id']
            
            # Delete the file
            service.files().delete(fileId=file_id).execute()
            print(f"[GoogleDrive] Deleted file for user {user}: {filename}")
            return True
            
        except Exception as e:
            print(f"[GoogleDrive] Delete error for user {user}: {e}")
            return False
    
    def list_files(self, user: str) -> List[Dict]:
        """List all files for user in Google Drive"""
        if not self._authenticate_user_if_needed(user):
            print(f"[GoogleDrive] Authentication required for user {user}.")
            return []
        
        try:
            service = self.user_services.get(user)
            if not service:
                return []
            
            folder_id = self._get_user_folder_id(user)
            if not folder_id:
                return []
            
            # List files in the folder
            query = f"'{folder_id}' in parents and trashed=false"
            results = service.files().list(
                q=query,
                spaces='drive',
                fields='files(id, name, size, createdTime, modifiedTime, mimeType)'
            ).execute()
            
            files = results.get('files', [])
            file_list = []
            
            for file in files:
                # Skip folders
                if file['mimeType'] == 'application/vnd.google-apps.folder':
                    continue
                
                file_list.append({
                    "filename": file['name'],
                    "size": int(file.get('size', 0)),
                    "upload_date": file['createdTime'],
                    "last_modified": file['modifiedTime'],
                    "file_type": file['name'].lower().rsplit('.', 1)[-1] if '.' in file['name'] else 'unknown',
                    "drive_id": file['id']
                })
            
            return file_list
            
        except Exception as e:
            print(f"[GoogleDrive] List error for user {user}: {e}")
            return []
    
    def file_exists(self, user: str, filename: str) -> bool:
        """Check if file exists in Google Drive for specific user"""
        if not self._authenticate_user_if_needed(user):
            print(f"[GoogleDrive] Authentication required for user {user}.")
            return False
        
        try:
            service = self.user_services.get(user)
            if not service:
                return False
            
            folder_id = self._get_user_folder_id(user)
            if not folder_id:
                return False
            
            query = f"name='{filename}' and '{folder_id}' in parents and trashed=false"
            results = service.files().list(
                q=query,
                spaces='drive',
                fields='files(id)'
            ).execute()
            
            files = results.get('files', [])
            return len(files) > 0
            
        except Exception as e:
            print(f"[GoogleDrive] Exists error for user {user}: {e}")
            return False 