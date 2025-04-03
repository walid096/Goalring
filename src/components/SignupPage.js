import React, { useState } from "react";
import { signUp } from "../firebase";
import { Link, useNavigate } from "react-router-dom";
import "./AuthPages.css";

const SignupPage = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSignUp = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await signUp(email, password, name);
            // The redirection to dashboard is handled in the signUp function
        } catch (error) {
            setLoading(false);

            // Handle specific Firebase errors
            if (error.code === "auth/email-already-in-use") {
                setError("This email is already registered. Please log in instead.");
                // Optionally, you could pre-fill the login form with this email
                // by storing it in localStorage or using a state management solution
                localStorage.setItem("loginEmail", email);
            } else if (error.code === "auth/weak-password") {
                setError("Password is too weak. Please use a stronger password.");
            } else if (error.code === "auth/invalid-email") {
                setError("Invalid email format. Please check your email address.");
            } else {
                setError(error.message || "An error occurred during sign up.");
            }
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2 className="auth-title">Sign Up for GOALRING</h2>
                <p className="auth-subtitle">The Anti-Distraction Goal Reminder</p>

                {error && (
                    <div className="error-message">
                        {error}
                        {error.includes("already registered") && (
                            <div className="error-action">
                                <Link to="/login" className="login-link">
                                    Go to Login
                                </Link>
                            </div>
                        )}
                    </div>
                )}

                <form onSubmit={handleSignUp} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="name">Full Name</label>
                        <input
                            id="name"
                            type="text"
                            placeholder="Enter your full name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

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
                            placeholder="Create a password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="auth-button"
                        disabled={loading}
                    >
                        {loading ? "Signing up..." : "Sign Up"}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>Already have an account? <Link to="/login">Log In</Link></p>
                </div>
            </div>
        </div>
    );
};

export default SignupPage;
