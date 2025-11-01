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
import type { Message, GroundingSource } from '../types';

// Your web app's Firebase configuration is now loaded from environment variables.
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
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
  
  // Explicitly construct the object for Firestore to avoid undefined values.
  const messageForFirestore: {
    role: 'user' | 'model';
    text: string;
    timestamp: Date;
    userId?: string;
    sources?: GroundingSource[];
  } = {
      role: message.role,
      text: message.text,
      timestamp: new Date(),
  };

  if (message.userId) {
      messageForFirestore.userId = message.userId;
  }
  
  // Firestore supports empty arrays, but not undefined.
  // This check correctly skips adding the 'sources' key if it's undefined.
  if (message.sources) {
      messageForFirestore.sources = message.sources;
  }

  await updateDoc(roomRef, {
    messages: arrayUnion(messageForFirestore),
  });
}