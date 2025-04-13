import React from 'react';
import { toast } from 'react-hot-toast';
import ToggleButton from './ToggleButton';
import './NotificationPreferences.css';

const INTERVAL_OPTIONS = [
    { value: 5, label: '5 minutes' },
    { value: 10, label: '10 minutes' },
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 45, label: '45 minutes' }
];

const NotificationPreferences = ({
    notificationEnabled,
    onEnableNotifications,
    interval,
    onIntervalChange
}) => {
    const handleIntervalChange = (newInterval) => {
        if (!notificationEnabled) {
            toast.error('Please enable notifications first');
            return;
        }
        onIntervalChange(newInterval);
        toast.success(`Reminder interval set to ${newInterval} minutes`);
    };

    return (
        <div className="notification-preferences">
            <h3>Notification Preferences</h3>

            <ToggleButton
                isEnabled={notificationEnabled}
                onToggle={onEnableNotifications}
                label="Enable Reminders"
            />

            {notificationEnabled && (
                <div className="preference-section">
                    <label>Reminder Interval</label>
                    <div className="interval-options">
                        {INTERVAL_OPTIONS.map(option => (
                            <button
                                key={option.value}
                                className={`interval-button ${interval === option.value ? 'active' : ''}`}
                                onClick={() => handleIntervalChange(option.value)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationPreferences; 