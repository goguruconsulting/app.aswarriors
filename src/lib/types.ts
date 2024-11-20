export interface PainEntry {
  id: string;
  userId: string;
  painLevel: number;
  date: Date;
  notes: string;
  createdAt: Date;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}