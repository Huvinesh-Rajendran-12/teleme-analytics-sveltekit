export type MessageRole = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: MessageRole;
  content: string | object;
}

export interface ChatState {
  messages: Message[];
  loading: boolean;
  stage:
    | "menu"
    | "summary"
    | "welcome"
    | "initial"
    | "diagnoses"
    | "question"
    | "asking_duration"
    | "process_text_input"
    | "message_input"
    | "post_response"
    | "loading"
    | "error"
    | "date_selection";
  selectedOption?: string;
}

export interface Params {
  centre_id: string;
  centre_name: string;
  sessionId: string;
  is_ngo: boolean;
  auth_token: string;
  [key: string]: string | number | boolean | undefined;
}

export interface AnalyticsData {
  totalConversations: number;
  avgMessagesPerConversation: number;
  topActions: { action: string; count: number }[];
}

export type OptionsButtonType = {
  id: string;
  label: string;
  icon: string;
  variant: 'primary' | 'secondary' | 'ghost' | 'gradient-blue-teal';
  isVisible: boolean;
  order: number;
};
