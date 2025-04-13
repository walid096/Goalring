import React from "react";
import { Link } from "react-router-dom";
import "./HomePage.css";

const HomePage = () => {
    return (
        <div className="home-container">
            <header className="home-header">
                <div className="logo">
                    <h1>GOALRING</h1>
                    <p className="tagline">The Anti-Distraction Goal Reminder</p>
                </div>
                <nav className="home-nav">
                    <Link to="/login" className="nav-button login-button">Log In</Link>
                    <Link to="/signup" className="nav-button signup-button">Get Started</Link>
                </nav>
            </header>

            <main className="home-content">
                <section className="hero-section">
                    <h1 className="hero-headline">Transform Your Goals into Reality</h1>
                    <p className="hero-subheadline">
                        Stay focused on what matters. Let GOALRING be your guide to achieving your dreams.
                    </p>
                    <div className="hero-cta">
                        <Link to="/signup" className="cta-button primary">Start Your Journey</Link>
                        <Link to="/login" className="cta-button secondary">I Already Have an Account</Link>
                    </div>
                </section>

                <section className="benefits-section">
                    <h2>Why Choose GOALRING?</h2>
                    <div className="benefits-grid">
                        <div className="benefit-card">
                            <div className="benefit-icon">🎯</div>
                            <h3>Smart Reminders</h3>
                            <p>Get reminded of your goals when you need it most</p>
                        </div>

                        <div className="benefit-card">
                            <div className="benefit-icon">✨</div>
                            <h3>AI-Powered</h3>
                            <p>Personalized motivation that adapts to your needs</p>
                        </div>

                        <div className="benefit-card">
                            <div className="benefit-icon">📈</div>
                            <h3>Track Progress</h3>
                            <p>See your growth and celebrate your wins</p>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="home-footer">
                <p>&copy; {new Date().getFullYear()} GOALRING. All rights reserved.</p>
                <div className="footer-links">
                    <Link to="/privacy">Privacy</Link>
                    <Link to="/terms">Terms</Link>
                </div>
            </footer>
        </div>
    );
};

export default HomePage; 