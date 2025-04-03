import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, updateDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';
import OpenAI from 'openai';

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.REACT_APP_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
});

// Initialize Firebase Messaging
const messaging = getMessaging();

// Generate AI motivational quote
const generateMotivationalQuote = async (goal) => {
    try {
        if (!process.env.REACT_APP_OPENAI_API_KEY) {
            console.warn('OpenAI API key not found in environment variables');
        }

        const prompt = `Create a harsh truth and deep motivational quote about this goal: "${goal.text}". 
        The quote should be direct, impactful, and encourage action. Format: "Harsh Truth: [truth] | Motivation: [motivation]"`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "You are a motivational coach who delivers harsh truths and deep motivation."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 150,
            temperature: 0.7
        });

        return completion.choices[0].message.content;
    } catch (error) {
        console.error('Error generating motivational quote:', error);
        return "Harsh Truth: Time waits for no one | Motivation: Your future self is watching.";
    }
};

// Get random active goal
const getRandomActiveGoal = async () => {
    try {
        const goalsRef = collection(db, 'users', auth.currentUser.uid, 'goals');
        const q = query(goalsRef, where('completed', '==', false));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return null;
        }

        const goals = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Get a random goal from the list
        const randomIndex = Math.floor(Math.random() * goals.length);
        return goals[randomIndex];
    } catch (error) {
        console.error('Error getting random goal:', error);
        return null;
    }
};

// Request notification permission and get token
export const requestNotificationPermission = async () => {
    try {
        console.log('Requesting notification permission...');
        const permission = await Notification.requestPermission();
        console.log('Notification permission status:', permission);

        if (permission === 'granted') {
            console.log('Permission granted, requesting FCM token...');
            const token = await getToken(messaging, {
                vapidKey: 'BOT3J9Z8_JEWV4qtTPm-uikHYRCXokT5SnztOYwXXrcXo8Nrwl1aMtVmhUmiuzhl5DaR5IOFaXOBw3Q6j7wEMbg'
            });
            console.log('FCM Token received:', token);
            return token;
        }
        throw new Error('Notification permission denied');
    } catch (error) {
        console.error('Error in requestNotificationPermission:', error);
        throw error;
    }
};

// Send notification using FCM REST API
const sendNotification = async (token, title, body, data = {}) => {
    try {
        if (!token) {
            console.warn('No FCM token available, skipping notification');
            return false;
        }

        const response = await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `key=${process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID}`
            },
            body: JSON.stringify({
                to: token,
                notification: {
                    title,
                    body,
                    icon: '/logo192.png'
                },
                data,
                webpush: {
                    headers: {
                        Urgency: 'high'
                    },
                    notification: {
                        icon: '/logo192.png',
                        badge: '/logo192.png',
                        requireInteraction: true
                    }
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('FCM API error:', errorData);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Notification sent successfully:', result);
        return true;
    } catch (error) {
        console.error('Error sending notification:', error);
        return false;
    }
};

// Schedule notification
export const scheduleNotification = async (goal, intervalMinutes = 5) => {
    try {
        const token = await requestNotificationPermission();

        if (!token) {
            console.warn('No FCM token available, skipping notification scheduling');
            return false;
        }

        // Store notification settings in Firestore
        const notificationRef = doc(db, 'notifications', `${auth.currentUser.uid}_${goal.id}`);
        await setDoc(notificationRef, {
            goalId: goal.id,
            userId: auth.currentUser.uid,
            intervalMinutes,
            lastNotification: new Date(),
            isActive: true,
            token
        });

        // Set up interval for sending notifications
        const interval = intervalMinutes * 60 * 1000; // Convert to milliseconds
        setInterval(async () => {
            try {
                // Get a random active goal
                const randomGoal = await getRandomActiveGoal();
                if (!randomGoal) {
                    console.log('No active goals found for notification');
                    return;
                }

                // Generate motivational quote for the random goal
                const quote = await generateMotivationalQuote(randomGoal);

                // Send notification with the random goal and quote
                await sendNotification(
                    token,
                    'GOALRING Reminder',
                    `${randomGoal.text}\n\n${quote}`,
                    { goalId: randomGoal.id }
                );
            } catch (error) {
                console.error('Error sending scheduled notification:', error);
            }
        }, interval);

        return true;
    } catch (error) {
        console.error('Error scheduling notification:', error);
        return false;
    }
};

// Update notification interval
export const updateNotificationInterval = async (goalId, newIntervalMinutes) => {
    try {
        const notificationRef = doc(db, 'notifications', `${auth.currentUser.uid}_${goalId}`);
        await updateDoc(notificationRef, {
            intervalMinutes: newIntervalMinutes,
            lastNotification: new Date()
        });
        return true;
    } catch (error) {
        console.error('Error updating notification interval:', error);
        throw error;
    }
}; 