import React, { useState, useEffect } from "react";
import { signIn, signInWithGoogle, signInWithAnonymous } from "../firebase";
import { Link } from "react-router-dom";
import "./AuthPages.css";

const LoginPage = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const MAX_RETRIES = 3;

    // Check for stored email from signup page
    useEffect(() => {
        const storedEmail = localStorage.getItem("loginEmail");
        if (storedEmail) {
            setEmail(storedEmail);
            // Clear the stored email after using it
            localStorage.removeItem("loginEmail");
        }
    }, []);

    // Add network status listener
    useEffect(() => {
        const handleOnline = () => {
            setError("");
        };

        const handleOffline = () => {
            setError("No internet connection. Please check your network and try again.");
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            // Check network status before attempting login
            if (!navigator.onLine) {
                throw new Error("No internet connection. Please check your network and try again.");
            }

            await signIn(email, password);
            // The redirection to dashboard is handled in the signIn function
        } catch (error) {
            setLoading(false);
            setError(error.message);

            // If it's a network error and we haven't exceeded max retries, allow retry
            if (error.message.includes("network") && retryCount < MAX_RETRIES) {
                setRetryCount(prev => prev + 1);
            }
        }
    };

    const handleGoogleLogin = async () => {
        setError("");
        setLoading(true);

        try {
            if (!navigator.onLine) {
                throw new Error("No internet connection. Please check your network and try again.");
            }
            await signInWithGoogle();
            // The redirection to dashboard is handled in the signInWithGoogle function
        } catch (error) {
            setLoading(false);
            setError(error.message || "An error occurred during Google login.");
        }
    };

    const handleAnonymousLogin = async () => {
        setError("");
        setLoading(true);

        try {
            if (!navigator.onLine) {
                throw new Error("No internet connection. Please check your network and try again.");
            }
            await signInWithAnonymous();
            // The redirection to dashboard is handled in the signInWithAnonymous function
        } catch (error) {
            setLoading(false);
            setError(error.message || "An error occurred during anonymous login.");
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2 className="auth-title">Welcome to GOALRING</h2>
                <p className="auth-subtitle">Log in to manage your goals</p>

                {error && (
                    <div className="error-message">
                        {error}
                        {error.includes("network") && retryCount < MAX_RETRIES && (
                            <button
                                onClick={handleLogin}
                                className="retry-button"
                                disabled={loading}
                            >
                                Retry Login
                            </button>
                        )}
                    </div>
                )}

                <form onSubmit={handleLogin} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="auth-button"
                        disabled={loading || !navigator.onLine}
                    >
                        {loading ? "Logging in..." : "Log In"}
                    </button>
                </form>

                <div className="auth-divider">
                    <span>OR</span>
                </div>

                <div className="social-login">
                    <button
                        onClick={handleGoogleLogin}
                        className="google-button"
                        disabled={loading || !navigator.onLine}
                    >
                        <img src="/google-icon.png" alt="Google" className="google-icon" />
                        Continue with Google
                    </button>

                    <button
                        onClick={handleAnonymousLogin}
                        className="anonymous-button"
                        disabled={loading || !navigator.onLine}
                    >
                        Continue as Guest
                    </button>
                </div>

                <div className="auth-footer">
                    <p>Don't have an account? <Link to="/signup">Sign Up</Link></p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;