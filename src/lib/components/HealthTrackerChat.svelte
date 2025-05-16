<script lang="ts">
import { onMount, tick } from 'svelte'; // Removed afterUpdate
import { v7 as uuidv7 } from 'uuid';
import { logError, logDebug } from '$lib/utils/secureLogger'; // Removed logInfo
import { n8nService } from '$lib/services';
import ChatMessage from './ChatMessage.svelte';
// Ensure the message object is named properly when passing to ChatMessage
import OptionsButtons from './OptionsButtons.svelte';
import ChatInput from './ChatInput.svelte';
// Import environment variables with fallback values
// This should ideally come from $env/static/public or similar config
const PUBLIC_HEALTH_TRACKER_TIMEOUT = '15';

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
  { id: "1month", label: "1 Month", icon: "📅", variant: "gradient-blue-teal" as const, isVisible: true, order: 1 },
  { id: "3months", label: "3 Months", icon: "📅", variant: "gradient-blue-teal" as const, isVisible: true, order: 2 },
  { id: "6months", label: "6 Months", icon: "📅", variant: "gradient-blue-teal" as const, isVisible: true, order: 3 }
];

const QUICK_CHECK_TIMEOUT = 2000;
const MAX_TIMEOUT = 10000;
// Removed unused CONNECTION_CHECK_ENDPOINT
// Removed unused checkConnectionStatus function

const recordActivity = () => {
  logDebug("Activity recorded");
  lastActivity = Date.now();
};

const addMessage = (role: "user" | "assistant", content: string | object) => {
  // Decide whether to use processedContent or original content based on role and type
  // Only replace with placeholder for assistant errors, not user input or valid objects
  const finalContent = (typeof content === "string" && content.trim() === "" && role === "assistant")
      ? "Sorry, I couldn't generate a response. Please try again."
      : (typeof content === "string" && content !== "[object Object]") // Handle "[object Object]" case for strings
          ? content.trim() !== "" ? content.trim() : "Sorry, I couldn't process that request due to an unexpected response from the service. Please try again."
          : (typeof content === "object" && content !== null)
              ? content
              : "Sorry, I couldn't process that request due to an unexpected response from the service. Please try again."; // Fallback for unexpected content types


  if (typeof content !== "string" || content === "[object Object]") {
    logDebug("Attempted to add unexpected content, converting to placeholder", { originalContent: content });
  }


  const newMessage: Message = {
    id: uuidv7(),
    role,
    content: finalContent
  };

  chatState.messages = [...chatState.messages, newMessage];
  logDebug("Message added", { role, content: typeof newMessage.content === 'string' ? newMessage.content.substring(0, 50) + '...' : 'object' });
  recordActivity();
};

const endConversation = (isError = false) => {
  logDebug("Ending conversation", { isError });
  recordActivity();

  if (!isError) {
    // Check if the last message is already an end message to avoid duplicates
    const lastMsg = chatState.messages[chatState.messages.length - 1];
    if (!(lastMsg?.role === 'assistant' && typeof lastMsg.content === 'string' && lastMsg.content.includes('Thank you for using Teleme AI. The conversation has ended.'))) {
         addMessage("assistant", "Thank you for using Teleme AI. The conversation has ended.");
    }
  } else {
      // Ensure error message is added if not already present
      const lastMsg = chatState.messages[chatState.messages.length - 1];
       if (!(lastMsg?.role === 'assistant' && typeof lastMsg.content === 'string' && lastMsg.content.includes('The connection to the Health Assistant service was lost.'))) {
           // This message is added in handleConnectionError, but ensuring resilience here
           logDebug("Ending conversation with error flag, adding general error message if needed.");
       }
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
    messages: chatState.messages, // Keep existing messages
    loading: false,
    stage: "welcome" // Move to welcome stage to allow starting a new conversation
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
    // Check if the new ID is different from the current one, or if we're on the first attempt
  } while (newId === sessionId && attempt <= maxAttempts && attempt > 1);

  if (attempt <= maxAttempts && newId !== sessionId) {
    logDebug(`Generated new session ID: ${newId}`);
    sessionId = newId;
    return newId;
  } else {
    logDebug("Retaining old session ID as new one was not generated or was identical after attempts.");
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

    // Remove previous retry messages
    chatState.messages = chatState.messages.filter(msg =>
      !(typeof msg.content === 'string' && msg.content.includes('Connection issue. Retrying in'))
    );
    // Use spread operator to trigger Svelte reactivity if needed, though filter already creates new array
    // chatState.messages = [...chatState.messages];

    addMessage(
      "assistant",
      `Connection issue. Retrying in ${delayInSeconds} ${secondsText}... (Attempt ${nextRetryCount} of ${maxRetries})`
    );

    const timeoutId = setTimeout(() => {
      logDebug(`Retrying connection (Attempt ${nextRetryCount})`);
      loadingState = "connecting";
      // Use the newSessionId if provided, otherwise use the component's current sessionId
      fetchDataFromN8n(period, newSessionId);
    }, delay);

    retryTimeoutId = timeoutId;
  } else {
    logError("Connection failed after max retries", { userId, patientId, sessionId });
    isServiceAvailable = false; // Mark service as unavailable

    // Remove previous retry messages before adding the final failure message
     chatState.messages = chatState.messages.filter(msg =>
      !(typeof msg.content === 'string' && msg.content.includes('Connection issue. Retrying in'))
    );


    addMessage(
      "assistant",
      "Unable to connect to the Health Assistant service after multiple attempts. Please try again later."
    );

    chatState = {
      ...chatState,
      loading: false,
      stage: "error" // Move to error stage to show retry button
    };
    loadingState = "idle";
  }
};

const handleConnectionError = (error: string) => {
  logError("Handling connection error:", { error, userId, patientId, sessionId, retryCount, maxRetries, isServiceAvailable });

  if (!isServiceAvailable) {
      logDebug("Service already marked as unavailable, skipping retry/end.");
      // Avoid double error messages or ending the conversation twice
      return;
  }

  if (retryCount < maxRetries) {
    logDebug(`Attempt ${retryCount + 1}/${maxRetries} failed, initiating retry`);
    // Pass the *current* sessionId during retries for the *same* attempt sequence
    retryWithBackoff(selectedPeriod, sessionId);
    // The retry logic will update state and add messages
  } else {
    logError("Max retries reached, marking service unavailable and ending conversation.");
    isServiceAvailable = false; // Mark service as unavailable

     // Remove any lingering retry messages before final error
     chatState.messages = chatState.messages.filter(msg =>
      !(typeof msg.content === 'string' && msg.content.includes('Connection issue. Retrying in'))
    );


    addMessage(
      "assistant",
      "The connection to the Health Assistant service was lost. The conversation has ended. Thank you for using Teleme AI."
    );

    endConversation(true); // End the conversation due to terminal error
    loadingState = "idle";
  }
};

const fetchDataFromN8n = async (period = 1, sessionOverrideId?: string) => {
  // Use sessionOverrideId if provided (e.g., for new session on retry/restart), otherwise use current sessionId
  const usedSessionId = sessionOverrideId || sessionId;
  logDebug("Fetching data from n8n", { period, patientId, sessionId: usedSessionId });
  recordActivity();

  // Reset retry count only if this is NOT a continuation of a retry sequence
  // If sessionOverrideId is provided, it implies a *new* attempt after error/retry exhausted or explicit restart
  if (sessionOverrideId) {
      retryCount = 0; // Reset retry count for a new session attempt
      logDebug("Resetting retry count for new session attempt.");
  } else {
      // This call is part of an existing flow or a retry sequence itself
      // retryCount is managed by retryWithBackoff before calling this
      logDebug(`Continuing with retry count: ${retryCount}`);
  }


  // Clear any previous "Retrying in..." messages at the start of a fetch attempt
  chatState.messages = chatState.messages.filter(msg =>
    !(typeof msg.content === 'string' && msg.content.includes('Connection issue. Retrying in'))
  );
  chatState.messages = [...chatState.messages]; // Ensure reactivity

  loadingState = "connecting";
  chatState.loading = true;
  isServiceAvailable = true; // Assume available at start of fetch attempt

  // Add user message only if not already present (e.g., not a retry sequence)
  // Or if this is the first attempt (retryCount === 0) AND not explicitly starting a new session after error (sessionOverrideId is undefined)
  const periodText = period === 1 ? "1 month" : period === 3 ? "3 months" : "6 months";
  const userMsgContent = `Summarize health tracker data for ${periodText}.`;

  const lastMessage = chatState.messages[chatState.messages.length - 1];
   if (!lastMessage || typeof lastMessage.content !== 'string' || !lastMessage.content.includes(userMsgContent)) {
      addMessage("user", userMsgContent);
  } else {
      logDebug("User message already present for this request.");
  }


  try {
    loadingState = "processing";

    const message = `Summarize health tracker data for ${periodText}.`; // Re-use message for service call
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
      // This case might indicate a network issue before the service responded
      handleConnectionError("No response received from service.");
    } else if (result.success) {
      isServiceAvailable = true;
      retryCount = 0; // Reset retry count on successful response

      let messageContent: string | object | null = null;
      if (typeof result.data === "string" && result.data.trim() !== "") {
        messageContent = result.data.trim();
      } else if (typeof result.data === "object" && result.data !== null && Object.keys(result.data).length > 0) {
        messageContent = result.data;
      }

      loadingState = "finalizing";

      if (messageContent === null || (typeof messageContent === "string" && messageContent === "")) {
        logError("Empty or null response data from service", { data: result.data, sessionId: usedSessionId });
        addMessage(
          "assistant",
          "Sorry, I couldn't generate a summary for the selected period. Please try another duration or try again later."
        );
         chatState.stage = "post_response"; // Allow retry via post-response options or new selection
      } else {
        addMessage("assistant", messageContent);
         chatState.stage = "post_response"; // Move to post-response stage on success
      }


      chatState.loading = false;
      loadingState = "idle";
    } else {
      // result.success is false, indicating an error from the service itself
      logError("Service reported an error", { error: result.error, sessionId: usedSessionId, data: result.data });
      // Service-side errors typically shouldn't trigger connection retries
      // Handle as a non-retryable service error, prompt user to retry or reselect
      isServiceAvailable = true; // Service is reachable but reported an error
      retryCount = 0; // Reset retry count

      addMessage(
          "assistant",
          `The service returned an error: ${result.error || "Unknown service error"}. Please try again.`
      );
       chatState.loading = false;
       chatState.stage = "post_response"; // Allow user to reselect or ask again
       loadingState = "idle";
    }
  } catch (error: unknown) {
    logError("Caught exception during fetchDataFromN8n:", error);

    const errorMessage = error instanceof Error && error.message ? error.message.toLowerCase() : '';

    // Check if the service was explicitly marked unavailable (e.g., by handleConnectionError)
    // This prevents double-handling errors if handleConnectionError was already called via result === null
    if (!isServiceAvailable && retryCount >= maxRetries) {
         logDebug("Caught exception but service already marked unavailable after max retries. Skipping.");
         return;
    }


    if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('connection') || errorMessage.includes('failed to fetch')) {
      handleConnectionError("Network connection issue. Please check your internet connection.");
    } else if (errorMessage.includes('abort') || errorMessage.includes('aborted')) {
       // This is likely the timeout aborting the fetch request
       handleConnectionError("Request timed out.");
    }
    else if (errorMessage.includes('unauthorized') || errorMessage.includes('auth') || errorMessage.includes('forbidden')) {
      // Authentication/Authorization errors are usually not retryable this way
      logError("Authentication/Authorization error", { error });
      isServiceAvailable = false;
      retryCount = maxRetries; // Force immediate failure state
      handleConnectionError("Authentication error. Please try logging in again.");
    } else if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
       logError("Rate limit error", { error });
       // Rate limit might be temporary, could implement a specific delay before retrying
       // For now, treat as a temporary service issue that might benefit from a retry
       handleConnectionError("Service is experiencing high load. Please try again in a few minutes.");
    }
    else {
      // Catch all other errors and handle as connection errors with retry
      handleConnectionError(error instanceof Error ? error.message : "An unknown error occurred");
    }
  }
};

const startNewConversation = () => {
  logDebug("Starting new conversation");
  recordActivity();
  isServiceAvailable = true;
  retryCount = 0;
   if (retryTimeoutId) {
      clearTimeout(retryTimeoutId);
      retryTimeoutId = null;
    }
  chatState = {
    messages: [],
    loading: false,
    stage: "date_selection"
  };
  regenerateSessionId(); // Generate a new session ID for the new conversation
  addMessage("assistant", "Please select a date range:");
  loadingState = "idle";
};

onMount(() => {
  if (!initialFetchDone) {
    initialFetchDone = true;
    addMessage("assistant", "Please select a date range:");
  }

  const trackActivity = () => recordActivity();
  // Add event listeners for user activity to reset the inactivity timer
  document.addEventListener("mousedown", trackActivity);
  document.addEventListener("keypress", trackActivity);
  document.addEventListener("touchstart", trackActivity);
  // Add scroll listener to track if user scrolls away
  chatContainerRef?.addEventListener("scroll", handleScrollEvent);


  // Return cleanup function that runs when the component is destroyed
  return () => {
    logDebug("Component onDestroy cleanup");
    if (inactivityTimerId) clearInterval(inactivityTimerId);
    if (retryTimeoutId) clearTimeout(retryTimeoutId);
    if (n8nService?.cleanup) n8nService.cleanup(); // Assuming n8nService has a cleanup method

    // Remove event listeners
    document.removeEventListener("mousedown", trackActivity);
    document.removeEventListener("keypress", trackActivity);
    document.removeEventListener("touchstart", trackActivity);
    chatContainerRef?.removeEventListener("scroll", handleScrollEvent);
  };
});

// Reactive block to manage the inactivity timer
$: {
  // Only start the timer if not in "welcome" stage (initial state) and not currently loading
  if (chatState.stage !== "welcome" && !chatState.loading) {
    // Clear any existing timer before setting a new one
    if (inactivityTimerId) {
      clearInterval(inactivityTimerId);
      inactivityTimerId = null;
    }

    // Calculate the inactivity limit in milliseconds
    const TIMEOUT_MINUTES = Number(PUBLIC_HEALTH_TRACKER_TIMEOUT) || 15; // Default to 15 mins if env var is invalid/missing
    const inactivityLimit = TIMEOUT_MINUTES * 60 * 1000;
    logDebug(`Setting inactivity timer for ${TIMEOUT_MINUTES} minutes (${inactivityLimit} ms)`);

    // Set a new interval timer
    // Check inactivity every 60 seconds (60000 ms)
    inactivityTimerId = setInterval(() => {
      const inactiveTime = Date.now() - lastActivity;
      logDebug(`Checking inactivity: ${inactiveTime} ms inactive (Limit: ${inactivityLimit} ms)`);
      if (inactiveTime >= inactivityLimit) {
        logDebug("Inactivity limit reached, ending conversation.");
        // Add a message informing the user why the chat ended
        addMessage(
          "assistant",
          "The conversation has been automatically ended due to inactivity. Thank you for using Teleme AI."
        );
        endConversation(); // End the conversation
      }
    }, 60000); // Check every minute
  } else {
    // If in welcome stage or loading, ensure the inactivity timer is cleared
    if (inactivityTimerId) {
      logDebug("Clearing inactivity timer (stage is welcome or loading).");
      clearInterval(inactivityTimerId);
      inactivityTimerId = null;
    }
  }
}

// Reactive block to scroll to the bottom after messages update
// Use tick() to wait for the DOM to update after messages change
$: {
  // Trigger scroll only when messages change AND the last message is from the user OR it's the initial state (0 messages)
  const lastMessage = chatState.messages[chatState.messages.length - 1];
  if (chatState.messages.length === 0 || (lastMessage && lastMessage.role === "user") || !chatState.loading) {
    // Using tick() ensures the scroll happens *after* Svelte has rendered the new messages
    tick().then(() => {
       // Only scroll if the component is mounted and refs are available
      if (chatEndRef && chatContainerRef) {
         logDebug("Scrolling to bottom after state update.");
         scrollToBottom();
         // Reset scrolled away state after scrolling to bottom automatically
         isScrolledAway = false;
      } else {
          logDebug("Refs not available for scrolling.");
      }
    }).catch(err => {
      logError("Error during tick or scroll:", err);
    });
  } else {
      logDebug("Not scrolling: Assistant message received while loading, or no new messages.");
  }
}

const handleScrollEvent = () => {
  if (!chatContainerRef) {
      isScrolledAway = false; // Cannot determine scroll state without ref
      return;
  }
  const { scrollTop, scrollHeight, clientHeight } = chatContainerRef;
  // Determine if the user has scrolled away from the bottom (within 50px of the bottom)
  const threshold = 50; // px
  const isAtOrNearBottom = scrollHeight - scrollTop - clientHeight <= threshold;

  // Update the isScrolledAway state only if it changes
  // isScrolledAway should be true when NOT at the bottom
  const shouldBeScrolledAway = !isAtOrNearBottom;

  if (isScrolledAway !== shouldBeScrolledAway) {
    logDebug(`Scroll state changed: isScrolledAway = ${shouldBeScrolledAway}`);
    isScrolledAway = shouldBeScrolledAway;
  }
};

const scrollToBottom = () => {
   logDebug("Attempting to scroll to bottom.");
   if (chatEndRef) {
     chatEndRef.scrollIntoView({ behavior: "smooth" });
     isScrolledAway = false; // Always set to false after manual scroll
   } else {
     logDebug("chatEndRef not available for scrollToBottom.");
   }
};

const handleDateRangeSelection = (option: string) => {
  logDebug(`Date range selected: ${option}`);
  recordActivity();
  let period = 1;
  if (option === "1 Month") period = 1;
  else if (option === "3 Months") period = 3;
  else if (option === "6 Months") period = 6;
  selectedPeriod = period;
  // Start fetching data for the selected period
  fetchDataFromN8n(period);
};

const handlePostResponseOption = (id: string) => { // Changed parameter name to id to match OptionsButtons event
  logDebug(`Post-response option selected: ${id}`);
  recordActivity();

  // Map id back to original option name or handle directly
  if (id === "ask") {
    chatState.stage = "question";
    // Add a message prompting the user for their question
    // Check if the last message is already this prompt
     const lastMsg = chatState.messages[chatState.messages.length - 1];
     if (!(lastMsg?.role === 'assistant' && typeof lastMsg.content === 'string' && lastMsg.content.includes('What would you like to ask?'))) {
         addMessage("assistant", "What would you like to ask?");
     }
  } else if (id === "reselect") {
    chatState.stage = "date_selection";
     // Check if the last message is already this prompt
     const lastMsg = chatState.messages[chatState.messages.length - 1];
     if (!(lastMsg?.role === 'assistant' && typeof lastMsg.content === 'string' && lastMsg.content.includes('Please select a date range:'))) {
         addMessage("assistant", "Please select a date range:");
     }
  } else if (id === "end") {
    endConversation(); // End the conversation
  }
};

const handleSendQuestion = async (question: string) => {
  logDebug(`Sending question: ${question.substring(0, 50)}...`);
  recordActivity();
  if (!question.trim()) {
      logDebug("Ignoring empty question.");
      // Optionally add a message asking user to enter text
      return;
  }
  chatState.loading = true;
  loadingState = "processing"; // Set loading state for sending question

  // Add user's question to the chat messages
  addMessage("user", question);

  try {
    // Call the service to send the message/question
    const result = await n8nService.sendMessage(
      sessionId,
      question,
      userId,
      "health_tracker_summary", // Assuming the context remains health_tracker_summary
      patientId
    );

    loadingState = "analyzing"; // Transition loading state

    if (result?.success) {
      isServiceAvailable = true;
      retryCount = 0; // Reset retry count on success

      let messageContent: string | object | null = null;
      if (typeof result.data === "string" && result.data.trim() !== "") {
        messageContent = result.data.trim();
      } else if (typeof result.data === "object" && result.data !== null && Object.keys(result.data).length > 0) {
        messageContent = result.data;
      }

      loadingState = "finalizing"; // Transition loading state

      if (messageContent === null || (typeof messageContent === "string" && messageContent === "")) {
        logError("Empty or null response data from service for question", { data: result.data, sessionId });
        addMessage(
          "assistant",
          "Sorry, I couldn't process that question. Please try asking something else or try again later."
        );
      } else {
        addMessage("assistant", messageContent);
      }

      chatState.loading = false;
      chatState.stage = "post_response"; // Return to post-response stage
      loadingState = "idle";
    } else {
       // Service reported an error
       logError("Service reported an error for question:", { error: result?.error, sessionId, data: result?.data });
       isServiceAvailable = true; // Service is reachable but reported an error
       retryCount = 0; // Reset retry count

       addMessage(
          "assistant",
          `The service returned an error while processing your question: ${result?.error || "Unknown service error"}. Please try asking something else.`
       );
       chatState.loading = false;
       chatState.stage = "post_response"; // Allow user to reselect or ask again
       loadingState = "idle";
    }
  } catch (error: unknown) {
    logError("Caught exception during handleSendQuestion:", error);

    // Similar error handling as fetchDataFromN8n, but likely no retries for sendMessage errors
    // as it's typically user-initiated and a single request. Treat as a non-retryable error
    // for this specific interaction.
    const errorMessage = error instanceof Error && error.message ? error.message.toLowerCase() : '';
    let userFacingErrorMessage = "An unknown error occurred while processing your question.";

     if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('connection') || errorMessage.includes('failed to fetch')) {
      userFacingErrorMessage = "Network connection issue while sending your question. Please check your internet connection and try asking again.";
    } else if (errorMessage.includes('abort') || errorMessage.includes('aborted')) {
       userFacingErrorMessage = "Request timed out while sending your question. Please try again.";
    } else if (errorMessage.includes('unauthorized') || errorMessage.includes('auth') || errorMessage.includes('forbidden')) {
      userFacingErrorMessage = "Authentication error. Please try logging in again.";
    } else if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
      userFacingErrorMessage = "Service is experiencing high load. Please try again in a few minutes.";
    } else {
      userFacingErrorMessage = `An error occurred: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`;
    }

    addMessage("assistant", userFacingErrorMessage);

    chatState.loading = false;
    chatState.stage = "post_response"; // Allow user to reselect or ask again
    isServiceAvailable = false; // Mark service potentially unavailable after a hard error
    loadingState = "idle";
  }
};


// Helper function to render the loading indicator HTML string
const renderLoadingIndicator = () => {
  const stateText =
      loadingState === "connecting" ? "Connecting" :
      loadingState === "processing" ? "Processing data" :
      loadingState === "analyzing" ? "Analyzing results" :
      loadingState === "finalizing" ? "Preparing response" :
      "Processing";

  const stateIcon =
      loadingState === "connecting" ? "🔄" :
      loadingState === "processing" ? "⚙️" :
      loadingState === "analyzing" ? "🔍" :
      loadingState === "finalizing" ? "📊" : ""; // No icon for generic "Processing"

  return `
    <div class="thinking-loader">
      <div class="thinking-inline">
        <span class="thinking-text flex items-center">
          ${stateText}
          <span class="ml-2">
            ${stateIcon}
          </span>
          <div class="thinking-dots-inline ml-1">
            <span></span><span></span><span></span>
          </div>
        </span>
      </div>
    </div>
  `;
};
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
              }) as msg}
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
