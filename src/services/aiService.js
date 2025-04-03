import OpenAI from 'openai';

// Initialize OpenAI with environment variable
const openai = new OpenAI({
    apiKey: process.env.REACT_APP_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
});

export const generateMotivationalQuote = async (goal) => {
    try {
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