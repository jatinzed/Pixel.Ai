
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
  FieldValue
} from "firebase/firestore";
import type { Message } from '../types';

// WARNING: Replace this with your own Firebase configuration.
// You can get this from your Firebase project settings (Settings > General).
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
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

export async function createRoom(): Promise<string> {
  const roomCode = generateRoomCode();
  const roomRef = doc(db, "rooms", roomCode);
  await setDoc(roomRef, {
    messages: [],
    createdAt: serverTimestamp(),
  });
  return roomCode;
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
      timestamp: serverTimestamp(),
  };

  await updateDoc(roomRef, {
    messages: arrayUnion(messageForFirestore),
  });
}
