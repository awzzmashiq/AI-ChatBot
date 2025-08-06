#!/usr/bin/env python3
"""
Google Drive Service Account Authentication
Alternative approach using service account credentials
"""

import os
import json
from google.oauth2 import service_account
from googleapiclient.discovery import build
from typing import Optional, BinaryIO, List, Dict
import io

SCOPES = ['https://www.googleapis.com/auth/drive']

class ServiceAccountGoogleDriveProvider:
    """Google Drive provider using service account authentication"""
    
    def __init__(self, service_account_file: str = "service-account-key.json"):
        self.service_account_file = service_account_file
        self.service = None
        self.authenticated = False
        self._initialize_service()
    
    def _initialize_service(self):
        """Initialize Google Drive service with service account"""
        try:
            if not os.path.exists(self.service_account_file):
                print(f"[ServiceAccount] Service account file not found: {self.service_account_file}")
                print("[ServiceAccount] Please download service-account-key.json from Google Cloud Console")
                return
            
            # Load service account credentials
            credentials = service_account.Credentials.from_service_account_file(
                self.service_account_file, scopes=SCOPES)
            
            # Build the service
            self.service = build('drive', 'v3', credentials=credentials)
            self.authenticated = True
            
            print(f"[ServiceAccount] ✅ Service account authentication successful")
            
        except Exception as e:
            print(f"[ServiceAccount] ❌ Service account initialization error: {e}")
            self.authenticated = False
    
    def is_authenticated(self, user: str = None) -> bool:
        """Check if service account is authenticated"""
        return self.authenticated and self.service is not None
    
    def get_auth_url(self, user: str = None) -> Optional[str]:
        """Service account doesn't need auth URL - it's pre-authenticated"""
        if self.is_authenticated():
            return None  # No auth URL needed
        return None
    
    def complete_auth(self, auth_code: str, user: str = None) -> bool:
        """Service account doesn't need OAuth completion"""
        return self.is_authenticated()
    
    def _get_user_folder_id(self, user: str) -> Optional[str]:
        """Get or create user's folder in Google Drive"""
        try:
            if not self.is_authenticated():
                return None
            
            # Search for existing folder
            folder_name = f"EduAssist_{user}"
            query = f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
            
            results = self.service.files().list(
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
                
                folder = self.service.files().create(
                    body=folder_metadata,
                    fields='id'
                ).execute()
                
                print(f"[ServiceAccount] Created folder for user {user}: {folder_name}")
                return folder.get('id')
                
        except Exception as e:
            print(f"[ServiceAccount] Folder creation error for user {user}: {e}")
            return None
    
    def save_file(self, user: str, filename: str, file_data: BinaryIO) -> bool:
        """Save file to Google Drive for specific user"""
        if not self.is_authenticated():
            print(f"[ServiceAccount] Authentication required for user {user}.")
            return False
        
        try:
            # Get user's folder
            folder_id = self._get_user_folder_id(user)
            if not folder_id:
                print(f"[ServiceAccount] Could not get folder for user {user}")
                return False
            
            # Check if file already exists
            query = f"name='{filename}' and '{folder_id}' in parents and trashed=false"
            results = self.service.files().list(
                q=query,
                spaces='drive',
                fields='files(id, name)'
            ).execute()
            
            existing_files = results.get('files', [])
            
            # Read file data
            file_content = file_data.read()
            file_data.seek(0)  # Reset file pointer
            
            if existing_files:
                # Update existing file
                file_id = existing_files[0]['id']
                media = io.BytesIO(file_content)
                media.seek(0)
                
                self.service.files().update(
                    fileId=file_id,
                    media_body=media
                ).execute()
                
                print(f"[ServiceAccount] Updated existing file: {filename} for user {user}")
            else:
                # Create new file
                file_metadata = {
                    'name': filename,
                    'parents': [folder_id]
                }
                
                media = io.BytesIO(file_content)
                media.seek(0)
                
                self.service.files().create(
                    body=file_metadata,
                    media_body=media,
                    fields='id'
                ).execute()
                
                print(f"[ServiceAccount] Created new file: {filename} for user {user}")
            
            return True
            
        except Exception as e:
            print(f"[ServiceAccount] Save file error for user {user}: {e}")
            return False
    
    def get_file(self, user: str, filename: str) -> Optional[BinaryIO]:
        """Get file from Google Drive for specific user"""
        if not self.is_authenticated():
            return None
        
        try:
            # Get user's folder
            folder_id = self._get_user_folder_id(user)
            if not folder_id:
                return None
            
            # Search for file
            query = f"name='{filename}' and '{folder_id}' in parents and trashed=false"
            results = self.service.files().list(
                q=query,
                spaces='drive',
                fields='files(id, name)'
            ).execute()
            
            files = results.get('files', [])
            
            if not files:
                return None
            
            file_id = files[0]['id']
            
            # Download file
            request = self.service.files().get_media(fileId=file_id)
            file_content = request.execute()
            
            return io.BytesIO(file_content)
            
        except Exception as e:
            print(f"[ServiceAccount] Get file error for user {user}: {e}")
            return None
    
    def delete_file(self, user: str, filename: str) -> bool:
        """Delete file from Google Drive for specific user"""
        if not self.is_authenticated():
            return False
        
        try:
            # Get user's folder
            folder_id = self._get_user_folder_id(user)
            if not folder_id:
                return False
            
            # Search for file
            query = f"name='{filename}' and '{folder_id}' in parents and trashed=false"
            results = self.service.files().list(
                q=query,
                spaces='drive',
                fields='files(id, name)'
            ).execute()
            
            files = results.get('files', [])
            
            if not files:
                return False
            
            file_id = files[0]['id']
            
            # Delete file (move to trash)
            self.service.files().delete(fileId=file_id).execute()
            
            print(f"[ServiceAccount] Deleted file: {filename} for user {user}")
            return True
            
        except Exception as e:
            print(f"[ServiceAccount] Delete file error for user {user}: {e}")
            return False
    
    def list_files(self, user: str) -> List[Dict]:
        """List all files for specific user"""
        if not self.is_authenticated():
            return []
        
        try:
            # Get user's folder
            folder_id = self._get_user_folder_id(user)
            if not folder_id:
                return []
            
            # List files in folder
            query = f"'{folder_id}' in parents and trashed=false"
            results = self.service.files().list(
                q=query,
                spaces='drive',
                fields='files(id, name, size, createdTime, modifiedTime, mimeType)'
            ).execute()
            
            files = results.get('files', [])
            
            # Convert to our format
            file_list = []
            for file in files:
                file_list.append({
                    'id': file['id'],
                    'filename': file['name'],
                    'size': int(file.get('size', 0)),
                    'created_at': file.get('createdTime'),
                    'updated_at': file.get('modifiedTime'),
                    'mime_type': file.get('mimeType')
                })
            
            return file_list
            
        except Exception as e:
            print(f"[ServiceAccount] List files error for user {user}: {e}")
            return []
    
    def file_exists(self, user: str, filename: str) -> bool:
        """Check if file exists for specific user"""
        if not self.is_authenticated():
            return False
        
        try:
            # Get user's folder
            folder_id = self._get_user_folder_id(user)
            if not folder_id:
                return False
            
            # Search for file
            query = f"name='{filename}' and '{folder_id}' in parents and trashed=false"
            results = self.service.files().list(
                q=query,
                spaces='drive',
                fields='files(id)'
            ).execute()
            
            files = results.get('files', [])
            return len(files) > 0
            
        except Exception as e:
            print(f"[ServiceAccount] File exists check error for user {user}: {e}")
            return False 