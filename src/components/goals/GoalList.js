import React, { useState, useEffect } from 'react';
import { auth, createGoal, getGoals, updateGoal, deleteGoal } from '../firebase';
import './GoalList.css';

const GoalList = () => {
    const [goals, setGoals] = useState([]);
    const [newGoal, setNewGoal] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        const fetchGoals = async () => {
            try {
                const userGoals = await getGoals(auth.currentUser.uid);
                setGoals(userGoals);
            } catch (err) {
                setError('Failed to fetch goals');
                console.error('Error fetching goals:', err);
            } finally {
                setLoading(false);
            }
        };

        if (auth.currentUser) {
            fetchGoals();
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newGoal.trim()) {
            setError('Please enter a goal');
            return;
        }

        try {
            const goalData = {
                text: newGoal.trim(),
                createdAt: new Date(),
                completed: false
            };

            await createGoal(auth.currentUser.uid, goalData);
            const updatedGoals = await getGoals(auth.currentUser.uid);
            setGoals(updatedGoals);
            setNewGoal('');
            setSuccessMessage('Goal added successfully! You\'ll receive reminders every 5 minutes.');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            setError('Failed to create goal');
            console.error('Error creating goal:', err);
        }
    };

    const toggleComplete = async (goalId, completed) => {
        try {
            await updateGoal(auth.currentUser.uid, goalId, { completed: !completed });
            const updatedGoals = await getGoals(auth.currentUser.uid);
            setGoals(updatedGoals);
        } catch (err) {
            setError('Failed to update goal');
            console.error('Error updating goal:', err);
        }
    };

    const handleDelete = async (goalId) => {
        try {
            await deleteGoal(auth.currentUser.uid, goalId);
            const updatedGoals = await getGoals(auth.currentUser.uid);
            setGoals(updatedGoals);
            setSuccessMessage('Goal deleted successfully');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            setError('Failed to delete goal');
            console.error('Error deleting goal:', err);
        }
    };

    if (loading) {
        return <div className="goal-list-loading">Loading your goals...</div>;
    }

    return (
        <div className="goal-list-container">
            <div className="welcome-section">
                <h2 className="goal-list-title">Welcome to GOALRING</h2>
                <p className="welcome-message">
                    Add your goals below. We'll remind you of them every 5 minutes when you're on social media,
                    helping you stay focused on what truly matters.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="goal-form">
                <div className="goal-input-group">
                    <input
                        type="text"
                        value={newGoal}
                        onChange={(e) => setNewGoal(e.target.value)}
                        placeholder="Enter a goal you want to be reminded of..."
                        className="goal-input"
                    />
                    <button type="submit" className="add-goal-button">
                        Add Goal
                    </button>
                </div>
            </form>

            {error && <div className="goal-error">{error}</div>}
            {successMessage && <div className="goal-success">{successMessage}</div>}

            <div className="goals-list">
                {goals.length === 0 ? (
                    <div className="no-goals">
                        <p>No goals yet. Add your first goal above!</p>
                        <p className="no-goals-subtitle">
                            Your goals will appear here and you'll receive reminders every 5 minutes
                            when you're on social media.
                        </p>
                    </div>
                ) : (
                    goals.map((goal) => (
                        <div
                            key={goal.id}
                            className={`goal-item ${goal.completed ? 'completed' : ''}`}
                        >
                            <div className="goal-content">
                                <input
                                    type="checkbox"
                                    checked={goal.completed}
                                    onChange={() => toggleComplete(goal.id, goal.completed)}
                                    className="goal-checkbox"
                                />
                                <div className="goal-details">
                                    <span className="goal-text">{goal.text}</span>
                                    <span className="goal-date">
                                        Added {new Date(goal.createdAt.toDate()).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDelete(goal.id)}
                                className="delete-goal-button"
                                title="Delete goal"
                            >
                                ×
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default GoalList; 