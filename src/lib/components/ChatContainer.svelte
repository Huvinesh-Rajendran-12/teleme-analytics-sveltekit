<script lang="ts">
  import { onMount, onDestroy, afterUpdate, tick } from 'svelte';
  import { v7 } from 'uuid';
  import ChatMessage from './ChatMessage.svelte';
  import OptionsButtons from './OptionsButtons.svelte';
  import ChatInput from './ChatInput.svelte';
  import { menuConfig } from '$lib/config';
  import type { OptionsButtonType } from '$lib/types';
  import { n8nService } from '$lib/services/n8nService';
  import { checkConnectionStatus } from '$lib/utils/connectionUtils';
  import type { ChatState, Message, Params } from '$lib/types';

  export let params: Params | undefined = undefined;
  export let onRestartConversation: () => void;

  // State
  let chatState: ChatState = {
    messages: [],
    loading: false,
    stage: "welcome",
  };
  let isConnected = true;
  let durationInput = "12";
  let isScrolledAway = false;
  let durationError: string | null = null;
  let chatInputError: string | null = null;

  // Maximum question length allowed
  const MAX_QUESTION_LENGTH = 1000;

  // Inactivity tracker state and refs
  let lastActivity = Date.now();
  let inactivityTimerRef: number | null = null;

  let chatEndRef: HTMLDivElement;
  let chatContainer: HTMLDivElement;

  // Scroll to bottom function
  function scrollToBottom() {
    if (chatEndRef) {
      chatEndRef.scrollIntoView({ behavior: "smooth" });
      isScrolledAway = false;
    }
  }

  function recordActivity() {
    lastActivity = Date.now();
  }

  function addMessage(role: "user" | "assistant", content: string) {
    if (content === "[object Object]") {
      content = "Sorry, I couldn't process that request due to an unexpected response. Please try again.";
    }
    const newMessage: Message = {
      id: v7(),
      role,
      content,
    };
    chatState.messages = [...chatState.messages, newMessage];
    recordActivity();
  }

  function startConversation() {
    if (chatState.stage === "welcome" && chatState.messages.length > 0) {
      chatState = {
        messages: [],
        loading: false,
        stage: "initial",
      };
      onRestartConversation();

      setTimeout(() => {
        addMessage(
          "assistant",
          "Welcome to the Teleme Analytics Assistant. How can I help you with your data analytics today?",
        );
      }, 0);
    } else {
      addMessage(
        "assistant",
        "Welcome to the Teleme Analytics Assistant. How can I help you with your data analytics today?",
      );
      chatState.stage = "initial";
    }
  }

  // Function to end conversation due to inactivity
  function endConversationDueToInactivity() {
    addMessage(
      "assistant",
      "The conversation has been automatically ended due to inactivity. Thank you for using Teleme Analytics Assistant.",
    );
    chatState = {
      ...chatState,
      stage: "welcome",
      loading: false,
    };

    if (inactivityTimerRef) {
      clearInterval(inactivityTimerRef);
    }
  }

  function handleInitialOption(buttonId: string) {
    const button = menuConfig.menuButtons.main.find(
      (b) => b.id === buttonId,
    );
    if (!button) return;

    chatState = {
      ...chatState,
      stage: "asking_duration",
      selectedOption: buttonId,
    };

    addMessage("user", button.label);
    addMessage(
      "assistant",
      "Please select the duration for analysis:",
    );
  }

  async function handleDurationSubmit() {
    durationError = null; // Clear previous errors
    const duration = parseInt(durationInput, 10);

    // Validate input
    if (
      isNaN(duration) ||
      !Number.isInteger(duration) ||
      duration < 1 ||
      duration > 60
    ) {
      durationError = "Please enter a valid whole number between 1 and 60.";
      // Keep loading false if validation fails
      chatState.loading = false;
      return; // Stop execution if validation fails
    }

    chatState.loading = true;

    const option = chatState.selectedOption || "summarize all data";
    addMessage("user", `Duration: ${duration} months`); // Use validated duration for display
    console.debug("Selected option", {
      option: option.toLowerCase(),
    });

    try {
      let action: string = "";
      let action_message: string = "";
      if (option.toLowerCase() === "summarize") {
        action = "summarize";
        action_message = `Summarize All Data for ${durationInput} months`;
      } else if (option.toLowerCase() === "diagnoses") {
        action = "diagnoses";
        action_message = `Top 20 Diagnoses for ${durationInput} months`;
      } else if (option.toLowerCase() === "medicines") {
        action = "medicines";
        action_message = `Top 10 Medicines for ${durationInput} months`;
      }

      console.debug("Action selected", { action });
      console.debug("Action message prepared", { action_message });
      handleAnalyticsQuery(action_message);
    } catch (error) {
      console.error("Error handling option", error);
      addMessage(
        "assistant",
        "An error occurred while processing your request. Please try again. If the problem persists, contact support.",
      );
      chatState.loading = false;
    }
  }

  async function handleAnalyticsQuery(message: string) {
    // Check connection status before attempting the API call
    if (!isConnected) {
      addMessage(
        "assistant",
        "Cannot connect to the service. Please check your network connection and try again later."
      );
      chatState.loading = false; // Ensure loading is off
      return; // Stop execution if not connected
    }

    chatState.loading = true;

    try {
      // Verify auth token first
      if (!params?.auth_token) {
        throw new Error("Authentication token is required");
      }

      // Verify required params after auth
      if (
        !params.sessionId ||
        !params.centre_id ||
        !params.centre_name
      ) {
        throw new Error(
          "Session ID, Centre ID, and Centre name are required",
        );
      }

      const result = await n8nService.callWithParams(
        params.sessionId,
        params.centre_id,
        params.centre_name,
        typeof durationInput === "string"
          ? parseInt(durationInput, 10)
          : durationInput,
        message,
        "analytics_chatbot",
        params.is_ngo,
      );

      if (!result.success) {
        console.error("Error from n8n service", {
          error: result.error,
        });
        addMessage(
          "assistant",
          `Sorry, there was an error: ${result.error || "An unknown error occurred. Please try again later."}`,
        );
      } else if (result.data) {
        // Check if result.data is a string, otherwise use an error message
        const messageContent =
          typeof result.data === "string"
            ? result.data
            : "Sorry, I received an unexpected response format. Please try again.";
        addMessage("assistant", messageContent);
      } else {
        addMessage(
          "assistant",
          "No data received from the service.",
        );
      }

      chatState = {
        ...chatState,
        loading: false,
        stage: "summary",
      };
    } catch (error) {
      console.error("Error handling analytics query", error);
      addMessage(
        "assistant",
        "Sorry, there was an error processing your request. Please try again.",
      );
      chatState.loading = false;
    }
  }

  function handlePostResponseOption(buttonId: string) {
    const button = menuConfig.menuButtons.conversation.find(
      (b) => b.id === buttonId,
    );
    if (!button) return;

    switch (buttonId) {
      case "back":
        chatState.stage = "initial";
        addMessage(
          "assistant",
          "What would you like to do with your data analytics?",
        );
        break;
      case "end":
        addMessage(
          "assistant",
          "Thank you for using our service. The conversation has ended.",
        );
        chatState.stage = "welcome";
        break;
      case "question":
        chatState.stage = "question";
        addMessage(
          "assistant",
          "What question would you like to ask?",
        );
        break;
    }
  }

  async function handleSendQuestion(question: string) {
    chatInputError = null; // Clear previous errors

    // Check for question length
    if (question.length > MAX_QUESTION_LENGTH) {
      chatInputError = `Your question is too long. Please limit your input to ${MAX_QUESTION_LENGTH} characters.`;
      chatState.loading = false;
      return;
    }

    // Basic validation to disallow SQL keywords and common code patterns
    const disallowedPattern =
      /(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|UNION|JOIN|--|\/\*|<\/?script>|<\/?iframe>|javascript:|eval\s*\(|function\s*\(|\=>|\{|\})/i;

    if (disallowedPattern.test(question)) {
      chatInputError = "Please enter only plain text. SQL, code, or special script tags are not allowed.";
      chatState.loading = false; // Ensure loading is off
      return;
    }

    // Check connection status before attempting the API call
    if (!isConnected) {
      addMessage(
        "assistant",
        "Cannot connect to the service. Please check your network connection and try again later."
      );
      chatState.loading = false; // Ensure loading is off
      return; // Stop execution if not connected
    }

    chatState.loading = true;
    addMessage("user", question);

    try {
      // Verify auth token first
      if (!params?.auth_token) {
        throw new Error("Authentication token is required");
      }

      // Verify required params after auth
      if (!params.sessionId || !params.centre_id) {
        throw new Error("Session ID and Centre ID are required");
      }

      const result = await n8nService.callWithParams(
        params.sessionId,
        params.centre_id,
        params.centre_name,
        typeof durationInput === "string"
          ? parseInt(durationInput, 10)
          : durationInput,
        question,
        "analytics_chatbot",
        params.is_ngo,
      );

      if (!result.success) {
        console.error("Error from n8n service", {
          error: result.error,
        });
        addMessage(
          "assistant",
          `Sorry, there was an error: ${result.error || "Unknown error occurred"}`,
        );
      } else if (result.data) {
        // Check if result.data is a string, otherwise use an error message
        const messageContent =
          typeof result.data === "string"
            ? result.data
            : "Sorry, I encountered an error processing that request. Please try again.";
        addMessage("assistant", messageContent);
      } else {
        addMessage(
          "assistant",
          "No data received from the service.",
        );
      }

      chatState = {
        ...chatState,
        loading: false,
        stage: "summary",
      };
    } catch (error) {
      console.error("Error sending question", error);
      addMessage(
        "assistant",
        "An error occurred while processing your question. Please try again. If the problem persists, contact support.",
      );
      chatState.loading = false;
    }
  }

  // Only scroll to bottom on initial load or when user sends a message, not when AI responds
  afterUpdate(() => {
    const lastMessage = chatState.messages[chatState.messages.length - 1];
    if (
      chatState.messages.length === 0 ||
      (lastMessage && lastMessage.role === "user")
    ) {
      scrollToBottom();
      isScrolledAway = false;
    }
  });

  // Effect to check initial connection status on component mount
  onMount(() => {
    // Add scroll event listener to track scroll position
    if (chatContainer) {
      const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = chatContainer;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
        isScrolledAway = !isAtBottom;
      };

      chatContainer.addEventListener("scroll", handleScroll);
    }

    // Log when embed parameters change
    if (params) {
      console.debug("ChatContainer received embed params");
      // Avoid logging sensitive params directly
    }

    // Use the actual N8N API endpoint or configure via an environment variable
    // This should ideally point to a lightweight, always-on endpoint of your backend/service
    const n8nEndpoint = import.meta.env.VITE_N8N_API_URL || '/api/chat'; // Replace with actual endpoint if different

    // Check connection status
    checkConnectionStatus(n8nEndpoint, 5000).then(online => {
      isConnected = online;
      if (!online) {
        console.warn('Initial connection check failed. Service may be unreachable.');
        // Optionally, add a message to the chat here or show a different UI indicator
        // addMessage("assistant", "Warning: Cannot connect to the service. Features may be limited.");
      }
    });

    // Set up inactivity timer 
    inactivityTimerRef = window.setInterval(() => {
      const inactiveTime = Date.now() - lastActivity;
      const TIMEOUT_MINUTES = Number(import.meta.env.VITE_ANALYTICS_CHATBOT_TIMEOUT) || 5; // Default to 5 minutes
      const inactivityLimit = TIMEOUT_MINUTES * 60 * 1000;

      if (inactiveTime >= inactivityLimit && chatState.stage !== "welcome") {
        endConversationDueToInactivity();
      }
    }, 30000); // Check every 30 seconds

    // Global event listeners for activity tracking
    const trackActivity = () => recordActivity();
    document.addEventListener("mousedown", trackActivity);
    document.addEventListener("keypress", trackActivity);
    document.addEventListener("touchstart", trackActivity);

    return () => {
      if (inactivityTimerRef) {
        clearInterval(inactivityTimerRef);
      }
      document.removeEventListener("mousedown", trackActivity);
      document.removeEventListener("keypress", trackActivity);
      document.removeEventListener("touchstart", trackActivity);

      if (chatContainer) {
        chatContainer.removeEventListener("scroll", () => {});
      }
    };
  });

  onDestroy(() => {
    if (inactivityTimerRef) {
      clearInterval(inactivityTimerRef);
    }
  });
</script>

<div class="flex flex-col h-full w-full" data-testid="chat-container">
  <div
    class="flex-grow overflow-y-auto bg-gradient-to-b-gray-white chat-container custom-scrollbar"
    on:wheel={(e) => e.stopPropagation()}
    bind:this={chatContainer}
  >
    <div class="px-3 md:px-6 lg:px-8 pt-4 pb-16 w-full">
      {#if chatState.messages.length === 0}
        <div class="flex flex-col items-center justify-center py-20 w-full">
          <div class="flex flex-col items-center">
            <div class="rounded-full bg-gradient-to-br-blue-teal shadow mb-8">
              <div class="logo-circle flex items-center justify-center text-white text-5xl font-bold">
                T
              </div>
            </div>
            <h2 class="text-3xl font-bold mb-4 text-center gradient-text">
              Teleme Analytics Assistant
            </h2>
            <p class="text-gray-600 mb-8 text-base max-w-xl text-center">
              Your intelligent healthcare analytics partner,
              <br />
              providing insights from your medical data
            </p>
            <div class="flex justify-center">
              <button
                on:click={startConversation}
                class="btn-gradient-large py-3 px-8 rounded-full shadow"
              >
                <div class="flex items-center justify-center">
                  <span class="text-xl">🚀</span>
                  <span class="text-base font-medium mx-2">
                    Start New Conversation
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      {/if}

      {#each chatState.messages as msg (msg.id)}
        <div class="mb-8">
          <div
            class="text-sm mb-1 {msg.role === 'user' ? 'text-right' : 'text-left'}"
          >
            <span class="text-gray-500 font-medium">
              {msg.role === "user" ? "You" : "Assistant"}
            </span>
          </div>
          <ChatMessage message={msg} />
        </div>
      {/each}

      {#if !chatState.loading}
        {#if chatState.stage !== "welcome" && chatState.stage !== "question"}
          {#if chatState.stage === "initial"}
            <div class="mt-4">
              <OptionsButtons
                buttons={menuConfig.menuButtons.main as OptionsButtonType[]}
                on:select={e => handleInitialOption(e.detail)}
              />
            </div>
          {:else if chatState.stage === "asking_duration"}
            <div class="mt-4">
              <div class="flex items-center justify-center">
                <div class="relative mr-3">
                  <input
                    type="number"
                    bind:value={durationInput}
                    min="1"
                    max="60"
                    class="input-number border rounded-lg px-4 py-2 w-24 text-center font-medium {durationError ? 'border-red-500' : 'border-gray-300'}"
                    placeholder="12"
                  />
                </div>
                <button
                  on:click={handleDurationSubmit}
                  class="btn-gradient text-white font-semibold py-2 px-5 rounded-full shadow"
                >
                  <div class="flex items-center justify-center">
                    <span class="text-base">✅</span>
                    <span class="font-medium text-sm mx-1">
                      Submit
                    </span>
                  </div>
                </button>
              </div>
              {#if durationError}
                <div class="text-red-500 text-sm mt-2 text-center">
                  {durationError}
                </div>
              {/if}
            </div>
          {:else}
            <div class="mt-4">
              <OptionsButtons
                buttons={menuConfig.menuButtons.conversation as OptionsButtonType[]}
                on:select={e => handlePostResponseOption(e.detail)}
              />
            </div>
          {/if}
        {/if}

        {#if chatState.stage === "welcome" && chatState.messages.length > 0}
          <div class="flex justify-center mt-6">
            <button
              on:click={startConversation}
              class="btn-gradient text-white font-semibold py-3 px-8 rounded-full shadow"
            >
              Start New Conversation
            </button>
          </div>
        {/if}
      {/if}

      {#if chatState.loading}
        <div class="flex justify-center items-center my-6">
          <div class="thinking-loader">
            <div class="thinking-inline">
              <span class="thinking-text">Thinking</span>
              <div class="thinking-dots-inline">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>
      {/if}
      <div bind:this={chatEndRef}></div>
      <div class="h-20"></div>

      {#if isScrolledAway && chatState.messages.length > 0}
        <button
          on:click={scrollToBottom}
          class="fixed bottom-20 right-6 bg-gradient-to-br from-blue-500 to-teal-400 text-white p-3 rounded-full shadow-lg transition-all duration-300 hover:shadow-xl scroll-to-bottom-button"
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
              stroke-width={2}
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
          on:sendQuestion={e => handleSendQuestion(e.detail)}
          disabled={chatState.loading}
          error={chatInputError}
          maxLength={MAX_QUESTION_LENGTH}
        />
      </div>
    </div>
  {/if}
</div>