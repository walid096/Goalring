import { getMessaging, getToken } from 'firebase/messaging';
import { doc, setDoc, updateDoc, getDocs, collection, query, where, getDoc, limit } from 'firebase/firestore';
import { auth, db, functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import { getAIMessageForGoal, getRandomStyle } from './aiService';

// Initialize Firebase Messaging
const messaging = getMessaging();

// Get VAPID key from environment variables
const vapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY;

const MAX_RETRIES = 3;

// Determine if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Track notification state with all necessary fields
let notificationState = {
    timeoutId: null,
    lastNotificationTime: null,
    isActive: false,
    userId: null,
    intervalMinutes: 5, // Default interval
    currentNotification: null,
    notificationListeners: new Set()
};

// Background job state
let backgroundJobState = {
    intervalId: null,
    isRunning: false,
    lastExecutionTime: null
};

// Function to reset notification state
const resetNotificationState = () => {
    if (notificationState.timeoutId) {
        clearTimeout(notificationState.timeoutId);
    }
    const currentInterval = notificationState.intervalMinutes; // Preserve the current interval
    notificationState = {
        timeoutId: null,
        lastNotificationTime: null,
        isActive: false,
        userId: null,
        intervalMinutes: currentInterval, // Keep the user's selected interval
        currentNotification: null,
        notificationListeners: new Set()
    };
};

// Function to reset background job state
const resetBackgroundJobState = () => {
    if (backgroundJobState.intervalId) {
        clearInterval(backgroundJobState.intervalId);
    }
    backgroundJobState = {
        intervalId: null,
        isRunning: false,
        lastExecutionTime: null
    };
};

// Get the appropriate functions URL
const getFunctionsUrl = () => {
    if (isDevelopment) {
        // Try local emulator first, fallback to production if not available
        return 'http://localhost:5001/goalring-5ceca/us-central1/sendNotification';
    }
    return 'https://us-central1-goalring-5ceca.cloudfunctions.net/sendNotification';
};

// Ensure notifications collection exists
const ensureNotificationsCollection = async () => {
    try {
        const notificationsRef = collection(db, 'notifications');
        const q = query(notificationsRef, limit(1));
        await getDocs(q);
        return true;
    } catch (error) {
        console.error('Error checking notifications collection:', error);
        return false;
    }
};

// Generate AI motivational quote using Firebase Function
const generateMotivationalQuote = async (goal, style = 'deep') => {
    try {
        const getMotivationalQuote = httpsCallable(functions, 'getMotivationalQuote');
        const result = await getMotivationalQuote({
            goal: goal.text,
            style: style
        });
        return result.data.quote;
    } catch (error) {
        console.error('Error generating motivational quote:', error);
        return `${style.charAt(0).toUpperCase() + style.slice(1)}: Stay focused on your goals.`;
    }
};

// Get random active goal
export const getRandomActiveGoal = async () => {
    try {
        const goalsRef = collection(db, 'users', auth.currentUser.uid, 'goals');
        const q = query(goalsRef, where("completed", "==", false));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return null;
        }

        const goals = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return goals[Math.floor(Math.random() * goals.length)];
    } catch (error) {
        console.error('Error getting random goal:', error);
        return null;
    }
};

// Request notification permission and get token
export const requestNotificationPermission = async () => {
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            try {
                const token = await getToken(messaging, { vapidKey });
                return token;
            } catch (error) {
                console.log('Failed to get FCM token, falling back to browser notifications:', error);
                return null;
            }
        }
        return null;
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        return null;
    }
};

// Send notification
const sendNotification = async (token, title, body, data = {}) => {
    try {
        if (!token || !notificationState.isActive) {
            console.log('Notifications are disabled or no token available');
            return false;
        }

        // Check if enough time has passed since last notification
        const now = new Date().getTime();
        if (notificationState.lastNotificationTime) {
            const timeSinceLastNotification = (now - notificationState.lastNotificationTime) / (1000 * 60); // in minutes
            const remainingMinutes = Math.max(0, notificationState.intervalMinutes - timeSinceLastNotification);

            if (remainingMinutes > 0) {
                const minutes = Math.floor(remainingMinutes);
                const seconds = Math.floor((remainingMinutes - minutes) * 60);
                console.log(`Waiting: Next notification in ${minutes} minutes and ${seconds} seconds`);
                return false;
            }
        }

        if (Notification.permission === 'granted') {
            // Create and show the notification
            new Notification(title, {
                body,
                icon: '/logo192.png',
                ...data,
                requireInteraction: true,
                tag: 'goalring-notification-' + Date.now() // Ensure unique notifications
            });

            // Update last notification time
            notificationState.lastNotificationTime = now;

            // Schedule next notification
            const nextNotificationTime = new Date(now + (notificationState.intervalMinutes * 60 * 1000));
            console.log(`✓ Notification sent! Next notification at: ${nextNotificationTime.toLocaleTimeString()}`);

            return true;
        }
        return false;
    } catch (error) {
        console.error('Error sending notification:', error);
        return false;
    }
};

// Function to schedule the next notification
const scheduleNextNotification = async () => {
    try {
        if (!notificationState.isActive) {
            console.log('Notifications are disabled, stopping schedule');
            return;
        }

        // Clear any existing timeout
        if (notificationState.timeoutId) {
            clearTimeout(notificationState.timeoutId);
            notificationState.timeoutId = null;
        }

        // Get a random active goal
        const randomGoal = await getRandomActiveGoal();
        if (!randomGoal) {
            console.log('No active goals found for notification');
            return;
        }

        // Get a random style for the message
        const style = getRandomStyle();

        // Get motivational message with the chosen style
        const message = await getAIMessageForGoal(randomGoal.text, style);

        // Create notification object
        const notification = {
            goal: randomGoal.text,
            message,
            style,
            timestamp: new Date(),
            id: Date.now(),
            goalId: randomGoal.id
        };

        // Store current notification
        notificationState.currentNotification = notification;

        // Notify all listeners (UI components)
        notifyListeners(notification);

        // Send system notification
        const notificationSent = await sendNotification(
            notificationState.token,
            'GOALRING Motivation',
            `${randomGoal.text}\n\n${message}`,
            {
                goalId: randomGoal.id,
                style: style
            }
        );

        if (notificationSent) {
            // Update Firestore
            const notificationRef = doc(db, 'notifications', auth.currentUser.uid);
            await updateDoc(notificationRef, {
                lastNotification: new Date(),
                isActive: true,
                currentNotification: notification,
                intervalMinutes: notificationState.intervalMinutes
            });

            // Schedule next notification with precise timing
            const interval = notificationState.intervalMinutes * 60 * 1000;
            notificationState.timeoutId = setTimeout(scheduleNextNotification, interval);

            console.log(`Notification scheduled successfully. Interval: ${notificationState.intervalMinutes} minutes`);
        }

    } catch (error) {
        console.error('Error in scheduleNextNotification:', error);
        stopNotifications();
    }
};

// Start notifications
export const startNotifications = async (intervalMinutes = 5) => {
    try {
        // Stop any existing notifications first
        await stopNotifications();

        // Request notification permission
        const token = await requestNotificationPermission();
        if (!token) {
            console.warn('No notification permission granted');
            return false;
        }

        // Update notification state with user's selected interval and token
        notificationState = {
            ...notificationState,
            isActive: true,
            userId: auth.currentUser.uid,
            intervalMinutes,
            token,
            timeoutId: null,
            lastNotificationTime: null // Reset last notification time to ensure first notification
        };

        // Store notification settings in Firestore
        const notificationRef = doc(db, 'notifications', auth.currentUser.uid);
        await setDoc(notificationRef, {
            userId: auth.currentUser.uid,
            intervalMinutes,
            lastNotification: null, // Reset last notification time
            isActive: true,
            token,
            updatedAt: new Date()
        }, { merge: true });

        // Start notifications immediately
        await scheduleNextNotification();

        console.log(`Notifications started: Will notify every ${intervalMinutes} minutes`);
        return true;
    } catch (error) {
        console.error('Error starting notifications:', error);
        await stopNotifications();
        return false;
    }
};

// Stop notifications
export const stopNotifications = async () => {
    try {
        if (notificationState.timeoutId) {
            clearTimeout(notificationState.timeoutId);
        }
        resetNotificationState();

        if (auth.currentUser) {
            const notificationRef = doc(db, 'notifications', auth.currentUser.uid);
            await updateDoc(notificationRef, {
                isActive: false,
                updatedAt: new Date()
            });
        }

        console.log('Notifications stopped');
        return true;
    } catch (error) {
        console.error('Error stopping notifications:', error);
        return false;
    }
};

// Update notification interval
export const updateNotificationInterval = async (newIntervalMinutes) => {
    try {
        if (!notificationState.isActive) {
            console.warn('Notifications are not active');
            return false;
        }

        // Clear existing timeout
        if (notificationState.timeoutId) {
            clearTimeout(notificationState.timeoutId);
        }

        // Update interval in state
        notificationState.intervalMinutes = newIntervalMinutes;

        // Update Firestore
        const notificationRef = doc(db, 'notifications', auth.currentUser.uid);
        await updateDoc(notificationRef, {
            intervalMinutes: newIntervalMinutes,
            updatedAt: new Date()
        });

        // Schedule next notification with new interval
        notificationState.timeoutId = setTimeout(
            scheduleNextNotification,
            newIntervalMinutes * 60 * 1000
        );

        console.log(`Notification interval updated to ${newIntervalMinutes} minutes`);
        return true;
    } catch (error) {
        console.error('Error updating notification interval:', error);
        return false;
    }
};

// Test function for notification service
export const testNotificationService = async () => {
    try {
        console.log('Starting notification service test...');

        // 1. Check if notifications are supported
        if (!('Notification' in window)) {
            console.error('This browser does not support notifications');
            return false;
        }

        // 2. Check current permission status
        if (Notification.permission === 'denied') {
            console.error('Notification permission denied by user');
            return false;
        }

        // 3. Request permission if not already granted
        if (Notification.permission !== 'granted') {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                console.error('Notification permission not granted');
                return false;
            }
        }

        // 4. Get FCM token
        console.log('Testing notification permission...');
        const token = await requestNotificationPermission();
        if (!token) {
            console.error('Failed to get notification token');
            return false;
        }
        console.log('Notification token received');

        // 5. Update notification state
        notificationState.token = token;
        notificationState.isActive = true;

        // 6. Test sending a notification
        console.log('Sending test notification...');
        const testNotification = new Notification('GOALRING Test', {
            body: 'This is a test notification from GOALRING!',
            icon: '/logo192.png',
            requireInteraction: true,
            tag: 'test-notification'
        });

        // 7. Update Firestore with test status
        if (auth.currentUser) {
            const notificationRef = doc(db, 'notifications', auth.currentUser.uid);
            await updateDoc(notificationRef, {
                lastTestNotification: new Date(),
                testStatus: 'success',
                token: token
            });
        }

        console.log('Notification test completed successfully!');
        return true;
    } catch (error) {
        console.error('Notification test failed with error:', error);

        // Update Firestore with error status
        if (auth.currentUser) {
            try {
                const notificationRef = doc(db, 'notifications', auth.currentUser.uid);
                await updateDoc(notificationRef, {
                    lastTestNotification: new Date(),
                    testStatus: 'failed',
                    testError: error.message
                });
            } catch (dbError) {
                console.error('Failed to update test status in database:', dbError);
            }
        }

        return false;
    }
};

// Initialize WebSocket connection
const initializeWebSocket = () => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = process.env.REACT_APP_WS_HOST || window.location.hostname;
    const wsPort = process.env.REACT_APP_WS_PORT || window.location.port || '3000';
    const wsUrl = `${wsProtocol}//${wsHost}:${wsPort}/ws`;

    let ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('WebSocket connection established');
    };

    ws.onerror = (error) => {
        console.warn('WebSocket connection error:', error);
        // Fallback to polling if WebSocket fails
        initializePolling();
    };

    ws.onclose = () => {
        console.log('WebSocket connection closed');
        // Try to reconnect after a delay
        setTimeout(() => {
            console.log('Attempting to reconnect WebSocket...');
            initializeWebSocket();
        }, 5000);
    };

    return ws;
};

const initializePolling = () => {
    console.log('Falling back to polling mechanism');
    // Implement polling logic here if needed
};

// Function to execute the background job
const executeBackgroundJob = async () => {
    try {
        if (!backgroundJobState.isRunning) {
            return;
        }

        const now = new Date();
        if (backgroundJobState.lastExecutionTime) {
            const timeSinceLastExecution = (now - backgroundJobState.lastExecutionTime) / (1000 * 60);
            if (timeSinceLastExecution < notificationState.intervalMinutes) {
                console.log(`Waiting ${notificationState.intervalMinutes - timeSinceLastExecution} more minutes before next execution`);
                return;
            }
        }

        // Get a random active goal
        const randomGoal = await getRandomActiveGoal();
        if (!randomGoal) {
            console.log('No active goals found for notification');
            return;
        }

        // Get a random style for the message
        const style = getRandomStyle();

        // Get motivational message with the chosen style
        const message = await getAIMessageForGoal(randomGoal.text, style);

        // Create notification object
        const notification = {
            goal: randomGoal.text,
            message,
            style,
            timestamp: now,
            id: Date.now(),
            goalId: randomGoal.id,
            goalProgress: randomGoal.progress || 0
        };

        // Store current notification
        notificationState.currentNotification = notification;

        // Notify all listeners (UI components)
        notifyListeners(notification);

        // Send system notification
        if (Notification.permission === 'granted') {
            new Notification('GOALRING: Time to Focus', {
                body: `${randomGoal.text}\n\n${message}`,
                icon: '/logo192.png',
                requireInteraction: true,
                data: {
                    goalId: randomGoal.id,
                    style: style,
                    progress: randomGoal.progress || 0
                },
                badge: '/logo192.png',
                vibrate: [200, 100, 200],
                tag: `goal-${randomGoal.id}`
            });
        }

        // Update last execution time
        backgroundJobState.lastExecutionTime = now;

        // Update Firestore
        const notificationRef = doc(db, 'notifications', auth.currentUser.uid);
        await updateDoc(notificationRef, {
            lastNotification: now,
            isActive: true,
            currentNotification: notification,
            lastGoalId: randomGoal.id,
            lastGoalProgress: randomGoal.progress || 0
        });

    } catch (error) {
        console.error('Error in background job execution:', error);
        stopBackgroundJob();
    }
};

// Start background job
export const startBackgroundJob = async (intervalMinutes = 5) => {
    try {
        // Stop any existing background job
        await stopBackgroundJob();

        // Request notification permission
        const token = await requestNotificationPermission();
        if (!token) {
            console.warn('No notification permission granted');
            return false;
        }

        // Update background job state
        backgroundJobState.isRunning = true;
        notificationState.token = token;
        notificationState.intervalMinutes = intervalMinutes;

        // Store notification settings in Firestore
        const notificationRef = doc(db, 'notifications', auth.currentUser.uid);
        await setDoc(notificationRef, {
            userId: auth.currentUser.uid,
            intervalMinutes,
            lastNotification: new Date(),
            isActive: true,
            token,
            updatedAt: new Date()
        }, { merge: true });

        // Start the background job
        backgroundJobState.intervalId = setInterval(
            executeBackgroundJob,
            intervalMinutes * 60 * 1000
        );

        // Execute immediately for the first time
        await executeBackgroundJob();

        console.log(`Background job started with interval of ${intervalMinutes} minutes`);
        return true;
    } catch (error) {
        console.error('Error starting background job:', error);
        await stopBackgroundJob();
        return false;
    }
};

// Stop background job
export const stopBackgroundJob = async () => {
    try {
        resetBackgroundJobState();

        if (auth.currentUser) {
            const notificationRef = doc(db, 'notifications', auth.currentUser.uid);
            await updateDoc(notificationRef, {
                isActive: false,
                updatedAt: new Date()
            });
        }

        console.log('Background job stopped');
        return true;
    } catch (error) {
        console.error('Error stopping background job:', error);
        return false;
    }
};

// Update background job interval
export const updateBackgroundJobInterval = async (newIntervalMinutes) => {
    try {
        if (!backgroundJobState.isRunning) {
            console.warn('Background job is not running');
            return false;
        }

        // Stop current job
        await stopBackgroundJob();

        // Start with new interval
        return await startBackgroundJob(newIntervalMinutes);
    } catch (error) {
        console.error('Error updating background job interval:', error);
        return false;
    }
};

// Function to notify all listeners
const notifyListeners = (notification) => {
    notificationState.notificationListeners.forEach(listener => {
        listener(notification);
    });
};

// Function to add a notification listener
export const addNotificationListener = (listener) => {
    notificationState.notificationListeners.add(listener);
    return () => notificationState.notificationListeners.delete(listener);
};

// Schedule notification for a specific goal
export const scheduleNotification = async (goal, intervalMinutes = 5, style = 'motivational') => {
    try {
        if (!notificationState.isActive) {
            console.warn('Notifications are not active');
            return false;
        }

        // Create notification object
        const notification = {
            goal: goal.text,
            goalId: goal.id,
            style,
            timestamp: new Date(),
            id: Date.now()
        };

        // Get motivational message with the chosen style
        const message = await getAIMessageForGoal(goal.text, style);
        notification.message = message;

        // Send notification
        const notificationSent = await sendNotification(
            notificationState.token,
            'GOALRING Motivation',
            `${goal.text}\n\n${message}`,
            {
                goalId: goal.id,
                style: style
            }
        );

        if (notificationSent) {
            // Update Firestore
            const notificationRef = doc(db, 'notifications', auth.currentUser.uid);
            await updateDoc(notificationRef, {
                [`goals.${goal.id}`]: {
                    lastNotification: new Date(),
                    intervalMinutes,
                    style,
                    isActive: true
                }
            });

            console.log(`Notification scheduled for goal: ${goal.text}`);
            return true;
        }

        return false;
    } catch (error) {
        console.error('Error scheduling notification:', error);
        return false;
    }
};

// Export additional functions that might be needed
export {
    sendNotification,
    notifyListeners,
    resetNotificationState,
    resetBackgroundJobState
}; 