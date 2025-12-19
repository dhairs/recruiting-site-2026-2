export interface Note {
  id: string;
  applicationId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: Date;
}

export interface ReviewTask {
  id: string;
  applicationId: string;
  description: string;
  isCompleted: boolean;
  completedBy?: string; // userId
  completedAt?: Date;
  createdAt: Date;
}
