// Import necessary Firebase modules
import { initializeApp } from "firebase/app";
import {
    getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword,
    signInWithEmailAndPassword, signInAnonymously, signOut as firebaseSignOut, onAuthStateChanged,
    setPersistence, browserLocalPersistence, updateProfile
} from "firebase/auth";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, orderBy, where, addDoc } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Your Firebase configuration
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

// Initialize Firebase Messaging
let messagingInstance = null;
try {
    if ('serviceWorker' in navigator) {
        messagingInstance = getMessaging(app);
        // Request permission and get token
        Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
                console.log('Notification permission granted.');
                // Get the token
                getToken(messagingInstance, {
                    vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY
                }).then((currentToken) => {
                    if (currentToken) {
                        console.log('FCM Token:', currentToken);
                    } else {
                        console.log('No registration token available.');
                    }
                }).catch((err) => {
                    console.log('An error occurred while retrieving token:', err);
                });
            } else {
                console.log('Unable to get permission to notify.');
            }
        });
    }
} catch (err) {
    console.log('Failed to initialize Firebase Messaging:', err);
}

const messaging = messagingInstance;

// Handle foreground messages
if (messaging) {
    onMessage(messaging, (payload) => {
        console.log('Received foreground message:', payload);
        // Show notification using the Notifications API
        if (Notification.permission === 'granted') {
            const { title, body } = payload.notification;
            new Notification(title, {
                body,
                icon: '/logo192.png',
                badge: '/logo192.png',
                requireInteraction: true
            });
        }
    });
}

const provider = new GoogleAuthProvider();

// Set persistence for authentication
setPersistence(auth, browserLocalPersistence)
    .then(() => console.log("Persistence set to local storage"))
    .catch((error) => console.error("Persistence error:", error));

// Function for Google Sign-In with Redirect
const signInWithGoogle = () => {
    return signInWithPopup(auth, provider)
        .then((result) => {
            console.log("User signed in:", result.user);
            window.location.href = "/dashboard"; // Redirect after successful login
        })
        .catch((error) => {
            console.error(error.message);
            throw error;
        });
};

// Function to Sign Up new users and redirect after registration
const signUp = (email, password, name) => {
    return createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            // Set the user's display name after sign-up
            return updateProfile(user, {
                displayName: name,
            }).then(() => {
                console.log("User registered and name updated:", user.displayName);
                // Create user document in Firestore
                return setDoc(doc(db, "users", user.uid), {
                    name: name,
                    email: email,
                    createdAt: new Date()
                });
            }).then(() => {
                // Redirect after successful sign-up
                window.location.href = "/dashboard";
            });
        })
        .catch((error) => {
            console.error("Error signing up:", error.message);
            throw error;
        });
};

// Function to Sign In existing users and redirect after login
const signIn = async (email, password) => {
    try {
        // Check network connectivity first
        if (!navigator.onLine) {
            throw new Error("No internet connection. Please check your network and try again.");
        }

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("User signed in:", userCredential.user);

        // Add a small delay before redirect to ensure Firebase state is updated
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check if we're still online before redirecting
        if (!navigator.onLine) {
            throw new Error("Network connection lost. Please check your connection and try again.");
        }

        window.location.href = "/dashboard";
    } catch (error) {
        console.error("Error signing in:", error.message);

        // Handle specific Firebase errors
        if (error.code === "auth/network-request-failed") {
            throw new Error("Network error. Please check your internet connection and try again.");
        } else if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
            throw new Error("Invalid email or password. Please try again.");
        } else if (error.code === "auth/too-many-requests") {
            throw new Error("Too many failed login attempts. Please try again later.");
        } else if (error.code === "auth/invalid-email") {
            throw new Error("Invalid email format. Please check your email address.");
        } else {
            throw new Error(error.message || "An error occurred during login. Please try again.");
        }
    }
};

// Anonymous Sign-In with Redirect
const signInWithAnonymous = () => {
    return signInAnonymously(auth)
        .then((userCredential) => {
            console.log("User signed in anonymously:", userCredential.user);
            window.location.href = "/dashboard"; // Redirect after anonymous login
        })
        .catch((error) => {
            console.error("Error signing in anonymously:", error.message);
            throw error;
        });
};

// Auth state change listener to track signed-in user
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User is signed in:", user);
    } else {
        console.log("User is signed out.");
    }
});

// Sign Out user and redirect to login page
const signOutUser = () => firebaseSignOut(auth);

// Goal Management Functions

// Create a new goal
const createGoal = async (goalData) => {
    try {
        const goalsRef = collection(db, 'users', auth.currentUser.uid, 'goals');
        const docRef = await addDoc(goalsRef, {
            ...goalData,
            createdAt: new Date(),
            completed: false
        });
        return docRef.id;
    } catch (error) {
        console.error('Error creating goal:', error);
        throw error;
    }
};

// Get all goals for a user
const getGoals = async () => {
    try {
        const goalsRef = collection(db, 'users', auth.currentUser.uid, 'goals');
        const q = query(goalsRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting goals:', error);
        throw error;
    }
};

// Update a goal
const updateGoal = async (goalId, updates) => {
    try {
        const goalRef = doc(db, 'users', auth.currentUser.uid, 'goals', goalId);
        await updateDoc(goalRef, updates);
    } catch (error) {
        console.error('Error updating goal:', error);
        throw error;
    }
};

// Delete a goal
const deleteGoal = async (goalId) => {
    try {
        if (!auth.currentUser) {
            throw new Error('No authenticated user found');
        }

        const goalRef = doc(db, 'users', auth.currentUser.uid, 'goals', goalId);
        await deleteDoc(goalRef);
        console.log('Goal deleted successfully:', goalId);
        return true;
    } catch (error) {
        console.error('Error deleting goal:', error);
        throw error;
    }
};

// Export all Firebase services
export {
    auth,
    db,
    functions,
    messaging,
    signIn,
    signInWithAnonymous,
    signInWithGoogle,
    signOutUser,
    signUp,
    createGoal,
    getGoals,
    updateGoal,
    deleteGoal
};
