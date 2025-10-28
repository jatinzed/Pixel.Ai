
export interface GroundingSource {
  uri: string;
  title: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  sources?: GroundingSource[];
  // Fix: Add optional userId for room messages. This resolves the error in App.tsx where userId was being added to a user message for a chat room.
  userId?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
}