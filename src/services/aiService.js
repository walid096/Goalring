import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

const FALLBACK_MESSAGES = {
    deep: [
        "Every minute you spend distracted is a minute stolen from your future success.",
        "Your potential is being wasted with every moment of procrastination.",
        "The gap between where you are and where you want to be is filled with the time you're wasting right now.",
        "Your future self is watching, and they're disappointed with your current choices.",
        "The only thing standing between you and your goal is your willingness to act."
    ],
    harsh: [
        "Stop lying to yourself. You're not 'taking a break'—you're avoiding your responsibilities.",
        "Your competitors aren't scrolling through social media. They're working while you're wasting time.",
        "Every notification you check is another step away from your goal. Is it worth it?",
        "Your future is being traded for temporary entertainment. Is that the deal you want?",
        "The world doesn't care about your excuses. It only rewards results."
    ],
    encouraging: [
        "You have the power to change your life right now. What's your next move?",
        "Your future success is built on the decisions you make in moments like this.",
        "The best time to start was yesterday. The second best time is right now.",
        "You're capable of more than you think. Prove it to yourself.",
        "Your goal is waiting. Are you going to keep it waiting?"
    ]
};

const STYLES = ['deep', 'harsh', 'encouraging'];

// Function to validate goal text
const validateGoal = (goal) => {
    if (!goal || typeof goal !== 'object') {
        throw new Error('Invalid goal object provided');
    }

    if (!goal.text || typeof goal.text !== 'string' || goal.text.trim() === '') {
        throw new Error('Goal text is required and must be a non-empty string');
    }

    return goal.text.trim();
};

// Function to validate style
const validateStyle = (style) => {
    const normalizedStyle = style?.toLowerCase() || 'deep';
    if (!STYLES.includes(normalizedStyle)) {
        console.warn(`Invalid style "${style}" provided, defaulting to "deep"`);
        return 'deep';
    }
    return normalizedStyle;
};

// Function to handle API errors
const handleApiError = (error) => {
    console.error('AI Service Error:', error);

    if (error.code === 'rate-limit-exceeded') {
        throw new Error('Rate limit exceeded. Please try again later.');
    }

    if (error.code === 'network-error') {
        throw new Error('Network error. Please check your connection and try again.');
    }

    throw new Error('Failed to generate motivational message. Please try again.');
};

// Main function to generate motivational quotes using Firebase callable functions
export const generateMotivationalQuote = async (goal, style = 'deep') => {
    try {
        const validatedGoal = validateGoal(goal);
        const validatedStyle = validateStyle(style);

        // Call Firebase function to get motivational quote from AI
        const getMotivationalQuote = httpsCallable(functions, 'getMotivationalQuote');

        // Pass goal text and style to the Firebase function
        const result = await getMotivationalQuote({
            goal: validatedGoal,
            style: validatedStyle
        });

        if (!result.data || !result.data.quote) {
            throw new Error('Invalid response from AI service');
        }

        return result.data.quote;
    } catch (error) {
        handleApiError(error);
    }
};

// Function to get AI message for a goal with a specific style
export const getAIMessageForGoal = async (goalText, style = 'deep') => {
    try {
        if (!goalText || typeof goalText !== 'string' || goalText.trim() === '') {
            throw new Error('Goal text is required and must be a non-empty string');
        }

        const validatedStyle = validateStyle(style);

        // First try to get message from Cloud Function
        const getMotivationalQuote = httpsCallable(functions, 'getMotivationalQuote');
        const result = await getMotivationalQuote({
            goal: goalText.trim(),
            style: validatedStyle,
            prompt: `Generate a ${validatedStyle} motivational message about "${goalText}". 
                    The message should:
                    1. Directly address the specific goal
                    2. Create a sense of urgency
                    3. Evoke guilt about time-wasting
                    4. Use strong, persuasive language
                    5. Push the user to take immediate action
                    Make it personal and impactful.`
        });

        if (!result.data || !result.data.quote) {
            throw new Error('No quote received from AI service');
        }

        return result.data.quote;
    } catch (error) {
        console.warn('Error getting AI message, using fallback:', error);

        // Get fallback messages for the style
        const messages = FALLBACK_MESSAGES[validateStyle(style)];

        // Return a random message from the appropriate category
        return messages[Math.floor(Math.random() * messages.length)];
    }
};

// Function to get a random style
export const getRandomStyle = () => {
    return STYLES[Math.floor(Math.random() * STYLES.length)];
};
