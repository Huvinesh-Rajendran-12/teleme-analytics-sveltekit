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

// Updated webhook dashboard data interfaces
export interface WebhookMainMetrics {
  daily_active_users: number;
  weekly_active_users: number;
  monthly_active_users: number;
  total_active_users: number;
  new_users_this_month: number;
  conversations_today: number;
  avg_response_time_seconds: number;
  analytics: {
    total_conversations: number;
    active_today: number;
    avg_duration_minutes: number;
    max_duration_minutes: number;
    avg_sessions_per_user: number;
    new_users_this_month: number;
    most_recent_activity: string;
    seconds_since_last_activity: number;
    time_since_last_activity_formatted: string;
  };
  health_tracker: {
    total_conversations: number;
    active_today: number;
    avg_duration_minutes: number;
    max_duration_minutes: number;
    avg_sessions_per_user: number;
    new_users_this_month: number;
    most_recent_activity: string;
    seconds_since_last_activity: number;
    time_since_last_activity_formatted: string;
  };
}

export interface WebhookTrends {
  daily_users: {
    today: number;
    yesterday: number;
    change_pct: number;
  };
  weekly_users: {
    current_week: number;
    last_week: number;
    change_pct: number;
  };
  monthly_users: {
    current_month: number;
    last_month: number;
    change_pct: number;
  };
  conversations: {
    today: number;
    yesterday: number;
    change_pct: number;
  };
  response_time: {
    current_avg: number;
    last_avg: number;
    change_seconds: number;
    change_pct: number;
  };
  retention: {
    analytics_chatbot: {
      weekly_retention_pct: number;
      true_retention_pct: number;
      current_week_active: number;
      previous_week_active: number;
      retention_status: string;
    };
    health_tracker: {
      weekly_retention_pct: number;
      true_retention_pct: number;
      current_week_active: number;
      previous_week_active: number;
      retention_status: string;
    };
    comparison: {
      better_performing_app: string;
      retention_gap: number;
    };
  };
}

export interface WebhookHealth {
  overall_status: string;
  hours_since_last_conversation: number;
  hours_since_last_session: number;
  total_conversations: number;
  total_sessions: number;
  system_operational: boolean;
  needs_attention: boolean;
  critical_issue: boolean;
  last_activity_status: string;
}

export interface WebhookMeta {
  query_executed_at: string;
  data_sources: string[];
  version: string;
  includes_retention_metrics: boolean;
  includes_all_trend_metrics: boolean;
  retention_calculation_method: string;
}

export interface WebhookDashboardData {
  timestamp: string;
  status: string;
  main_metrics: WebhookMainMetrics;
  trends: WebhookTrends;
  health: WebhookHealth;
  meta: WebhookMeta;
}

export interface WebhookDashboardResponse {
  data_type: string;
  data: WebhookDashboardData;
}
