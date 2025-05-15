export interface ConversationsList {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  conversations: ConversationListItem[];
}

export interface MessageItem {
  id: number;
  message: {
    additional_kwargs: Record<string, unknown>;
    content: string;
    response_metadata: Record<string, unknown>;
    type: string;
  };
  session_id: string;
}

export interface ConversationListItem {
  session_id: string;
  user_id: string | number;
  user_name: string;
  last_activity: string;
  conversation_history: MessageItem[];
}

export interface ApplicationStats {
  totalConversations: number;
  activeUsers: number;
  averageMessagesPerConversation: number;
  averageDuration: string;
  popularQueries: { query: string; count: number }[];
}

// Interfaces for conversation detail page
export interface Message {
  type: string;
  role: "user" | "assistant" | "human" | "ai";
  content: string;
  timestamp: Date;
}

export interface ConversationDetail {
  conversationId: string;
  metadata: {
    startTime: Date;
    endTime?: Date;
    duration?: string;
    action?: string;
    referrer?: string;
    userAgent?: string;
  };
  messages: Message[];
}

// Dashboard stats interfaces
export interface TimeSinceLastActivity {
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
}

export interface UserActivityStats {
  dau: number;
  wau: number;
  mau: number;
  totalUsersEver: number;
  activeSessions: number;
  inactiveSessions: number;
  totalSessions: number;
  avgSessionsPerUser: number;
  weeklyRetentionRate: number;
  avgSessionMinutes: number;
  maxSessionMinutes: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  mostRecentActivity: string; // ISO date string
  timeSinceLastActivity: TimeSinceLastActivity;
}

export interface AdminDashboardStats {
  analytics: UserActivityStats | null;
  healthTracker: UserActivityStats | null;
}
