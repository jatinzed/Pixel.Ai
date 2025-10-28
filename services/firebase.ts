
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  runTransaction
} from "firebase/firestore";
import type { Message } from '../types';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC2okxLCbWu8aRVxHzzzf3awh36B25UKPU",
  authDomain: "pixel-ai-10c0e.firebaseapp.com",
  projectId: "pixel-ai-10c0e",
  storageBucket: "pixel-ai-10c0e.firebasestorage.app",
  messagingSenderId: "864827888165",
  appId: "1:864827888165:web:836e121bdbb8e5778425cc",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// --- Room Service Functions ---

export function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createRoom(creatorId: string): Promise<string> {
  const roomCode = generateRoomCode();
  const roomRef = doc(db, "rooms", roomCode);
  await setDoc(roomRef, {
    messages: [],
    createdAt: serverTimestamp(),
    participants: [creatorId],
  });
  return roomCode;
}

export async function joinRoom(roomCode: string, userId: string): Promise<void> {
  const roomRef = doc(db, "rooms", roomCode);
  await updateDoc(roomRef, {
    participants: arrayUnion(userId),
  });
}

export async function leaveRoom(roomCode: string, userId: string): Promise<void> {
    const roomRef = doc(db, "rooms", roomCode);
    try {
        await runTransaction(db, async (transaction) => {
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists()) {
                return; // Room already deleted.
            }

            const currentParticipants = roomDoc.data().participants || [];
            if (!currentParticipants.includes(userId)) {
                return; // User already left.
            }

            const newParticipants = currentParticipants.filter((id: string) => id !== userId);

            if (newParticipants.length === 0) {
                transaction.delete(roomRef); // Last user is leaving, delete the room.
            } else {
                transaction.update(roomRef, { participants: newParticipants });
            }
        });
    } catch (error) {
        console.error("Error leaving room: ", error);
        throw error; // Rethrow to be handled by the UI
    }
}


export async function roomExists(roomCode: string): Promise<boolean> {
  const roomRef = doc(db, "rooms", roomCode);
  const docSnap = await getDoc(roomRef);
  return docSnap.exists();
}

export function listenForMessages(roomCode: string, callback: (messages: Message[]) => void): () => void {
  const roomRef = doc(db, "rooms", roomCode);
  const unsubscribe = onSnapshot(roomRef, (doc) => {
    const data = doc.data();
    if (data && data.messages) {
      // Map Firestore message format to our app's Message type
      const messages: Message[] = data.messages.map((msg: any, index: number) => ({
        ...msg,
        // Create a stable ID from timestamp for React keys
        id: msg.timestamp?.seconds ? `${msg.timestamp.seconds}-${index}` : `${Date.now()}-${index}`, 
      }));
      callback(messages);
    }
  });
  return unsubscribe;
}

export async function sendMessage(roomCode: string, message: Omit<Message, 'id'>) {
  const roomRef = doc(db, "rooms", roomCode);
  
  const messageForFirestore = {
      ...message,
      timestamp: new Date(),
  };

  await updateDoc(roomRef, {
    messages: arrayUnion(messageForFirestore),
  });
}