// Firebase backend — unchanged from the existing halfaloveletter.com site.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const app = initializeApp({
    apiKey: "AIzaSyAqQY4Bz_YJq5ZzQYaKMhnnNz5fP6YpI4E",
    authDomain: "half-a-love-letter.firebaseapp.com",
    projectId: "half-a-love-letter",
    storageBucket: "half-a-love-letter.firebasestorage.app",
    messagingSenderId: "781202203799",
    appId: "1:781202203799:web:002ae068d9ed7363d435d2",
    measurementId: "G-WRLJDGH4C6"
});

const db = getFirestore(app);
let allLetters = [];
let currentLetter = null;

window.submitLetter = async function(content) {
    const text = content.trim();
    if (!text) return { success: false, message: 'Please write something from your heart' };
    if (text.length > 2000) return { success: false, message: 'Letter is too long. Maximum 2000 characters.' };

    try {
        await addDoc(collection(db, 'letters'), {
            content: text,
            timestamp: serverTimestamp(),
            createdAt: new Date().toISOString()
        });
        allLetters = [];
        return { success: true, message: '✨ Your letter has been sent to the universe. It will touch someone\'s heart.' };
    } catch (error) {
        console.error('Error:', error);
        return { success: false, message: 'There was an error sending your letter. Please try again.' };
    }
};

window.loadRandomLetter = async function() {
    try {
        if (allLetters.length === 0) {
            const querySnapshot = await getDocs(collection(db, 'letters'));
            allLetters = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        if (allLetters.length === 0) {
            return { success: false, letter: null, message: 'No letters yet. Be the first to share your heart.' };
        }

        let randomLetter;
        if (allLetters.length === 1) {
            randomLetter = allLetters[0];
        } else {
            do {
                randomLetter = allLetters[Math.floor(Math.random() * allLetters.length)];
            } while (currentLetter && randomLetter.id === currentLetter.id);
        }

        currentLetter = randomLetter;
        return { success: true, letter: randomLetter };
    } catch (error) {
        console.error('Error:', error);
        return { success: false, letter: null, message: 'Unable to load letters. Please try again.' };
    }
};

window.refreshLettersCache = function() {
    allLetters = [];
    currentLetter = null;
};

window.formatDate = function(isoDate) {
    if (!isoDate) return 'Recently';
    try {
        return new Date(isoDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch {
        return 'Recently';
    }
};

console.log('💝 Love Letters Backend Ready!');
window.dispatchEvent(new Event('loveLettersReady'));
