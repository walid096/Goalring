import React from 'react';
import './ToggleButton.css';

const ToggleButton = ({ isEnabled, onToggle, label }) => {
    return (
        <div className="toggle-container">
            <label className="toggle-label">{label}</label>
            <button
                className={`toggle-button ${isEnabled ? 'enabled' : 'disabled'}`}
                onClick={onToggle}
                aria-label={`${label} ${isEnabled ? 'enabled' : 'disabled'}`}
            >
                <span className="toggle-slider" />
            </button>
        </div>
    );
};

export default ToggleButton;



