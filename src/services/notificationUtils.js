import { doc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

// Cancel notification
export const cancelNotification = async (goalId) => {
    try {
        if (!auth.currentUser) {
            console.warn('No authenticated user found when trying to cancel notification');
            return false;
        }

        const notificationId = `${auth.currentUser.uid}_${goalId}`;
        console.log('Attempting to cancel notification:', notificationId);

        const notificationRef = doc(db, 'notifications', notificationId);
        await deleteDoc(notificationRef);
        console.log('Notification cancelled successfully:', notificationId);
        return true;
    } catch (error) {
        console.error('Error canceling notification:', error);
        // Don't throw the error, just return false
        return false;
    }
}; 