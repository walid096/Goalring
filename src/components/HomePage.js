import React from "react";
import { Link } from "react-router-dom";
import "./HomePage.css";

const HomePage = () => {
    return (
        <div className="home-container">
            <header className="home-header">
                <div className="logo">
                    <h1>GOALRING</h1>
                    <p>The Anti-Distraction Goal Reminder</p>
                </div>
                <nav className="home-nav">
                    <Link to="/login" className="nav-button login-button">Log In</Link>
                    <Link to="/signup" className="nav-button signup-button">Sign Up</Link>
                </nav>
            </header>

            <main className="home-content">
                <section className="hero-section">
                    <h2>Stay Focused on What Matters</h2>
                    <p>
                        GOALRING helps you stay on track by reminding you of your goals
                        when you're most likely to get distracted.
                    </p>
                    <Link to="/signup" className="cta-button">Get Started</Link>
                </section>

                <section className="features-section">
                    <h2>How It Works</h2>

                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon">🎯</div>
                            <h3>Set Your Goals</h3>
                            <p>Add your most important goals and prioritize them.</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">⏱️</div>
                            <h3>Set Reminders</h3>
                            <p>Choose how often you want to be reminded of your goals.</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">🔔</div>
                            <h3>Get Notifications</h3>
                            <p>Receive motivational reminders when you're on social media.</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">📈</div>
                            <h3>Track Progress</h3>
                            <p>See how well you're staying focused on your goals.</p>
                        </div>
                    </div>
                </section>

                <section className="pricing-section">
                    <h2>Simple Pricing</h2>
                    <div className="pricing-card">
                        <h3>Lifetime Access</h3>
                        <div className="price">$5</div>
                        <p>One-time payment, lifetime access to all features.</p>
                        <Link to="/signup" className="pricing-button">Get Started</Link>
                    </div>
                </section>
            </main>

            <footer className="home-footer">
                <p>&copy; {new Date().getFullYear()} GOALRING. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default HomePage; 