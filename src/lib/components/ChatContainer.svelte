<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { v7 } from 'uuid';
  import ChatInput from './ChatInput.svelte';
  import { menuConfig } from '$lib/config';
  import type { OptionsButtonType } from '$lib/types';
  import { n8nService } from '$lib/services/n8nService';
  import { ActivityTracker, shouldAddConnectionErrorMessage } from '$lib/utils/activityUtils';
  import { parseAIMessageContent } from '$lib/utils/markdownParser';
  import {
    TIMEOUTS,
    ENDPOINTS,
    CONNECTION_CHECK_TIMEOUT,
    UI_TEXT,
    MAX_QUESTION_LENGTH
  } from '$lib/config/chatConfig';
  import type { ChatState, Message, Params } from '$lib/types';

  console.log('MAX_QUESTION_LENGTH imported as:', MAX_QUESTION_LENGTH);

  // Common components
  import ConnectionStatusBanner from './common/ConnectionStatusBanner.svelte';
  import MessageList from './common/MessageList.svelte';
  import LoadingIndicator from './common/LoadingIndicator.svelte';
  import ChatOptions from './common/ChatOptions.svelte';
  import ScrollToBottomButton from './common/ScrollToBottomButton.svelte';
  import WelcomeScreen from './common/WelcomeScreen.svelte';

  export let params: Params | undefined = undefined;
  export let onRestartConversation: () => void;

  // State
  let chatState: ChatState = {
    messages: [],
    loading: false,
    stage: 'welcome'
  };
  let isConnected = true;
  let durationInput = '12';
  let isScrolledAway = false;
  let durationError: string | null = null;
  // chatInputError variable removed as it was unused

  // Use the MAX_QUESTION_LENGTH from config

  // Activity tracker instance
  let activityTracker: ActivityTracker;

  let inactivityTimerRef: NodeJS.Timeout | undefined;
  let chatEndRef: HTMLDivElement;
  let chatContainer: HTMLDivElement;

  // Scroll to bottom function
  function scrollToBottom() {
    chatEndRef?.scrollIntoView({ behavior: 'smooth' });
  }

  // Function to handle user activity
  function recordActivity() {
    if (activityTracker) {
      activityTracker.recordActivity();
    }
  }

  // Function to handle connection status changes
  function handleConnectionChange(connected: boolean) {
    console.debug(`Connection status changed to: ${connected}`);
    isConnected = connected;

    // If connection restored and we were in a conversation
    if (connected && chatState.stage === 'welcome' && chatState.messages.length > 0) {
      addMessage(
        'assistant',
        'Connection restored! You can continue using the Analytics Assistant.'
      );
      chatState.stage = 'initial';
    }
  }

  // Function to handle inactivity timeout
  function handleInactivityTimeout() {
    console.debug('Inactivity timeout reached');
    endConversationDueToInactivity();
  }

  // Now using the imported shouldAddConnectionErrorMessage utility function from activityUtils.ts

  function addMessage(role: 'user' | 'assistant', content: string) {
    if (content === '[object Object]') {
      content =
        "Sorry, I couldn't process that request due to an unexpected response. Please try again.";
    }

    // Get the last message content for duplicate checking
    const lastMessage = chatState.messages[chatState.messages.length - 1];
    const lastMessageContent = lastMessage ? lastMessage.content : undefined;

    // Prevent adding duplicate connection error messages
    if (role === 'assistant' && !shouldAddConnectionErrorMessage(content, lastMessageContent)) {
      console.debug('Skipping duplicate connection error message');
      return;
    }

    let processedContent = content;

    // Process AI message content with markdown parser
    if (role === 'assistant') {
      processedContent = parseAIMessageContent(processedContent);
    }

    const newMessage: Message = {
      id: v7(),
      role,
      content: processedContent
    };
    chatState.messages = [...chatState.messages, newMessage];
    recordActivity();
  }

  function startConversation() {
    if (chatState.stage === 'welcome' && chatState.messages.length > 0) {
      chatState = {
        messages: [],
        loading: false,
        stage: 'initial'
      };
      onRestartConversation();

      setTimeout(() => {
        addMessage(
          'assistant',
          'Welcome to the Teleme Analytics Assistant. How can I help you with your data analytics today?'
        );
      }, 0);
    } else {
      addMessage(
        'assistant',
        'Welcome to the Teleme Analytics Assistant. How can I help you with your data analytics today?'
      );
      chatState.stage = 'initial';
    }
  }

  // Function to end conversation due to inactivity
  function endConversationDueToInactivity() {
    addMessage(
      'assistant',
      'The conversation has been automatically ended due to inactivity. Thank you for using Teleme Analytics Assistant.'
    );
    chatState = {
      ...chatState,
      stage: 'welcome',
      loading: false
    };

    // Clean up inactivity timer
    if (inactivityTimerRef) {
      clearInterval(inactivityTimerRef);
      inactivityTimerRef = undefined;
    }
    
    // Clean up the activity tracker to stop monitoring events
    if (activityTracker) {
      activityTracker.cleanup();
    }
  }

  function handleInitialOption(buttonId: string) {
    const button = menuConfig.menuButtons.main.find((b) => b.id === buttonId);
    if (!button) return;

    chatState = {
      ...chatState,
      stage: 'asking_duration',
      selectedOption: buttonId
    };

    addMessage('user', button.label);
    addMessage('assistant', 'Please select the duration for analysis:');
  }

  async function handleDurationSubmit() {
    durationError = null; // Clear previous errors
    const duration = parseInt(durationInput, 10);

    // Validate input
    if (isNaN(duration) || !Number.isInteger(duration) || duration < 1 || duration > 60) {
      durationError = 'Please enter a valid whole number between 1 and 60.';
      // Keep loading false if validation fails
      chatState.loading = false;
      return; // Stop execution if validation fails
    }

    chatState.loading = true;

    const option = chatState.selectedOption || 'summarize all data';
    addMessage('user', `Duration: ${duration} months`); // Use validated duration for display
    console.debug('Selected option', {
      option: option.toLowerCase()
    });

    try {
      let action: string = '';
      let action_message: string = '';
      if (option.toLowerCase() === 'summarize') {
        action = 'summarize';
        action_message = `Summarize All Data for ${durationInput} months`;
      } else if (option.toLowerCase() === 'diagnoses') {
        action = 'diagnoses';
        action_message = `Top 20 Diagnoses for ${durationInput} months`;
      } else if (option.toLowerCase() === 'medicines') {
        action = 'medicines';
        action_message = `Top 10 Medicines for ${durationInput} months`;
      }

      console.debug('Action selected', { action });
      console.debug('Action message prepared', { action_message });
      handleAnalyticsQuery(action_message);
    } catch (error) {
      console.error('Error handling option', error);
      addMessage(
        'assistant',
        'An error occurred while processing your request. Please try again. If the problem persists, contact support.'
      );
      chatState.loading = false;
    }
  }

  async function handleAnalyticsQuery(message: string) {
    // Check connection status before attempting the API call
    if (!isConnected) {
      addMessage(
        'assistant',
        'Cannot connect to the service. Please check your network connection and try again later.'
      );
      chatState.loading = false; // Ensure loading is off
      chatState.stage = 'welcome'; // Move to welcome stage so user can restart
      return; // Stop execution if not connected
    }

    chatState.loading = true;

    try {
      // Verify auth token first
      if (!params?.auth_token) {
        throw new Error('Authentication token is required');
      }

      // Verify required params after auth
      if (!params.sessionId || !params.centre_id || !params.centre_name) {
        throw new Error('Session ID, Centre ID, and Centre name are required');
      }

      const result = await n8nService.callWithParams(
        params.sessionId,
        params.centre_id,
        params.centre_name,
        typeof durationInput === 'string' ? parseInt(durationInput, 10) : durationInput,
        message,
        'analytics_chatbot',
        params.is_ngo
      );

      if (!result.success) {
        console.error('Error from n8n service', {
          error: result.error
        });
        addMessage(
          'assistant',
          `Sorry, there was an error: ${result.error || 'An unknown error occurred. Please try again later.'}`
        );
      } else if (result.data) {
        // Check if result.data is a string, otherwise use an error message
        const messageContent =
          typeof result.data === 'string'
            ? result.data
            : 'Sorry, I received an unexpected response format. Please try again.';
        addMessage('assistant', messageContent);
      } else {
        addMessage('assistant', 'No data received from the service.');
      }

      chatState = {
        ...chatState,
        loading: false,
        stage: 'summary'
      };
    } catch (error) {
      console.error('Error handling analytics query', error);
      addMessage(
        'assistant',
        'Sorry, there was an error processing your request. Please try again.'
      );
      chatState.loading = false;
    }
  }

  function handlePostResponseOption(buttonId: string) {
    console.log('Post response option selected:', buttonId);
    const button = menuConfig.menuButtons.conversation.find((b) => b.id === buttonId);
    if (!button) {
      console.error('Button not found in menu config:', buttonId);
      return;
    }

    switch (buttonId) {
      case 'back':
        // Use the reactive assignment to ensure the component updates
        chatState = { ...chatState, stage: 'initial' };
        addMessage('assistant', 'What would you like to do with your data analytics?');
        break;
      case 'end':
        addMessage('assistant', 'Thank you for using our service. The conversation has ended.');
        chatState = { ...chatState, stage: 'welcome' };
        
        // Clean up inactivity timer when user ends conversation manually
        if (inactivityTimerRef) {
          clearInterval(inactivityTimerRef);
          inactivityTimerRef = undefined;
        }
        
        // Clean up the activity tracker when user ends conversation manually
        if (activityTracker) {
          activityTracker.cleanup();
        }
        break;
      case 'question':
        console.log('Setting stage to question');
        // Use the reactive assignment for the question state
        chatState = { ...chatState, stage: 'question' };
        addMessage('assistant', 'What question would you like to ask?');
        console.log('Current stage after update:', chatState.stage);
        break;
    }
  }

  async function handleSendQuestion(question: string) {
    console.log('handleSendQuestion called with:', question.substring(0, 20) + '...');

    // Removed chatInputError assignments as the variable is unused
    // Check for question length
    if (question.length > MAX_QUESTION_LENGTH) {
      console.warn(`Question exceeds max length (${MAX_QUESTION_LENGTH}): ${question}`);
      // Handle the error appropriately, e.g., show a notification, since chatInputError is not displayed
      chatState = { ...chatState, loading: false }; // Ensure loading is off if we return early
      return;
    }

    // Basic validation to disallow SQL keywords and common code patterns
    const disallowedPattern =
      /(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|UNION|JOIN|--|\/\*|<\/?script>|<\/?iframe>|javascript:|eval\s*\(|function\s*\(|\=>|\{|\})/i;

    if (disallowedPattern.test(question)) {
      console.warn(`Question contains disallowed pattern: ${question}`);
      // Handle the error appropriately, e.g., show a notification
      chatState = { ...chatState, loading: false }; // Ensure loading is off
      return; // Stop execution if validation fails
    }

    // Check connection status before attempting the API call
    if (!isConnected) {
      // Check if there's already a connection error message to avoid duplicates
      const connectionErrorMsg =
        'Cannot connect to the service. Please check your network connection and try again later.';
      addMessage('assistant', connectionErrorMsg);
      chatState.loading = false; // Ensure loading is off
      chatState.stage = 'welcome'; // Move to welcome stage so user can restart
      return; // Stop execution if not connected
    }

    chatState.loading = true;
    addMessage('user', question);

    // Wait for the DOM to update after adding the user message, then scroll
    await tick();
    scrollToBottom();

    try {
      // Verify auth token first
      if (!params?.auth_token) {
        throw new Error('Authentication token is required');
      }

      // Verify required params after auth
      if (!params.sessionId || !params.centre_id) {
        throw new Error('Session ID and Centre ID are required');
      }

      const result = await n8nService.callWithParams(
        params.sessionId,
        params.centre_id,
        params.centre_name,
        typeof durationInput === 'string' ? parseInt(durationInput, 10) : durationInput,
        question,
        'analytics_chatbot',
        params.is_ngo
      );

      if (!result.success) {
        console.error('Error from n8n service', {
          error: result.error
        });
        addMessage(
          'assistant',
          `Sorry, there was an error: ${result.error || 'Unknown error occurred'}`
        );
      } else if (result.data) {
        // Check if result.data is a string, otherwise use an error message
        const messageContent =
          typeof result.data === 'string'
            ? result.data
            : 'Sorry, I encountered an error processing that request. Please try again.';
        addMessage('assistant', messageContent);
      } else {
        addMessage('assistant', 'No data received from the service.');
      }

      chatState = {
        ...chatState,
        loading: false,
        stage: 'summary'
      };
    } catch (error) {
      console.error('Error sending question', error);
      addMessage(
        'assistant',
        'An error occurred while processing your question. Please try again. If the problem persists, contact support.'
      );
      chatState.loading = false;
    }
  }

  // afterUpdate hook removed as scrolling is now handled via tick() in handleSendQuestion
  // The previous afterUpdate also handled scrolling when messages were empty or last was user,
  // but scrolling on empty messages seems unnecessary, and scrolling on user messages is
  // now explicitly handled.

  // Effect to check initial connection status on component mount
  onMount(() => {
    let handleScroll: () => void; // Declare outside to make it referenceable in cleanup

    // Add scroll event listener to track scroll position
    if (chatContainer) {
      handleScroll = () => {
        // Assign function to the variable
        const { scrollTop, scrollHeight, clientHeight } = chatContainer;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
        isScrolledAway = !isAtBottom;
      };

      chatContainer.addEventListener('scroll', handleScroll);
    }

    // Log when embed parameters change
    if (params) {
      console.debug('ChatContainer received embed params');
      // Avoid logging sensitive params directly
    }

    // Use centralized config for endpoints and timeouts
    activityTracker = new ActivityTracker({
      timeoutMinutes: TIMEOUTS.analytics,
      connectionCheckEndpoint: ENDPOINTS.analytics,
      connectionCheckTimeout: CONNECTION_CHECK_TIMEOUT,
      onInactivityTimeout: handleInactivityTimeout,
      onConnectionChange: handleConnectionChange,
      logDebug: console.debug,
      logError: console.error
    });

    // Start tracking activity
    activityTracker.startInactivityTimer();
    activityTracker.attachActivityListeners();

    // Initial connection status
    isConnected = activityTracker.getConnectionStatus();

    // Check if we need to show a warning about connection
    if (!isConnected && chatState.messages.length > 0 && chatState.stage !== 'welcome') {
      addMessage(
        'assistant',
        'Warning: Cannot connect to the Analytics service. The chat functionality may be limited until connection is restored.'
      );
      chatState.stage = 'welcome';
    }

    return () => {
      if (activityTracker) {
        activityTracker.cleanup();
      }

      if (chatContainer && handleScroll) {
        // Check if handleScroll was assigned
        chatContainer.removeEventListener('scroll', handleScroll);
      }
    };
  });

  onDestroy(() => {
    if (activityTracker) {
      activityTracker.cleanup();
    }
  });
</script>

<div class="flex flex-col h-full w-full" data-testid="chat-container">
  <!-- Connection status indicator -->
  <ConnectionStatusBanner
    {isConnected}
    serviceType="analytics"
    onRetry={async () => {
      if (activityTracker) {
        const online = await activityTracker.retryConnection();
        if (online) {
          addMessage('assistant', UI_TEXT.connection.restored.analytics);
          if (chatState.stage === 'welcome') {
            chatState.stage = 'initial';
          }
        }
        return online;
      }
      return false;
    }}
  />

  <div
    class="flex-grow overflow-y-auto bg-gradient-to-b-gray-white chat-container custom-scrollbar"
    on:wheel={(e) => e.stopPropagation()}
    bind:this={chatContainer}
  >
    <div class="px-3 md:px-6 lg:px-8 pt-4 pb-16 w-full">
      {#if chatState.messages.length === 0}
        <!-- Welcome screen for empty state -->
        <WelcomeScreen
          title="Teleme Analytics Assistant"
          subtitle="Your intelligent healthcare analytics partner, providing insights from your medical data"
          buttonText="Start New Conversation"
          on:start={startConversation}
        />
      {/if}

      {#if chatState.messages.length > 0}
        <!-- Message list component -->
        <MessageList messages={chatState.messages} userName="You" assistantName="Assistant" />
      {/if}

      {#if !chatState.loading}
        {#if chatState.stage !== 'welcome' && chatState.stage !== 'question'}
          <!-- Options panel using the new ChatOptions component -->
          <ChatOptions
            stage={chatState.stage}
            buttons={chatState.stage === 'initial'
              ? (menuConfig.menuButtons.main as OptionsButtonType[])
              : chatState.stage === 'summary'
                ? (menuConfig.menuButtons.conversation as OptionsButtonType[])
                : []}
            {durationInput}
            {durationError}
            hasMessages={chatState.messages.length > 0}
            loading={chatState.loading}
            on:select={(e) => {
              if (chatState.stage === 'initial') {
                handleInitialOption(e.detail);
              } else if (chatState.stage === 'summary') {
                handlePostResponseOption(e.detail);
              }
            }}
            on:submit={() => handleDurationSubmit()}
          />
        {/if}

        {#if chatState.stage === 'welcome' && chatState.messages.length > 0}
          <div class="flex justify-center mt-6">
            <button
              on:click={() => {
                if (!isConnected && activityTracker) {
                  // Check connection first
                  activityTracker.retryConnection().then((online) => {
                    if (online) {
                      startConversation();
                    }
                  });
                } else {
                  startConversation();
                }
              }}
              class="btn-gradient text-white font-semibold py-3 px-8 rounded-full shadow"
            >
              {isConnected ? 'Start New Conversation' : 'Try Again'}
            </button>
          </div>
        {/if}
      {/if}

      {#if chatState.loading}
        <div class="flex justify-center items-center my-6">
          <LoadingIndicator state="processing" centered={true} />
        </div>
      {/if}
      <div bind:this={chatEndRef}></div>
      <div class="h-20"></div>

      <!-- Scroll to bottom button -->
      <ScrollToBottomButton
        isVisible={isScrolledAway && chatState.messages.length > 0}
        on:scroll={scrollToBottom}
      />
    </div>
  </div>

  <!-- Chat input for question stage -->
  {@html `<script>console.log('Debug stage:', '${chatState.stage}')</script>`}
  {#if chatState.stage === 'question'}
    <div class="w-full border-t border-gray-200 bg-white shadow-md">
      <div class="px-4 md:px-8 lg:px-12 py-3 w-full">
        <ChatInput
          onSendQuestion={handleSendQuestion}
          disabled={chatState.loading}
          maxLength={MAX_QUESTION_LENGTH}
        />
      </div>
    </div>
  {:else}
    <!-- Log when ChatInput is NOT rendered -->
    {@html `<script>console.log('ChatInput not rendered. Current stage:', '${chatState.stage}')</script>`}
  {/if}
</div>
