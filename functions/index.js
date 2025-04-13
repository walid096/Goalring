const functions = require("firebase-functions");
const fetch = require("node-fetch");
const cors = require('cors')({
    origin: true,
    methods: ['POST', 'GET', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
});
const admin = require('firebase-admin');
require("dotenv").config();

// Initialize Firebase Admin
admin.initializeApp();

// Helper function to wrap the function with CORS
const corsHandler = (handler) => {
    return (req, res) => {
        // Set CORS headers for preflight requests
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.set('Access-Control-Max-Age', '3600');

        // Handle OPTIONS request
        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return;
        }

        return cors(req, res, () => handler(req, res));
    };
};

// Callable function for getting motivational quotes
exports.getMotivationalQuote = functions.https.onCall(async (data, context) => {
    const goal = data.goal;
    const style = data.style || "deep insight";

    if (!goal || goal.trim() === "") {
        return { quote: "No goal provided. Please define your goal first." };
    }

    const API_KEY = process.env.OPENROUTER_API_KEY;

    const styles = ["Harsh Truth", "Deep Insight", "Encouragement"];
    const selectedStyle = styles[Math.floor(Math.random() * styles.length)];

    const prompt = `My goal is: "${goal}". Give me a one-sentence ${selectedStyle.toLowerCase()} that would truly motivate someone to keep working on this goal.`;

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": process.env.FRONTEND_URL || "*",
                "X-Title": "GoalRing Motivation Generator",
                "Origin": process.env.FRONTEND_URL || "*"
            },
            body: JSON.stringify({
                model: "mistral/mistral-7b-instruct",
                messages: [
                    { role: "user", content: prompt }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.status}`);
        }

        const result = await response.json();
        const aiMessage = result?.choices?.[0]?.message?.content || null;

        if (!aiMessage) {
            throw new Error("No message returned by AI");
        }

        return {
            quote: `${selectedStyle}: ${aiMessage.trim()}`
        };
    } catch (error) {
        console.error("AI Quote Error:", error);
        return {
            quote: "Harsh Truth: Time waits for no one | Motivation: Your future self is watching."
        };
    }
});

// HTTP function for sending notifications (with CORS)
exports.sendNotification = functions.https.onRequest(corsHandler(async (req, res) => {
    try {
        // Verify request method
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        // Extract data from request
        const { token, title, body, data } = req.body;

        if (!token || !title || !body) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Send notification using Firebase Admin
        const message = {
            notification: {
                title,
                body,
            },
            data: data || {},
            token,
        };

        try {
            const response = await admin.messaging().send(message);
            console.log('Successfully sent message:', response);
            res.status(200).json({ success: true, messageId: response });
        } catch (error) {
            console.error('Error sending message:', error);
            res.status(500).json({ error: 'Failed to send notification' });
        }
    } catch (error) {
        console.error('Error in notification endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
