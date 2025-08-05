import React, { useState, useEffect } from 'react';
import './StorageSettings.css';

function StorageSettings({ onClose }) {
    const [preferences, setPreferences] = useState({ storage: 'local' });
    const [effectiveProvider, setEffectiveProvider] = useState('local');
    const [isPreferredAvailable, setIsPreferredAvailable] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [isMigrating, setIsMigrating] = useState(false);
    const [googleDriveStatus, setGoogleDriveStatus] = useState({});
    const [authCode, setAuthCode] = useState('');
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [isGoogleUser, setIsGoogleUser] = useState(false);

    useEffect(() => {
        fetchPreferences();
        checkGoogleDriveStatus();
    }, []);

    const fetchPreferences = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/storage/preferences', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch preferences');
                    const data = await res.json();
        setPreferences({ storage: data.current_provider || 'local' });
        setEffectiveProvider(data.effective_provider || 'local');
        setIsPreferredAvailable(data.is_preferred_available || true);
        } catch (err) {
            console.error('Fetch preferences error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const checkGoogleDriveStatus = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/storage/google-drive/status', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to check Google Drive status');
            const data = await res.json();
            setGoogleDriveStatus(data);
            setIsGoogleUser(data.is_google_user || false);
            
            // Also refresh preferences to get updated effective provider
            await fetchPreferences();
        } catch (err) {
            console.error('Check Google Drive status error:', err);
        }
    };

    const handleStorageChange = async (storageType) => {
        if (storageType === 'google_drive' && !googleDriveStatus.authenticated) {
            if (isGoogleUser) {
                // For Google users, try to authenticate automatically
                try {
                    const res = await fetch('http://localhost:5000/api/storage/google-drive/auth', {
                        method: 'POST',
                        credentials: 'include'
                    });
                    if (!res.ok) throw new Error('Failed to authenticate');
                    const data = await res.json();
                    if (data.success) {
                        setPreferences({ storage: 'google_drive' });
                        // Save the preference to backend
                        await saveStoragePreference('google_drive');
                        checkGoogleDriveStatus();
                    }
                } catch (err) {
                    console.error('Google Drive auth error:', err);
                    setShowAuthModal(true);
                }
            } else {
                setShowAuthModal(true);
            }
        } else {
            setPreferences({ storage: storageType });
            // Save the preference to backend immediately for non-Google Drive switches
            await saveStoragePreference(storageType);
        }
    };

    const saveStoragePreference = async (storageType) => {
        try {
            const res = await fetch('http://localhost:5000/api/storage/preferences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ provider: storageType })
            });
            
            if (!res.ok) throw new Error('Failed to save storage preference');
            
            const data = await res.json();
            if (data.success) {
                console.log(`Storage preference saved: ${storageType}`);
            }
        } catch (err) {
            console.error('Save storage preference error:', err);
            // Revert the local state if save failed
            setPreferences({ storage: preferences.storage });
        }
    };

    const handleSavePreferences = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/storage/preferences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ provider: preferences.storage })
            });
            
            if (!res.ok) throw new Error('Failed to save preferences');
            
            const data = await res.json();
            if (data.success) {
                window.alert('Storage preferences saved successfully!');
                onClose();
            }
        } catch (err) {
            console.error('Save preferences error:', err);
            window.alert('Failed to save preferences');
        }
    };

    const handleMigrate = async () => {
        if (!window.confirm('This will migrate all your documents to the new storage. Continue?')) return;
        
        setIsMigrating(true);
        try {
            // Get current storage preference to determine from_provider
            const currentStorage = preferences.storage === 'google_drive' ? 'local' : 'google_drive';
            const targetStorage = preferences.storage;
            
            const res = await fetch('http://localhost:5000/api/storage/migrate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ 
                    from_provider: currentStorage,
                    to_provider: targetStorage 
                })
            });
            
            if (!res.ok) throw new Error('Failed to migrate');
            
            const data = await res.json();
            if (data.success) {
                window.alert('Migration completed successfully!');
            }
        } catch (err) {
            console.error('Migration error:', err);
            window.alert('Migration failed');
        } finally {
            setIsMigrating(false);
        }
    };

    const handleGoogleAuth = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/storage/google-drive/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ auth_code: authCode })
            });
            
            if (!res.ok) throw new Error('Failed to authenticate');
            
            const data = await res.json();
            if (data.success) {
                setShowAuthModal(false);
                setAuthCode('');
                checkGoogleDriveStatus();
                setPreferences({ storage: 'google_drive' });
                // Save the preference to backend
                await saveStoragePreference('google_drive');
            }
        } catch (err) {
            console.error('Google auth error:', err);
            window.alert('Authentication failed');
        }
    };

    const getAuthUrl = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/storage/google-drive/auth', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to get auth URL');
            const data = await res.json();
            if (data.auth_url) {
                window.open(data.auth_url, '_blank');
            }
        } catch (err) {
            console.error('Get auth URL error:', err);
            window.alert('Failed to get authentication URL');
        }
    };

    return (
        <div className="modal" onClick={onClose}>
            <div className="modal-content storage-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <div className="header-content">
                        <div className="header-icon">⚙️</div>
                        <div>
                            <h2>Storage Settings</h2>
                            <p>Configure where your documents are stored</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="close">✕</button>
                </div>

                {isLoading ? (
                    <div className="loading-state">
                        <div className="loading-spinner">⏳</div>
                        <p>Loading storage settings...</p>
                    </div>
                ) : (
                    <>
                        {/* Current Storage */}
                        <div className="current-storage-section">
                            <h3>Current Storage</h3>
                            <div className={`storage-card ${effectiveProvider === 'local' ? 'active' : ''}`}>
                                <div className="storage-icon">💾</div>
                                <div className="storage-info">
                                    <h4>Local Storage</h4>
                                    <p>Documents stored on your device</p>
                                </div>
                                {effectiveProvider === 'local' && <div className="active-badge">Active</div>}
                            </div>
                            
                            <div className={`storage-card ${effectiveProvider === 'google_drive' ? 'active' : ''}`}>
                                <div className="storage-icon">☁️</div>
                                <div className="storage-info">
                                    <h4>Google Drive</h4>
                                    <p>Documents stored in your Google Drive</p>
                                    {googleDriveStatus.authenticated ? (
                                        <div className="status-badge success">✅ Connected</div>
                                    ) : (
                                        <div className="status-badge error">❌ Not Connected</div>
                                    )}
                                </div>
                                {effectiveProvider === 'google_drive' && <div className="active-badge">Active</div>}
                            </div>
                        </div>

                        {/* Storage Options */}
                        <div className="storage-options-section">
                            <h3>Change Storage</h3>
                            <div className="options-grid">
                                <button 
                                    onClick={() => handleStorageChange('local')}
                                    className={`option-card ${preferences.storage === 'local' ? 'selected' : ''}`}
                                >
                                    <div className="option-icon">💾</div>
                                    <h4>Local Storage</h4>
                                    <p>Store documents on your device</p>
                                    <ul>
                                        <li>Fast access</li>
                                        <li>Works offline</li>
                                        <li>No internet required</li>
                                    </ul>
                                </button>
                                
                                <button 
                                    onClick={() => handleStorageChange('google_drive')}
                                    className={`option-card ${preferences.storage === 'google_drive' ? 'selected' : ''}`}
                                >
                                    <div className="option-icon">☁️</div>
                                    <h4>Google Drive</h4>
                                    <p>Store documents in the cloud</p>
                                    <ul>
                                        <li>Access from anywhere</li>
                                        <li>Automatic backup</li>
                                        <li>Share with others</li>
                                    </ul>
                                </button>
                            </div>
                        </div>

                        {/* Migration Section */}
                        {effectiveProvider === 'google_drive' && (
                            <div className="migration-section">
                                <h3>Migrate Documents</h3>
                                <p>Move your existing documents to the new storage location</p>
                                <button 
                                    onClick={handleMigrate}
                                    disabled={isMigrating}
                                    className="migrate-button"
                                >
                                    {isMigrating ? '⏳ Migrating...' : '🔄 Migrate Documents'}
                                </button>
                            </div>
                        )}

                        {/* Save Button */}
                        <div className="actions-section">
                            <button onClick={handleSavePreferences} className="save-button">
                                💾 Save Preferences
                            </button>
                        </div>
                    </>
                )}

                {/* Google Auth Modal */}
                {showAuthModal && (
                    <div className="auth-modal">
                        <div className="auth-content">
                            <h3>Connect Google Drive</h3>
                            <p>To use Google Drive storage, you need to authenticate with your Google account.</p>
                            
                            <div className="auth-steps">
                                <div className="auth-step">
                                    <span className="step-number">1</span>
                                    <button onClick={getAuthUrl} className="auth-button">
                                        🔗 Get Authorization URL
                                    </button>
                                </div>
                                
                                <div className="auth-step">
                                    <span className="step-number">2</span>
                                    <p>Click the link above and authorize the app</p>
                                </div>
                                
                                <div className="auth-step">
                                    <span className="step-number">3</span>
                                    <div className="code-input">
                                        <input
                                            type="text"
                                            placeholder="Paste the authorization code here"
                                            value={authCode}
                                            onChange={(e) => setAuthCode(e.target.value)}
                                            className="auth-input"
                                        />
                                        <button onClick={handleGoogleAuth} className="auth-button">
                                            🔐 Authenticate
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <button onClick={() => setShowAuthModal(false)} className="cancel-button">
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default StorageSettings; 