import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, 
    Cloud, 
    HardDrive, 
    Settings, 
    CheckCircle, 
    AlertCircle, 
    RefreshCw,
    Key,
    Shield,
    Database,
    Link,
    Unlink
} from 'lucide-react';
import config from '../config';

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
            const apiBaseUrl = config.getApiBaseUrl();
            const res = await fetch(`${apiBaseUrl}/api/storage/preferences`, { credentials: 'include' });
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
            const apiBaseUrl = config.getApiBaseUrl();
            const res = await fetch(`${apiBaseUrl}/api/storage/google-drive/status`, { credentials: 'include' });
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

    const handleProviderChange = async (provider) => {
        if (provider === 'google_drive' && !googleDriveStatus.is_authenticated) {
            setShowAuthModal(true);
            return;
        }

        try {
            const apiBaseUrl = config.getApiBaseUrl();
            const res = await fetch(`${apiBaseUrl}/api/storage/preferences`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ provider })
            });
            
            if (!res.ok) throw new Error('Failed to update preferences');
            
            await fetchPreferences();
            await checkGoogleDriveStatus();
        } catch (err) {
            console.error('Update preferences error:', err);
            alert('Failed to update storage preferences');
        }
    };

    const handleMigration = async (targetProvider) => {
        if (!window.confirm(`Are you sure you want to migrate all data to ${targetProvider}? This may take a while.`)) {
            return;
        }

        setIsMigrating(true);
        try {
            const apiBaseUrl = config.getApiBaseUrl();
            const res = await fetch(`${apiBaseUrl}/api/storage/migrate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ target_provider: targetProvider })
            });
            
            if (!res.ok) throw new Error('Migration failed');
            
            const data = await res.json();
            alert(data.message || 'Migration completed successfully');
            await fetchPreferences();
            await checkGoogleDriveStatus();
        } catch (err) {
            console.error('Migration error:', err);
            alert('Migration failed. Please try again.');
        } finally {
            setIsMigrating(false);
        }
    };

    const handleGoogleDriveAuth = async () => {
        if (!authCode.trim()) {
            alert('Please enter the authorization code');
            return;
        }

        try {
            const apiBaseUrl = config.getApiBaseUrl();
            const res = await fetch(`${apiBaseUrl}/api/storage/google-drive/auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ code: authCode })
            });
            
            if (!res.ok) throw new Error('Authentication failed');
            
            const data = await res.json();
            alert(data.message || 'Google Drive authenticated successfully');
            setShowAuthModal(false);
            setAuthCode('');
            await checkGoogleDriveStatus();
        } catch (err) {
            console.error('Google Drive auth error:', err);
            alert('Authentication failed. Please try again.');
        }
    };

    const handleGoogleDriveDisconnect = async () => {
        if (!window.confirm('Are you sure you want to disconnect Google Drive? This will revert to local storage.')) {
            return;
        }

        try {
            const apiBaseUrl = config.getApiBaseUrl();
            const res = await fetch(`${apiBaseUrl}/api/storage/google-drive/disconnect`, {
                method: 'POST',
                credentials: 'include'
            });
            
            if (!res.ok) throw new Error('Failed to disconnect Google Drive');
            
            const data = await res.json();
            alert(data.message || 'Google Drive disconnected successfully');
            await checkGoogleDriveStatus();
            await fetchPreferences();
        } catch (err) {
            console.error('Google Drive disconnect error:', err);
            alert('Failed to disconnect Google Drive');
        }
    };

    const getAuthUrl = () => {
        const apiBaseUrl = config.getApiBaseUrl();
        return `${apiBaseUrl}/api/storage/google-drive/auth-url`;
    };

    if (isLoading) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            >
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 flex items-center gap-3">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"
                    />
                    <span className="text-gray-900 dark:text-white">Loading storage settings...</span>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-xl flex items-center justify-center">
                            <Settings className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                Storage Settings
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Configure your document storage preferences
                            </p>
                        </div>
                    </div>
                    
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </motion.button>
                </div>

                <div className="overflow-y-auto p-6 space-y-6">
                    {/* Current Status */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                        <h3 className="font-medium text-gray-900 dark:text-white mb-3">Current Status</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-2">
                                    <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        Active Provider
                                    </span>
                                </div>
                                <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1 capitalize">
                                    {effectiveProvider.replace('_', ' ')}
                                </p>
                            </div>
                            
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        Status
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    {isPreferredAvailable ? (
                                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    ) : (
                                        <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                                    )}
                                    <span className="text-sm text-gray-900 dark:text-white">
                                        {isPreferredAvailable ? 'Available' : 'Fallback Mode'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Storage Options */}
                    <div>
                        <h3 className="font-medium text-gray-900 dark:text-white mb-4">Storage Providers</h3>
                        <div className="space-y-3">
                            {/* Local Storage */}
                            <motion.div
                                whileHover={{ scale: 1.01 }}
                                className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                                    preferences.storage === 'local'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                                onClick={() => handleProviderChange('local')}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                            <HardDrive className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-gray-900 dark:text-white">Local Storage</h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                Store documents on the server
                                            </p>
                                        </div>
                                    </div>
                                    {preferences.storage === 'local' && (
                                        <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    )}
                                </div>
                            </motion.div>



                            {/* Google Drive */}
                            <motion.div
                                whileHover={{ scale: 1.01 }}
                                className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                                    preferences.storage === 'google_drive'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                                onClick={() => handleProviderChange('google_drive')}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                                            <Cloud className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-gray-900 dark:text-white">Google Drive</h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                Store documents in your Google Drive
                                            </p>
                                            {googleDriveStatus.is_authenticated && (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                                                    <span className="text-xs text-green-600 dark:text-green-400">
                                                        Authenticated
                                                    </span>
                                                </div>
                                            )}
                                            {!googleDriveStatus.credentials_available && (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                                                    <span className="text-xs text-yellow-600 dark:text-yellow-400">
                                                        Setup Required
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {preferences.storage === 'google_drive' && (
                                            <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        )}
                                        {googleDriveStatus.is_authenticated && (
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleGoogleDriveDisconnect();
                                                }}
                                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Disconnect Google Drive"
                                            >
                                                <Unlink className="w-4 h-4" />
                                            </motion.button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                        
                        {/* Google Drive Setup Info */}
                        {!googleDriveStatus.credentials_available && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-white text-xs font-bold">i</span>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-medium text-blue-800 dark:text-blue-200">
                                            Google Drive Setup Required
                                        </h4>
                                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                            To use Google Drive storage, you need to set up OAuth2 credentials. 
                                            This requires creating a Google Cloud project and enabling the Google Drive API.
                                        </p>
                                        <div className="mt-3 text-xs text-blue-600 dark:text-blue-400">
                                            <strong>Current Status:</strong> credentials.json not found
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Migration */}
                    {effectiveProvider !== preferences.storage && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                                <div className="flex-1">
                                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                                        Migration Available
                                    </h4>
                                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                                        Your preferred storage ({preferences.storage}) is not available. 
                                        Currently using {effectiveProvider}. You can migrate your data when ready.
                                    </p>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleMigration(preferences.storage)}
                                        disabled={isMigrating}
                                        className="mt-3 flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                                    >
                                        {isMigrating ? (
                                            <>
                                                <motion.div
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                </motion.div>
                                                Migrating...
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw className="w-4 h-4" />
                                                Migrate Data
                                            </>
                                        )}
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Google Drive Setup Instructions */}
                    {!googleDriveStatus.is_authenticated && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                                Google Drive Setup
                            </h4>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                                To use Google Drive storage, you need to authenticate with your Google account.
                            </p>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setShowAuthModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                                <Link className="w-4 h-4" />
                                Setup Google Drive
                            </motion.button>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Auth Modal */}
            <AnimatePresence>
                {showAuthModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-60"
                        onClick={() => setShowAuthModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Authenticate Google Drive
                                </h3>
                                <button
                                    onClick={() => setShowAuthModal(false)}
                                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                        1. Click the button below to open Google's authorization page
                                    </p>
                                    <motion.a
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        href={getAuthUrl()}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                    >
                                        <Key className="w-4 h-4" />
                                        Authorize Google Drive
                                    </motion.a>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        2. Paste the authorization code here:
                                    </label>
                                    <input
                                        type="text"
                                        value={authCode}
                                        onChange={(e) => setAuthCode(e.target.value)}
                                        placeholder="Authorization code"
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                
                                <div className="flex gap-3 pt-4">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleGoogleDriveAuth}
                                        disabled={!authCode.trim()}
                                        className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                                    >
                                        Complete Setup
                                    </motion.button>
                                    
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setShowAuthModal(false)}
                                        className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default StorageSettings;