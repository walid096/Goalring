import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { scheduleNotification, stopNotifications } from '../../services/notificationService';

const INTERVAL_OPTIONS = [
    { value: 5, label: 'Every 5 minutes' },
    { value: 10, label: 'Every 10 minutes' },
    { value: 30, label: 'Every 30 minutes' },
    { value: 60, label: 'Every hour' }
];

const NotificationControls = ({ className = '' }) => {
    const [interval, setInterval] = useState(5);
    const [enabled, setEnabled] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadNotificationSettings = async () => {
            try {
                if (!auth.currentUser) {
                    setLoading(false);
                    return;
                }

                const notificationRef = doc(db, 'notifications', auth.currentUser.uid);
                const notificationDoc = await getDoc(notificationRef);

                if (notificationDoc.exists()) {
                    const data = notificationDoc.data();
                    setInterval(data.intervalMinutes || 5);
                    setEnabled(data.isActive);
                }
            } catch (error) {
                console.error('Error loading notification settings:', error);
            } finally {
                setLoading(false);
            }
        };

        loadNotificationSettings();
    }, []);

    const toggleNotifications = async () => {
        try {
            setLoading(true);
            if (enabled) {
                await stopNotifications();
                setEnabled(false);
            } else {
                const success = await scheduleNotification(interval);
                if (success) {
                    setEnabled(true);
                }
            }
        } catch (error) {
            console.error('Error toggling notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={`p-4 bg-white rounded-lg shadow animate-pulse ${className}`}>
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-10 bg-gray-200 rounded mb-4"></div>
                <div className="h-10 bg-gray-200 rounded w-1/2"></div>
            </div>
        );
    }

    return (
        <div className={`space-y-4 p-4 bg-white rounded-lg shadow ${className}`}>
            <h3 className="text-lg font-semibold text-gray-800">Reminder Settings</h3>

            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                    Reminder Interval
                </label>
                <select
                    value={interval}
                    onChange={(e) => setInterval(parseInt(e.target.value))}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                    {INTERVAL_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="pt-4">
                <button
                    onClick={toggleNotifications}
                    disabled={loading}
                    className={`px-4 py-2 rounded-full ${enabled ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-300 hover:bg-gray-400'
                        } text-white font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {loading ? 'Loading...' : enabled ? 'Disable Reminders' : 'Enable Reminders'}
                </button>
            </div>

            <p className="text-sm text-gray-500 mt-2">
                Notifications will show a random goal with an AI-generated motivational message.
                They will persist until dismissed.
            </p>
        </div>
    );
};

export default NotificationControls; 