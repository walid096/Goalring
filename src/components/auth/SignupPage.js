import React, { useState } from "react";
import { signUp, signInWithGoogle } from "../../firebase";
import { Link, useNavigate } from "react-router-dom";
import "./AuthPages.css";

const SignupPage = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            return setError("Passwords do not match");
        }

        try {
            setLoading(true);
            await signUp(email, password);
            navigate('/dashboard'); // Navigate to dashboard after successful signup
        } catch (error) {
            setError(error.message);
            setLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
        try {
            setLoading(true);
            await signInWithGoogle();
            navigate('/dashboard'); // Navigate to dashboard after successful Google signup
        } catch (error) {
            setError(error.message);
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2 className="auth-title">Create Your Account</h2>
                <p className="auth-subtitle">Start achieving your goals with GOALRING</p>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="Enter your email"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Create a password"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirm-password">Confirm Password</label>
                        <input
                            id="confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            placeholder="Confirm your password"
                        />
                    </div>

                    <button
                        type="submit"
                        className="auth-button"
                        disabled={loading}
                    >
                        {loading ? "Creating Account..." : "Sign Up"}
                    </button>
                </form>

                <div className="auth-divider">
                    <span>OR</span>
                </div>

                <button
                    onClick={handleGoogleSignup}
                    className="google-button"
                    disabled={loading}
                >
                    <img src="/google-icon.png" alt="Google" className="google-icon" />
                    Sign up with Google
                </button>

                <div className="auth-footer">
                    <p>Already have an account? <Link to="/login">Log In</Link></p>
                </div>
            </div>
        </div>
    );
};

export default SignupPage;
