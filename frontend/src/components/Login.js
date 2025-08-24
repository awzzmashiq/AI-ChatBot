import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, User, Lock, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import config from '../config';

function Login({ onLoginSuccess }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [status, setStatus] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { isDark, toggleTheme } = useTheme();

    // Google Sign-In setup
    const googleClientId = "731759983780-vjgdes6rs6obm367cpmpq7fg9gi26oh7.apps.googleusercontent.com";

    useEffect(() => {
        // Initialize Google Sign-In when script is loaded
        if (window.google && googleClientId) {
            window.google.accounts.id.initialize({
                client_id: googleClientId,
                callback: handleGoogleResponse
            });
            window.google.accounts.id.renderButton(
                document.getElementById('googleSignInDiv'),
                { 
                    theme: isDark ? 'filled_black' : 'outline', 
                    size: 'large', 
                    text: 'signin_with', 
                    width: '100%' 
                }
            );
        }
    }, [googleClientId, isDark]);

    function handleGoogleResponse(response) {
        const token = response.credential;
        if (token) {
            setIsLoading(true);
            const apiBaseUrl = config.getApiBaseUrl();
            fetch(`${apiBaseUrl}/api/google-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ credential: token })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setTimeout(() => {
                            fetch(`${apiBaseUrl}/api/check`, { credentials: 'include' })
                                .then(res => res.json())
                                .then(check => {
                                    console.log("Session confirmed after Google login:", check);
                                    if (check.loggedIn) {
                                        onLoginSuccess(data.user);
                                    } else {
                                        setStatus('Session not ready yet. Please try again.');
                                        setIsLoading(false);
                                    }
                                });
                        }, 300);
                    } else {
                        setStatus(data.message || 'Google sign-in failed');
                        setIsLoading(false);
                    }
                })
                .catch(err => {
                    console.error('Google login error:', err);
                    setStatus('Google sign-in failed');
                    setIsLoading(false);
                });
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username || !password) {
            setStatus('Please enter username and password');
            return;
        }
        
        setIsLoading(true);
        const apiBaseUrl = config.getApiBaseUrl();
        const endpoint = isSignUp ? `${apiBaseUrl}/api/signup` : `${apiBaseUrl}/api/login`;
        
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });
            
            const data = await res.json();
            
            if (data.success) {
                onLoginSuccess(data.user);
            } else {
                setStatus(data.message || 'Login failed');
                setIsLoading(false);
            }
        } catch (err) {
            console.error('Login error:', err);
            setStatus('Login failed');
            setIsLoading(false);
        }
    };

    const toggleMode = () => {
        setIsSignUp(!isSignUp);
        setStatus('');
        setPassword('');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-black dark:to-gray-900 flex items-center justify-center p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-32 w-80 h-80 bg-purple-300 dark:bg-purple-900/20 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-xl opacity-70 animate-pulse-gentle"></div>
                <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-blue-300 dark:bg-blue-900/20 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-xl opacity-70 animate-pulse-gentle" style={{ animationDelay: '1s' }}></div>
            </div>

            {/* Theme toggle */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleTheme}
                className="absolute top-4 right-4 p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-lg"
                title="Toggle theme"
            >
                {isDark ? '☀️' : '🌙'}
            </motion.button>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative w-full max-w-md"
            >
                {/* Main login card */}
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-2xl">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
                        >
                            <Sparkles className="w-8 h-8 text-white" />
                        </motion.div>
                        
                        <motion.h1
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3, duration: 0.5 }}
                            className="text-3xl font-bold text-gray-900 dark:text-white mb-2"
                        >
                            Welcome to ValiNul
                        </motion.h1>
                        
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4, duration: 0.5 }}
                            className="text-gray-600 dark:text-gray-400"
                        >
                            {isSignUp ? 'Create your account to get started' : 'Sign in to continue your conversations'}
                        </motion.p>
                    </div>

                    {/* Error message */}
                    {status && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm"
                        >
                            {status}
                        </motion.div>
                    )}

                    {/* Login form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Username field */}
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <User className="w-5 h-5" />
                            </div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="Username"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        {/* Password field */}
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <Lock className="w-5 h-5" />
                            </div>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-11 pr-11 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="Password"
                                required
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                disabled={isLoading}
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>

                        {/* Submit button */}
                        <motion.button
                            whileHover={!isLoading ? { scale: 1.02 } : {}}
                            whileTap={!isLoading ? { scale: 0.98 } : {}}
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                                    />
                                    <span>Signing {isSignUp ? 'up' : 'in'}...</span>
                                </div>
                            ) : (
                                isSignUp ? 'Create Account' : 'Sign In'
                            )}
                        </motion.button>
                    </form>

                    {/* Divider */}
                    <div className="my-6 relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                                Or continue with
                            </span>
                        </div>
                    </div>

                    {/* Google Sign-In */}
                    <div className="mb-6">
                        <div id="googleSignInDiv" className="w-full"></div>
                    </div>

                    {/* Toggle mode */}
                    <div className="text-center">
                        <button
                            onClick={toggleMode}
                            disabled={isLoading}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    className="text-center mt-8 text-sm text-gray-500 dark:text-gray-400"
                >
                    <p>Powered by AI • Secure • Private</p>
                </motion.div>
            </motion.div>
        </div>
    );
}

export default Login;