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

// Webhook dashboard data interfaces
export interface WebhookDashboardTrends {
  active_users: {
    current: string;
    last_month: string;
    change_percent: string;
  };
  conversations: {
    today: string;
    yesterday: string;
    change_percent: string;
  };
  response_time: {
    current_avg: string;
    last_week_avg: string | null;
    change_seconds: string | null;
    change_percent: string;
  };
}

export interface WebhookDashboardHealth {
  overall_status: string;
  hours_since_last_conversation: string;
  hours_since_last_session: string;
  total_conversations: string;
  total_sessions: string;
  system_operational: boolean;
  needs_attention: boolean;
  critical_issue: boolean;
}

export interface WebhookDashboardSummary {
  total_active_users: string;
  conversations_today: string;
  avg_response_time_seconds: string;
  analytics: {
    total_conversations: string;
    active_today: string;
    avg_duration_minutes: string;
  };
  health_tracker: {
    total_conversations: string;
    active_today: string;
    avg_duration_minutes: string;
  };
}

export interface WebhookDashboardData {
  summary: WebhookDashboardSummary;
  trends: WebhookDashboardTrends;
  health: WebhookDashboardHealth;
}

export interface WebhookDashboardResponse {
  status: string;
  timestamp: string;
  data: WebhookDashboardData;
}
