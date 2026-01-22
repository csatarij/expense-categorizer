export interface Expense {
  id: string;
  date: Date;
  description: string;
  amount: number;
  category?: string;
  confidence?: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  keywords?: string[];
}

export type CategoryConfidence = {
  category: string;
  confidence: number;
};
