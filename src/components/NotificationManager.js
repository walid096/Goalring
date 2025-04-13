import React, { useState, useEffect } from 'react';
import NotificationCard from './NotificationCard';
import { addNotificationListener, stopBackgroundJob } from '../services/notificationService';

const NotificationManager = () => {
    const [currentNotification, setCurrentNotification] = useState(null);

    useEffect(() => {
        // Add notification listener
        const removeListener = addNotificationListener((notification) => {
            setCurrentNotification(notification);
        });

        // Cleanup on unmount
        return () => {
            removeListener();
            // Stop notifications when component unmounts
            stopBackgroundJob();
        };
    }, []);

    const handleClose = () => {
        setCurrentNotification(null);
    };

    if (!currentNotification) {
        return null;
    }

    return (
        <NotificationCard
            goal={currentNotification.goal}
            message={currentNotification.message}
            style={currentNotification.style}
            timestamp={currentNotification.timestamp}
            onClose={handleClose}
        />
    );
};

export default NotificationManager; 