<script lang="ts">
  import { onMount, onDestroy, afterUpdate } from 'svelte';
  import { v7 as uuidv7 } from 'uuid';
  import { logInfo, logError, logDebug } from '$lib/utils/secureLogger';
  import { n8nService } from '$lib/services';
  import ChatMessage from './ChatMessage.svelte';
  // Ensure the message object is named properly when passing to ChatMessage
  import OptionsButtons from './OptionsButtons.svelte';
  import ChatInput from './ChatInput.svelte';
  // Import environment variables with fallback values
  const PUBLIC_HEALTH_TRACKER_TIMEOUT = '15'; // Would normally come from $env/static/public

  export let patientId: string | number;
  export let userId: string | number;
  export let userName: string;

  type Message = {
    id: string;
    role: 'user' | 'assistant';
    content: string | object;
  };

  type ChatState = {
    messages: Message[];
    loading: boolean;
    stage: "welcome" | "date_selection" | "question" | "post_response" | "error";
  };

  type LoadingState = "idle" | "connecting" | "processing" | "analyzing" | "finalizing";

  let chatState: ChatState = {
    messages: [],
    loading: false,
    stage: "date_selection"
  };

  let loadingState: LoadingState = "idle";
  let retryCount = 0;
  const maxRetries = 3;
  let retryTimeoutId: number | null = null;
  let sessionId = uuidv7();
  let selectedPeriod = 1;
  let isScrolledAway = false;
  let lastActivity = Date.now();
  let isServiceAvailable = true;
  let initialFetchDone = false;
  let chatEndRef: HTMLDivElement;
  let chatContainerRef: HTMLDivElement;
  let inactivityTimerId: number | null = null;

  const POST_RESPONSE_BUTTONS = [
    { id: "ask", label: "Ask Question", icon: "❓", variant: "primary" as const, isVisible: true, order: 1 },
    { id: "reselect", label: "Reselect Date Range", icon: "📅", variant: "secondary" as const, isVisible: true, order: 2 },
    { id: "end", label: "End Chat", icon: "👋", variant: "ghost" as const, isVisible: true, order: 3 }
  ];

  const DATE_RANGE_BUTTONS = [
    { id: "1month", label: "1 Month", icon: "📅", variant: "primary" as const, isVisible: true, order: 1 },
    { id: "3months", label: "3 Months", icon: "📅", variant: "primary" as const, isVisible: true, order: 2 },
    { id: "6months", label: "6 Months", icon: "📅", variant: "primary" as const, isVisible: true, order: 3 }
  ];

  const QUICK_CHECK_TIMEOUT = 2000;
  const MAX_TIMEOUT = 10000;
  const CONNECTION_CHECK_ENDPOINT = '/api/health-check';

  const checkConnectionStatus = async (endpoint: string, timeout: number): Promise<boolean> => {
    try {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), timeout);

      try {
        const response = await fetch(endpoint, {
          method: 'HEAD',
          signal: abortController.signal,
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        return response.ok;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logError('Connection check failed:', { error: errorMessage, endpoint });
      return false;
    }
  };

  const recordActivity = () => {
    logDebug("Activity recorded");
    lastActivity = Date.now();
  };

  const addMessage = (role: "user" | "assistant", content: string | object) => {
    const processedContent = (typeof content === "string" && content !== "[object Object]")
      ? content.trim()
      : "Sorry, I couldn't process that request due to an unexpected response from the service. Please try again.";

    if (typeof content !== "string" || content === "[object Object]") {
      logDebug("Attempted to add unexpected content, converting to placeholder", { originalContent: content });
    }

    const newMessage: Message = {
      id: uuidv7(),
      role,
      content: processedContent === "" && role === "assistant"
        ? "Sorry, I couldn't generate a response. Please try again."
        : content
    };

    chatState.messages = [...chatState.messages, newMessage];
    logDebug("Message added", { role, content: typeof newMessage.content === 'string' ? newMessage.content.substring(0, 50) + '...' : 'object' });
    recordActivity();
  };

  const endConversation = (isError = false) => {
    logDebug("Ending conversation", { isError });
    recordActivity();

    if (!isError) {
      addMessage("assistant", "Thank you for using Teleme AI. The conversation has ended.");
    }

    if (inactivityTimerId) {
      clearInterval(inactivityTimerId);
      inactivityTimerId = null;
    }

    if (retryTimeoutId) {
      clearTimeout(retryTimeoutId);
      retryTimeoutId = null;
    }

    chatState = {
      messages: chatState.messages,
      loading: false,
      stage: "welcome"
    };
  };

  const regenerateSessionId = () => {
    logDebug("Attempting to regenerate session ID");
    const maxAttempts = 3;
    let attempt = 0;
    let newId;

    do {
      newId = uuidv7();
      attempt++;
      logDebug(`Generating session ID (attempt ${attempt}/${maxAttempts})`);

      if (attempt > maxAttempts) {
        logError("Failed to generate unique session ID after multiple attempts");
        break;
      }
    } while (newId === sessionId && attempt <= maxAttempts);

    if (attempt <= maxAttempts) {
      logDebug(`Generated new session ID: ${newId}`);
      sessionId = newId;
      return newId;
    } else {
      logError("Could not generate a unique session ID, retaining old one.");
      return sessionId;
    }
  };

  const retryWithBackoff = (period: number, newSessionId?: string) => {
    const nextRetryCount = retryCount + 1;
    retryCount = nextRetryCount;

    if (nextRetryCount <= maxRetries) {
      if (retryTimeoutId) {
        clearTimeout(retryTimeoutId);
        retryTimeoutId = null;
      }

      const delay = nextRetryCount === 1
        ? QUICK_CHECK_TIMEOUT
        : Math.min(Math.pow(2, nextRetryCount - 1) * 1000, MAX_TIMEOUT);

      const delayInSeconds = delay/1000;
      const secondsText = delayInSeconds === 1 ? 'second' : 'seconds';

      chatState.messages = chatState.messages.filter(msg =>
        !msg.content?.toString().includes('Connection issue. Retrying in')
      );
      chatState.messages = [...chatState.messages];

      addMessage(
        "assistant",
        `Connection issue. Retrying in ${delayInSeconds} ${secondsText}... (Attempt ${nextRetryCount} of ${maxRetries})`
      );

      const timeoutId = setTimeout(() => {
        loadingState = "connecting";
        fetchDataFromN8n(period, newSessionId);
      }, delay);

      retryTimeoutId = timeoutId;
    } else {
      logError("Connection failed after max retries", { userId, patientId, sessionId });
      isServiceAvailable = false;

      addMessage(
        "assistant",
        "Unable to connect to the Health Assistant service after multiple attempts. Please try again later."
      );

      chatState = {
        ...chatState,
        loading: false,
        stage: "error"
      };
    }
  };

  const handleConnectionError = (error: string) => {
    if (isServiceAvailable) {
      if (retryCount < maxRetries) {
        retryWithBackoff(selectedPeriod);
        return;
      }

      logError("Connection error", { error, userId, patientId, sessionId });
      isServiceAvailable = false;

      addMessage(
        "assistant",
        "The connection to the Health Assistant service was lost. The conversation has ended. Thank you for using Teleme AI."
      );

      endConversation(true);
    }
  };

  const fetchDataFromN8n = async (period = 1, newSessionId?: string) => {
    logDebug("Fetching data from n8n", { period, patientId, sessionId: newSessionId || sessionId });
    recordActivity();

    retryCount = 0;
    chatState.messages = chatState.messages.filter(msg =>
      !msg.content?.toString().includes('Connection issue. Retrying in')
    );
    chatState.messages = [...chatState.messages];

    const isConnected = await checkConnectionStatus(CONNECTION_CHECK_ENDPOINT, QUICK_CHECK_TIMEOUT);
    if (!isConnected) {
      logDebug('Quick connection check failed, initiating retry sequence');
      retryWithBackoff(selectedPeriod, newSessionId);
      return;
    }

    loadingState = "connecting";
    chatState.loading = true;

    const periodText = period === 1 ? "1 month" : period === 3 ? "3 months" : "6 months";
    addMessage("user", `Summarize health tracker data for ${periodText}.`);

    try {
      const usedSessionId = newSessionId || sessionId;
      loadingState = "processing";

      const message = `Summarize health tracker data for ${periodText}.`;
      const result = await n8nService.callWithParams(
        usedSessionId,
        userId,
        userName,
        period,
        message,
        "health_tracker_summary",
        null,
        patientId
      );

      loadingState = "analyzing";

      if (!result) {
        handleConnectionError("No response received from service.");
      } else if (result.success) {
        isServiceAvailable = true;

        let messageContent: string | object | null = null;
        if (typeof result.data === "string" && result.data.trim() !== "") {
          messageContent = result.data.trim();
        } else if (typeof result.data === "object" && result.data !== null) {
          messageContent = result.data;
        }

        loadingState = "finalizing";

        if (messageContent === null || 
            (typeof messageContent === "string" && messageContent === "") || 
            (typeof messageContent === "object" && Object.keys(messageContent).length === 0)) {
          logError("Empty response from service", { data: result.data, sessionId: usedSessionId });
          addMessage(
            "assistant",
            "Sorry, I couldn't generate a summary for the selected period. Please try another duration or try again later."
          );
        } else {
          addMessage("assistant", messageContent);
        }

        chatState.loading = false;
        chatState.stage = "post_response";
        loadingState = "idle";
      } else {
        handleConnectionError(result.error || "Unknown error");
      }
    } catch (error: unknown) {
      logError("Error fetching data:", error);

      const errorMessage = error instanceof Error && error.message ? error.message.toLowerCase() : '';
      if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('connection')) {
        handleConnectionError("Network connection issue. Please check your internet connection.");
      } else if (errorMessage.includes('unauthorized') || errorMessage.includes('auth')) {
        handleConnectionError("Authentication error. Please try logging in again.");
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
        handleConnectionError("Service is experiencing high load. Please try again in a few minutes.");
      } else {
        handleConnectionError(error instanceof Error ? error.message : "An unknown error occurred");
      }
    }
  };

  const startNewConversation = () => {
    logDebug("Starting new conversation");
    recordActivity();
    isServiceAvailable = true;
    chatState = {
      messages: [],
      loading: false,
      stage: "date_selection"
    };
    regenerateSessionId();
    addMessage("assistant", "Please select a date range:");
  };

  onMount(() => {
    if (!initialFetchDone) {
      initialFetchDone = true;
      addMessage("assistant", "Please select a date range:");
    }

    const trackActivity = () => recordActivity();
    document.addEventListener("mousedown", trackActivity);
    document.addEventListener("keypress", trackActivity);
    document.addEventListener("touchstart", trackActivity);

    return () => {
      if (inactivityTimerId) clearInterval(inactivityTimerId);
      if (retryTimeoutId) clearTimeout(retryTimeoutId);
      if (n8nService?.cleanup) n8nService.cleanup();
      
      document.removeEventListener("mousedown", trackActivity);
      document.removeEventListener("keypress", trackActivity);
      document.removeEventListener("touchstart", trackActivity);
    };
  });

  $: {
    if (chatState.stage !== "welcome" && !chatState.loading) {
      if (inactivityTimerId) {
        clearInterval(inactivityTimerId);
        inactivityTimerId = null;
      }

      const TIMEOUT_MINUTES = Number(PUBLIC_HEALTH_TRACKER_TIMEOUT) || 1;
      const inactivityLimit = TIMEOUT_MINUTES * 60 * 1000;

      inactivityTimerId = setInterval(() => {
        const inactiveTime = Date.now() - lastActivity;
        if (inactiveTime >= inactivityLimit) {
          addMessage(
            "assistant",
            "The conversation has been automatically ended due to inactivity. Thank you for using Teleme AI."
          );
          endConversation();
        }
      }, 60000);
    }
  }

  $: {
    const lastMessage = chatState.messages[chatState.messages.length - 1];
    if (chatState.messages.length === 0 || (lastMessage && lastMessage.role === "user")) {
      afterUpdate(() => {
        scrollToBottom();
        isScrolledAway = false;
      });
    }
  }

  const handleScrollEvent = () => {
    if (!chatContainerRef) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    if (isScrolledAway !== !isAtBottom) {
      isScrolledAway = !isAtBottom;
    }
  };

  const scrollToBottom = () => {
    chatEndRef?.scrollIntoView({ behavior: "smooth" });
    isScrolledAway = false;
  };

  const handleDateRangeSelection = (option: string) => {
    recordActivity();
    let period = 1;
    if (option === "1 Month") period = 1;
    else if (option === "3 Months") period = 3;
    else if (option === "6 Months") period = 6;
    selectedPeriod = period;
    fetchDataFromN8n(period);
  };

  const handlePostResponseOption = (option: string) => {
    recordActivity();
    if (option === "Ask Question") {
      chatState.stage = "question";
      addMessage("assistant", "What would you like to ask?");
    } else if (option === "Reselect Date Range") {
      chatState.stage = "date_selection";
      addMessage("assistant", "Please select a date range:");
    } else if (option === "End Chat") {
      endConversation();
    }
  };

  const handleSendQuestion = async (question: string) => {
    recordActivity();
    chatState.loading = true;
    addMessage("user", question);

    try {
      const result = await n8nService.sendMessage(
        sessionId,
        question,
        userId,
        "health_tracker_summary",
        patientId
      );

      if (result?.success) {
        isServiceAvailable = true;

        let messageContent: string | object | null = null;
        if (typeof result.data === "string" && result.data.trim() !== "") {
          messageContent = result.data.trim();
        } else if (typeof result.data === "object" && result.data !== null) {
          messageContent = result.data;
        }

        if (messageContent === null || 
            (typeof messageContent === "string" && messageContent === "") || 
            (typeof messageContent === "object" && Object.keys(messageContent).length === 0)) {
          addMessage(
            "assistant",
            "Sorry, I couldn't process that question. Please try asking something else or try again later."
          );
        } else {
          addMessage("assistant", messageContent);
        }

        chatState.loading = false;
        chatState.stage = "post_response";
      } else {
        handleConnectionError(result?.error || "Unknown error");
      }
    } catch (error: unknown) {
      logError("Error processing question:", error);

      const errorMessage = error instanceof Error && error.message ? error.message.toLowerCase() : '';
      if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('connection')) {
        handleConnectionError("Network connection issue. Please check your internet connection.");
      } else if (errorMessage.includes('unauthorized') || errorMessage.includes('auth')) {
        handleConnectionError("Authentication error. Please try logging in again.");
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
        handleConnectionError("Service is experiencing high load. Please try again in a few minutes.");
      } else {
        handleConnectionError(error.message || "An unknown error occurred.");
      }
    }
  };

  const renderLoadingIndicator = () => `
    <div class="thinking-loader">
      <div class="thinking-inline">
        <span class="thinking-text flex items-center">
          ${loadingState === "connecting" ? "Connecting" :
            loadingState === "processing" ? "Processing data" :
            loadingState === "analyzing" ? "Analyzing results" :
            loadingState === "finalizing" ? "Preparing response" :
            "Processing"}
          <span class="ml-2">
            ${loadingState === "connecting" ? "🔄" :
              loadingState === "processing" ? "⚙️" :
              loadingState === "analyzing" ? "🔍" :
              loadingState === "finalizing" ? "📊" : ""}
          </span>
          <div class="thinking-dots-inline ml-1">
            <span></span><span></span><span></span>
          </div>
        </span>
      </div>
    </div>
  `;
</script>

<div class="flex flex-col h-full w-full">
  <div
    class="flex-grow overflow-y-auto bg-gradient-to-b-gray-white chat-container"
    bind:this={chatContainerRef}
    on:scroll={handleScrollEvent}
    style="overscroll-behavior: contain; -webkit-overflow-scrolling: touch; -ms-overflow-style: none; scrollbar-width: thin; scrollbar-color: #e2e8f0 #f8fafc;"
    on:wheel|stopPropagation
  >
    <div class="px-3 md:px-6 lg:px-8 pt-4 pb-16 w-full">
      {#each chatState.messages.filter(msg => {
        if (!msg || msg.content === undefined || msg.content === null) return false;
        if (typeof msg.content === 'string') {
          const trimmed = msg.content.trim();
          return trimmed !== "" && trimmed.toLowerCase() !== "undefined" && trimmed.toLowerCase() !== "null";
        }
        if (typeof msg.content === 'object') {
          return Object.keys(msg.content).length > 0;
        }
        return false;
      }) as msg, index}
        <div class="mb-8">
          <div class={`text-sm mb-1 ${msg.role === "user" ? "text-right" : "text-left"}`}>
            <span class="text-gray-500 font-medium">
              {msg.role === "user" ? "You" : "Assistant"}
            </span>
          </div>
          <ChatMessage message={msg} />
        </div>
      {/each}

      {#if chatState.messages.length === 0 && chatState.loading}
        <div class="flex flex-col items-center justify-center py-20 w-full">
          {@html renderLoadingIndicator()}
        </div>
      {/if}

      {#if !chatState.loading}
        {#if chatState.stage !== "question"}
          <div class="mt-4">
            {#if chatState.stage === "welcome"}
              <div class="flex justify-center my-4">
                <button
                  on:click={startNewConversation}
                  class="btn-gradient text-white font-semibold py-2 px-6 rounded-full shadow"
                >
                  <div class="flex items-center justify-center">
                    <span class="text-base">🚀</span>
                    <span class="font-medium text-sm mx-2">
                      Start New Analysis
                    </span>
                  </div>
                </button>
              </div>
            {:else if chatState.stage === "date_selection"}
              <OptionsButtons
                buttons={DATE_RANGE_BUTTONS}
                onSelect={(id) => {
                  const months = id === "1month" ? 1 : id === "3months" ? 3 : 6;
                  handleDateRangeSelection(`${months} Month${months > 1 ? "s" : ""}`);
                }}
              />
            {:else if chatState.stage === "post_response"}
              <OptionsButtons
                buttons={POST_RESPONSE_BUTTONS}
                onSelect={(id) => {
                  const option = id === "ask"
                    ? "Ask Question"
                    : id === "reselect"
                      ? "Reselect Date Range"
                      : "End Chat";
                  handlePostResponseOption(option);
                }}
              />
            {:else if chatState.stage === "error"}
              <div class="flex justify-center my-4">
                <button
                  on:click={() => fetchDataFromN8n(selectedPeriod, regenerateSessionId())}
                  class="btn-gradient text-white font-semibold py-2 px-6 rounded-full shadow"
                >
                  <div class="flex items-center justify-center">
                    <span class="text-base">🔄</span>
                    <span class="font-medium text-sm mx-2">
                      Retry
                    </span>
                  </div>
                </button>
              </div>
            {/if}
          </div>
        {/if}
      {/if}

      {#if chatState.loading && chatState.messages.length > 0}
        <div class="flex justify-center items-center my-6">
          {@html renderLoadingIndicator()}
        </div>
      {/if}

      <div bind:this={chatEndRef}></div>
      <div class="h-20"></div>

      {#if isScrolledAway && chatState.messages.length > 0}
        <button
          on:click={scrollToBottom}
          class="fixed bottom-20 right-6 bg-gradient-to-br from-blue-500 to-teal-400 text-white p-3 rounded-full shadow-lg transition-all duration-300 hover:shadow-xl"
          style="z-index: 1000; transform: scale(1); animation: 0.3s ease-out 0s 1 normal none running popIn; user-select: none;"
          aria-label="Scroll to bottom"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </button>
      {/if}
    </div>
  </div>

  {#if chatState.stage === "question"}
    <div class="w-full border-t border-gray-200 bg-white shadow-md">
      <div class="px-4 md:px-8 lg:px-12 py-3 w-full">
        <ChatInput
          onSendQuestion={handleSendQuestion}
          disabled={chatState.loading}
        />
      </div>
    </div>
  {/if}
</div>

<style>
  :global(.thinking-loader) {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :global(.thinking-inline) {
    display: inline-flex;
    align-items: center;
  }

  :global(.thinking-text) {
    font-size: 0.875rem;
    color: #4b5563;
  }

  :global(.thinking-dots-inline) {
    display: inline-flex;
    align-items: center;
  }

  :global(.thinking-dots-inline span) {
    width: 4px;
    height: 4px;
    margin: 0 2px;
    background-color: currentColor;
    border-radius: 50%;
    animation: thinking 1.4s infinite ease-in-out both;
  }

  :global(.thinking-dots-inline span:nth-child(1)) {
    animation-delay: -0.32s;
  }

  :global(.thinking-dots-inline span:nth-child(2)) {
    animation-delay: -0.16s;
  }

  @keyframes thinking {
    0%, 80%, 100% { 
      transform: scale(0);
    } 
    40% { 
      transform: scale(1.0);
    }
  }

  :global(.btn-gradient) {
    background: linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%);
  }

  :global(.bg-gradient-to-b-gray-white) {
    background: linear-gradient(to bottom, #f9fafb 0%, #ffffff 100%);
  }
</style>