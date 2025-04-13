import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

// Cancel notification by marking it as inactive
export const cancelNotification = async (goalId) => {
    try {
        if (!auth.currentUser) {
            console.warn('No authenticated user found when trying to cancel notification');
            return false;
        }

        const notificationId = `${auth.currentUser.uid}_${goalId}`;
        console.log('Attempting to deactivate notification:', notificationId);

        const notificationRef = doc(db, 'notifications', notificationId);

        try {
            // Check if the notification exists
            const docSnapshot = await getDoc(notificationRef);
            if (!docSnapshot.exists()) {
                console.log('Notification does not exist');
                return true;
            }

            // Mark the notification as inactive
            await updateDoc(notificationRef, {
                isActive: false,
                cancelledAt: new Date()
            });

            console.log('Notification deactivated successfully:', notificationId);
            return true;
        } catch (error) {
            console.error('Error deactivating notification:', error);
            return false;
        }
    } catch (error) {
        console.error('Error in cancelNotification:', error);
        return false;
    }
}; 