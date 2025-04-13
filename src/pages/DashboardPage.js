import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, signOutUser, createGoal, getGoals, updateGoal, deleteGoal } from '../firebase';
import {
    requestNotificationPermission,
    startNotifications,
    stopNotifications,
    updateNotificationInterval,
    testNotificationService,
    scheduleNotification
} from '../services/notificationService';
import { cancelNotification } from '../services/notificationUtils';
import NotificationPreferences from '../components/common/NotificationPreferences';
import './DashboardPage.css';
import { toast } from 'react-hot-toast';

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
    const [isLoading, setIsLoading] = useState(false);
    const [notificationStyle, setNotificationStyle] = useState('deep');
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
            // If notifications are already enabled, disable them
            if (notificationPermission) {
                // Cancel all active notifications
                const activeGoals = goals.filter(goal => !goal.completed);
                const cancellationResults = await Promise.all(
                    activeGoals.map(goal => cancelNotification(goal.id))
                );

                // Check if any cancellations failed
                const allCancelled = cancellationResults.every(result => result);
                if (!allCancelled) {
                    console.warn('Some notifications could not be cancelled');
                }

                setNotificationPermission(false);
                toast.success('Notifications disabled');
                return;
            }

            // Otherwise, request permission to enable notifications
            const permission = await Notification.requestPermission();
            setNotificationPermission(permission === 'granted');
            if (permission === 'granted') {
                await requestNotificationPermission();
                toast.success('Notifications enabled');
            } else {
                toast.error('Please enable notifications in your browser settings');
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
                await scheduleNotification(
                    { id: goalId, ...goalData },
                    notificationInterval,
                    notificationStyle
                );
            }
        } catch (error) {
            console.error('Error creating goal:', error);
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

    const handleStyleChange = async (style) => {
        try {
            setIsLoading(true);
            // Update style for all active goals
            const activeGoals = goals.filter(goal => !goal.completed);
            await Promise.all(
                activeGoals.map(goal =>
                    updateNotificationInterval(goal.id, notificationInterval, style)
                )
            );
            setNotificationStyle(style);
        } catch (error) {
            console.error('Error updating notification style:', error);
            toast.error('Failed to update notification style');
        } finally {
            setIsLoading(false);
        }
    };

    const handleNotificationToggle = async () => {
        try {
            setIsLoading(true);
            if (notificationPermission) {
                await stopNotifications();
                setNotificationPermission(false);
                toast.success('Notifications disabled');
            } else {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    await startNotifications(notificationInterval);
                    setNotificationPermission(true);
                    toast.success('Notifications enabled');
                } else {
                    toast.error('Please enable notifications in your browser settings');
                }
            }
        } catch (error) {
            console.error('Error toggling notifications:', error);
            toast.error('Failed to toggle notifications');
        } finally {
            setIsLoading(false);
        }
    };

    const handleIntervalChange = async (newInterval) => {
        try {
            setIsLoading(true);
            const success = await updateNotificationInterval(newInterval);
            if (success) {
                setNotificationInterval(newInterval);
                toast.success(`Notification interval updated to ${newInterval} minutes`);
            } else {
                toast.error('Failed to update notification interval');
            }
        } catch (error) {
            console.error('Error updating interval:', error);
            toast.error('Failed to update notification interval');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTestNotifications = async () => {
        try {
            const result = await testNotificationService();
            if (result) {
                toast.success('Notification test successful!');
            } else {
                toast.error('Notification test failed');
            }
        } catch (error) {
            console.error('Test error:', error);
            toast.error('Error testing notifications');
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

                <NotificationPreferences
                    notificationEnabled={notificationPermission}
                    onEnableNotifications={handleNotificationToggle}
                    interval={notificationInterval}
                    onIntervalChange={handleIntervalChange}
                    notificationStyle={notificationStyle}
                    onStyleChange={handleStyleChange}
                />

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

                <button
                    onClick={handleTestNotifications}
                    className="test-notification-button"
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        margin: '10px'
                    }}
                >
                    Test Notifications
                </button>
            </main>
        </div>
    );
};

export default DashboardPage; 