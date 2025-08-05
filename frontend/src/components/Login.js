import React, { useState, useEffect } from 'react';
import './Login.css';

function Login({ onLoginSuccess }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [status, setStatus] = useState('');

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
                { theme: 'outline', size: 'large', text: 'signin_with', width: '100%' }
            );
        }
    }, [googleClientId]);

    function handleGoogleResponse(response) {
        const token = response.credential;
        if (token) {
            fetch('http://localhost:5000/api/google-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ credential: token })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setTimeout(() => {
                            fetch('http://localhost:5000/api/check', { credentials: 'include' })
                                .then(res => res.json())
                                .then(check => {
                                    console.log("Session confirmed after Google login:", check);
                                    if (check.loggedIn) {
                                        onLoginSuccess(data.user);
                                    } else {
                                        setStatus('Session not ready yet. Please try again.');
                                    }
                                });
                        }, 300);
                    } else {
                        setStatus(data.message || 'Google sign-in failed');
                    }
                })
                .catch(err => {
                    console.error('Google login error:', err);
                    setStatus('Google sign-in failed');
                });
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username || !password) {
            setStatus('Please enter username and password');
            return;
        }
        
        const endpoint = isSignUp ? 'http://localhost:5000/api/signup' : 'http://localhost:5000/api/login';
        
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
            }
        } catch (err) {
            console.error('Login error:', err);
            setStatus('Login failed');
        }
    };

    const toggleMode = () => {
        setIsSignUp(!isSignUp);
        setStatus('');
        setPassword('');
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1>Doc Smart</h1>
                <h2>{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
                
                {status && <div className="error-message">{status}</div>}
                
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="input-field"
                        placeholder="Username"
                        required
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input-field"
                        placeholder="Password"
                        required
                    />
                    <button type="submit" className="btn btn-primary">
                        {isSignUp ? 'Sign Up' : 'Sign In'}
                    </button>
                </form>
                
                <div className="divider">
                    <span>Or continue with</span>
                </div>
                
                <div id="googleSignInDiv"></div>
                
                <button onClick={toggleMode} className="toggle-mode">
                    {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </button>
            </div>
        </div>
    );
}

export default Login;
