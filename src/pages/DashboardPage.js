import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, signOutUser, createGoal, getGoals, updateGoal, deleteGoal } from '../firebase';
import {
    requestNotificationPermission,
    scheduleNotification,
    updateNotificationInterval
} from '../services/notificationService';
import { cancelNotification } from '../services/notificationUtils';
import './DashboardPage.css';

const DashboardPage = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [goals, setGoals] = useState([]);
    const [newGoal, setNewGoal] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [processingGoals, setProcessingGoals] = useState(new Set());
    const [currentUserId, setCurrentUserId] = useState(null);
    const [notificationInterval, setNotificationInterval] = useState(5);
    const [notificationPermission, setNotificationPermission] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (!user) {
                console.log('No user found, redirecting to login');
                navigate('/login');
                return;
            }

            console.log('User authenticated:', user.uid);
            setCurrentUserId(user.uid);
            fetchGoals(user.uid);
            checkNotificationPermission();
        });

        return () => unsubscribe();
    }, [navigate]);

    const checkNotificationPermission = async () => {
        try {
            const permission = await Notification.requestPermission();
            setNotificationPermission(permission === 'granted');
            if (permission === 'granted') {
                await requestNotificationPermission();
            }
        } catch (error) {
            console.error('Error checking notification permission:', error);
            setError('Failed to enable notifications. Please check your browser settings.');
        }
    };

    const fetchGoals = async (userId) => {
        if (!userId) {
            console.error('No user ID provided for fetching goals');
            setError('Authentication error: User not found');
            return;
        }

        try {
            console.log('Fetching goals for user:', userId);
            const userGoals = await getGoals(userId);
            console.log('Goals fetched successfully for user:', userId, userGoals);
            setGoals(userGoals);
        } catch (err) {
            console.error('Error fetching goals for user:', userId, err);
            setError('Failed to fetch goals: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = async () => {
        try {
            await signOutUser();
            navigate('/login');
        } catch (error) {
            console.error('Error signing out:', error);
            setError('Failed to sign out. Please try again.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newGoal.trim()) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const goalData = {
                text: newGoal,
                createdAt: new Date(),
                completed: false,
                notificationEnabled: notificationPermission
            };

            const goalId = await createGoal(goalData);
            console.log('Goal created with ID:', goalId);

            // Add the new goal to the local state
            const newGoalWithId = { id: goalId, ...goalData };
            setGoals(prevGoals => [newGoalWithId, ...prevGoals]);
            setNewGoal('');
            setSuccessMessage('Goal added successfully');
            setTimeout(() => setSuccessMessage(null), 3000);

            // Schedule notification if enabled
            if (notificationPermission) {
                await scheduleNotification({ id: goalId, ...goalData }, notificationInterval);
            }
        } catch (error) {
            console.error('Error creating goal for user:', auth.currentUser.uid, error);
            setError('Failed to create goal');
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleComplete = async (goalId) => {
        try {
            console.log('Toggling completion for goal:', goalId);
            const goal = goals.find(g => g.id === goalId);
            if (!goal) {
                throw new Error('Goal not found');
            }
            await updateGoal(goalId, { completed: !goal.completed });
            setGoals(goals.map(g =>
                g.id === goalId ? { ...g, completed: !g.completed } : g
            ));
        } catch (error) {
            console.error('Error updating goal for user:', auth.currentUser.uid, 'goal:', goalId, error);
            setError('Failed to update goal status');
        }
    };

    const handleDelete = async (goalId) => {
        try {
            console.log('Deleting goal for user:', auth.currentUser.uid, 'goal:', goalId);
            setProcessingGoals(prev => new Set(prev).add(goalId));
            setError(null);

            // Try to cancel notification first, but don't fail if it fails
            if (notificationPermission) {
                try {
                    await cancelNotification(goalId);
                } catch (notificationError) {
                    console.warn('Failed to cancel notification:', notificationError);
                    // Continue with goal deletion even if notification cancellation fails
                }
            }

            // Delete the goal
            await deleteGoal(goalId);
            setGoals(goals.filter(g => g.id !== goalId));
            setSuccessMessage('Goal deleted successfully');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (error) {
            console.error('Error deleting goal for user:', auth.currentUser.uid, 'goal:', goalId, error);
            setError('Failed to delete goal');
        } finally {
            setProcessingGoals(prev => {
                const newSet = new Set(prev);
                newSet.delete(goalId);
                return newSet;
            });
        }
    };

    const handleIntervalChange = async (newInterval) => {
        try {
            setNotificationInterval(newInterval);
            // Update interval for all active goals
            for (const goal of goals) {
                if (goal.notificationEnabled) {
                    await updateNotificationInterval(goal.id, newInterval);
                }
            }
            setSuccessMessage('Reminder interval updated successfully');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (error) {
            console.error('Error updating notification interval:', error);
            setError('Failed to update reminder interval');
        }
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="loading-spinner"></div>
                <p>Loading your goals...</p>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>GOALRING</h1>
                <button onClick={handleSignOut} className="sign-out-button">
                    Sign Out
                </button>
            </header>

            <main className="dashboard-main">
                <div className="welcome-section">
                    <h2 className="goal-list-title">Welcome to GOALRING</h2>
                    <p className="welcome-message">
                        Add your goals below. We'll remind you of them every {notificationInterval} minutes when you're on social media,
                        helping you stay focused on what truly matters.
                    </p>
                </div>

                <div className="notification-settings">
                    <label htmlFor="notificationInterval">Reminder Interval (minutes):</label>
                    <div className="interval-input-group">
                        <input
                            type="number"
                            id="notificationInterval"
                            value={notificationInterval}
                            onChange={(e) => {
                                const value = Math.min(Math.max(1, parseInt(e.target.value) || 1), 60);
                                handleIntervalChange(value);
                            }}
                            min="1"
                            max="60"
                            className="interval-input"
                        />
                        <span className="interval-unit">minutes</span>
                    </div>
                    {!notificationPermission && (
                        <button
                            onClick={checkNotificationPermission}
                            className="enable-notifications-button"
                        >
                            Enable Notifications
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="goal-form">
                    <div className="goal-input-group">
                        <input
                            type="text"
                            value={newGoal}
                            onChange={(e) => setNewGoal(e.target.value)}
                            placeholder="Enter a goal you want to be reminded of..."
                            className="goal-input"
                            disabled={isSubmitting}
                            autoFocus
                        />
                        <button
                            type="submit"
                            className="add-goal-button"
                            disabled={isSubmitting || !newGoal.trim()}
                        >
                            {isSubmitting ? 'Adding...' : 'Add Goal'}
                        </button>
                    </div>
                </form>

                {error && (
                    <div className="goal-error">
                        {error}
                        <button onClick={() => setError(null)} className="dismiss-error">×</button>
                    </div>
                )}

                {successMessage && (
                    <div className="goal-success">
                        {successMessage}
                    </div>
                )}

                <div className="goals-list">
                    {goals.length === 0 ? (
                        <div className="no-goals">
                            <p>No goals yet. Add your first goal above!</p>
                            <p className="no-goals-subtitle">
                                Your goals will appear here and you'll receive reminders every {notificationInterval} minutes
                                when you're on social media.
                            </p>
                        </div>
                    ) : (
                        goals.map((goal) => (
                            <div
                                key={goal.id}
                                className={`goal-item ${goal.completed ? 'completed' : ''} ${processingGoals.has(goal.id) ? 'processing' : ''
                                    }`}
                            >
                                <div className="goal-content">
                                    <input
                                        type="checkbox"
                                        checked={goal.completed}
                                        onChange={() => toggleComplete(goal.id)}
                                        className="goal-checkbox"
                                        disabled={processingGoals.has(goal.id)}
                                    />
                                    <div className="goal-details">
                                        <span className="goal-text">{goal.text}</span>
                                        <span className="goal-date">
                                            Added {goal.createdAt?.toDate ?
                                                new Date(goal.createdAt.toDate()).toLocaleDateString() :
                                                new Date(goal.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(goal.id)}
                                    className="delete-goal-button"
                                    title="Delete goal"
                                    disabled={processingGoals.has(goal.id)}
                                >
                                    {processingGoals.has(goal.id) ? '...' : '×'}
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
};

export default DashboardPage; 