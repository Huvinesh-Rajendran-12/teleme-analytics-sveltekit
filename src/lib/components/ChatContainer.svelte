<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { v7 } from 'uuid';
  import ChatInput from './ChatInput.svelte';
  import { menuConfig } from '$lib/config';
  import type { OptionsButtonType } from '$lib/types';
  import {
    n8nService,
    UserCancelledError,
    RequestTimeoutError,
    NetworkConnectionError,
    HttpError
  } from '$lib/services/n8nService';
  import { ActivityTracker, shouldAddConnectionErrorMessage } from '$lib/utils/activityUtils';
  import { connectionStatus } from '$lib/stores/connectionStore';
  import StopProcessingButton from './common/StopProcessingButton.svelte';
  // import { parseAIMessageContent } from '$lib/utils/markdownParser';
  // Commented out unused import
  import {
    TIMEOUTS,
    ENDPOINTS,
    CONNECTION_CHECK_TIMEOUT,
    UI_TEXT,
    MAX_QUESTION_LENGTH
  } from '$lib/config/chatConfig';
  import type { ChatState, Message, Params } from '$lib/types';

  console.debug('MAX_QUESTION_LENGTH imported as:', MAX_QUESTION_LENGTH);

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
  let isConnected = true; // Keep for backward compatibility
  let isProcessing = false; // Track if we're waiting for a response
  let abortCheckTimeoutId: number | null = null; // For the abort check timeout

  // Subscribe to the connection store
  $: {
    if ($connectionStatus.isConnected !== isConnected) {
      // Update local state when store changes
      isConnected = $connectionStatus.isConnected;
      handleConnectionChange(isConnected);
    }
  }
  let durationInput = '12';
  let isScrolledAway = false;
  let durationError: string | null = null;
  // chatInputError variable removed as it was unused

  // Use the MAX_QUESTION_LENGTH from config

  // Activity tracker instance
  let activityTracker: ActivityTracker;

  // We use ActivityTracker for managing inactivity timeout - no need for separate timer refs
  let chatEndRef: HTMLDivElement;
  let chatContainer: HTMLDivElement;

  // Scroll to bottom function
  function scrollToBottom() {
    chatEndRef?.scrollIntoView({ behavior: 'smooth' });
  }

  // Function to initialize the activity tracker
  function initActivityTracker() {
    // Clean up any existing tracker
    if (activityTracker) {
      activityTracker.cleanup();
    }

    // Create and initialize a new activity tracker
    activityTracker = new ActivityTracker({
      timeoutMinutes: TIMEOUTS.analytics,
      connectionCheckEndpoint: ENDPOINTS.analytics,
      connectionCheckTimeout: CONNECTION_CHECK_TIMEOUT,
      connectionCheckInterval: 30000, // Check every 30 seconds
      serviceType: 'analytics', // Identify this service
      onInactivityTimeout: handleInactivityTimeout,
      onConnectionChange: handleConnectionChange,
      logDebug: console.debug,
      logError: console.error,
      pauseOnInvisible: false // DO NOT pause inactivity timer when tab loses focus
    });

    // Start tracking activity
    activityTracker.startInactivityTimer();

    // Attach chat container for specific tracking (scroll events) if available
    if (chatContainer) {
      activityTracker.attachElementListener(chatContainer);
    }

    console.debug('Activity tracker initialized');
  }

  // Function to handle user activity
  function recordActivity() {
    if (activityTracker) {
      activityTracker.recordActivity();
    }
  }

  // Track last connection state to prevent duplicate messages
  let lastConnectionState: boolean = true;

  // Function to handle connection status changes
  function handleConnectionChange(connected: boolean) {
    console.debug(`Connection status changed to: ${connected}`);

    // Only process if there's an actual state change
    if (connected !== lastConnectionState) {
      isConnected = connected;
      lastConnectionState = connected;

      // If connection restored and we were in a conversation
      if (connected && chatState.stage === 'welcome' && chatState.messages.length > 0) {
        addMessage(
          'assistant',
          'Connection restored! You can continue using the Analytics Assistant.'
        );
        chatState.stage = 'initial';
      }
    } else {
      console.debug('Connection state unchanged, skipping notification');
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

    // Prevent adding duplicate connection-related messages (both errors and restoration messages)
    if (role === 'assistant' && !shouldAddConnectionErrorMessage(content, lastMessageContent)) {
      console.debug('Skipping duplicate connection message');
      return;
    }

    // We'll let ChatMessage.svelte handle the markdown parsing
    // This prevents double-parsing and preserves whitespace correctly
    const newMessage: Message = {
      id: v7(),
      role,
      content: content // Pass the raw content directly
    };
    chatState.messages = [...chatState.messages, newMessage];
    recordActivity();
  }

  function startConversation() {
    console.debug('Starting conversation', {
      currentStage: chatState.stage,
      messagesCount: chatState.messages.length
    });

    if (chatState.stage === 'welcome' && chatState.messages.length > 0) {
      // Explicitly type newState to match ChatState structure and literal types
      const newState: ChatState = {
        messages: [],
        loading: false,
        stage: 'initial' // This is a valid literal for ChatState['stage']
      };
      console.debug('Stage transition in startConversation: full reset', {
        from: chatState.stage,
        to: 'initial'
      });
      chatState = newState; // This assignment is now valid because newState is typed as ChatState
      onRestartConversation();

      // Initialize/re-initialize the activity tracker for the new conversation
      initActivityTracker();
      console.debug('Activity tracker initialized for new conversation');

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
      console.debug('Stage transition in startConversation: simple transition', {
        from: chatState.stage,
        to: 'initial'
      });
      // Directly assigning the literal string 'initial' also works
      chatState.stage = 'initial';

      // Also record activity for this case
      if (activityTracker) {
        activityTracker.recordActivity();
      }
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

    // Don't clean up the tracker completely, just reset the timer
    // This allows the timer to remain active even at the welcome screen
    if (activityTracker) {
      // Record activity to reset the timer
      activityTracker.recordActivity();
    }
  }

  function handleInitialOption(buttonId: string) {
    console.debug('Initial option selected:', buttonId);
    const button = menuConfig.menuButtons.main.find((b) => b.id === buttonId);
    if (!button) {
      console.error('Button not found in menu config:', buttonId);
      return;
    }

    console.debug('Stage transition in handleInitialOption', {
      from: chatState.stage,
      to: 'asking_duration',
      button: button.label,
      icon: button.icon,
      selectedOption: buttonId
    });

    // Directly update chatState with the literal 'asking_duration'
    // This helps TypeScript infer the correct literal type for the 'stage' property
    chatState = {
      ...chatState,
      stage: 'asking_duration',
      selectedOption: buttonId
    };

    addMessage('user', button.label);
    addMessage('assistant', 'Please select the duration for analysis:');
  }

  // Function to stop processing
  function stopProcessing() {
    if (isProcessing) {
      console.debug('stopProcessing called - aborting request');
      // Abort the current request
      const stopped = n8nService.stopCurrentRequest();
      if (stopped) {
        console.debug('Request aborted successfully, userInitiatedAbort flag set to:', n8nService.isUserInitiatedAbort());
        isProcessing = false;
        chatState.loading = false;
        // Add the message immediately so it appears right away
        addMessage(
          'assistant',
          'Processing stopped. Is there anything else you would like to know?'
        );
        // Move to summary stage to show options
        chatState.stage = 'summary';

        // Clear any existing timeout for the Abort error check
        if (abortCheckTimeoutId) {
          clearTimeout(abortCheckTimeoutId);
        }

        // We need to reset the user abort flag with a longer delay
        // to ensure it's still set when the service returns its response
        abortCheckTimeoutId = window.setTimeout(() => {
          console.debug('Timeout reached - resetting userInitiatedAbort flag');
          n8nService.resetUserInitiatedAbort();
          abortCheckTimeoutId = null;
        }, 3000);
      }
    }
  }

  async function handleDurationSubmit(durationString: string) {
    durationError = null; // Clear previous errors
    const duration = parseInt(durationString, 10);

    // Validate input
    if (isNaN(duration) || !Number.isInteger(duration) || duration < 1 || duration > 60) {
      durationError = 'Please enter a valid whole number between 1 and 60.';
      // Keep loading false if validation fails
      chatState.loading = false;
      return; // Stop execution if validation fails
    }

    // Check for required parameters before proceeding
    if (!params?.sessionId || !params?.centre_id || !params?.centre_name) {
      console.warn('Missing required parameters for analytics:', {
        sessionId: params?.sessionId ? 'present' : 'missing',
        centre_id: params?.centre_id ? 'present' : 'missing',
        centre_name: params?.centre_name ? 'present' : 'missing',
        auth_token: params?.auth_token ? 'present' : 'missing'
      });

      addMessage(
        'assistant',
        'Unable to process request: Missing required session information. Please refresh the page and try again.'
      );
      chatState.loading = false;
      return;
    }

    chatState.loading = true;
    isProcessing = true;

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
        action_message = `Summarize All Data for ${duration} months`;
      } else if (option.toLowerCase() === 'diagnoses') {
        action = 'diagnoses';
        action_message = `Top 20 Diagnoses for ${duration} months`;
      } else if (option.toLowerCase() === 'medicines') {
        action = 'medicines';
        action_message = `Top 10 Medicines for ${duration} months`;
      }

      console.debug('Action selected', { action });
      console.debug('Action message prepared', { action_message });
      console.debug('Params available for analytics', {
        sessionId: params.sessionId.substring(0, 8) + '...',
        centre_id: params.centre_id,
        auth_token: params.auth_token ? 'present' : 'missing'
      });
      handleAnalyticsQuery(action_message);
    } catch (error) {
      console.error('Error handling option', error);

      // Don't add a message if this was caused by user-initiated abort
      if (!n8nService.isUserInitiatedAbort()) {
        addMessage(
          'assistant',
          'An error occurred while processing your request. Please try again. If the problem persists, contact support.'
        );
        chatState.loading = false;
      }

      isProcessing = false;

      // Note: Don't reset the user-initiated abort flag here
      // Let the timeout in stopProcessing() handle it
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

    // This check is redundant with the one in handleDurationSubmit, but we keep it for safety
    // and to handle direct calls to handleAnalyticsQuery from other places in the code
    if (!params?.auth_token) {
      console.warn('Missing auth token for analytics query');
      addMessage(
        'assistant',
        'Authentication error: Your session appears to be invalid. Please refresh the page and try again.'
      );
      chatState.loading = false;
      return;
    }

    // Verify required params before API call
    if (!params.sessionId || !params.centre_id || !params.centre_name) {
      console.warn('Missing required parameters for analytics query', {
        sessionId: params?.sessionId ? 'present' : 'missing',
        centre_id: params?.centre_id ? 'present' : 'missing',
        centre_name: params?.centre_name ? 'present' : 'missing'
      });

      addMessage(
        'assistant',
        'Unable to process request: Missing required session information. Please refresh the page and try again.'
      );
      chatState.loading = false;
      return;
    }

    chatState.loading = true;

    try {
      console.debug('Making API call with params', {
        sessionId: params.sessionId.substring(0, 8) + '...',
        centre_id: params.centre_id,
        auth_token_present: params.auth_token ? true : false
      });

      const result = await n8nService.callWithParams(
        params.sessionId,
        params.centre_id,
        params.centre_name,
        typeof durationInput === 'string' ? parseInt(durationInput, 10) : durationInput,
        message,
        'analytics_chatbot',
        params.is_ngo
      );

      // Only process the response if the request wasn't cancelled by the user
      const isAborted = n8nService.isUserInitiatedAbort();
      console.debug('handleAnalyticsQuery response check:', { 
        isAborted, 
        resultSuccess: result.success,
        hasData: !!result.data
      });
      
      if (!isAborted) {
        // Normal error handling
        if (!result.success) {
          console.error('Error from n8n service', {
            error: result.error
          });
          addMessage(
            'assistant',
            `Sorry, there was an error: ${result.error || 'An unknown error occurred. Please try again later.'}`
          );
        }
        // Handle successful responses (result.success is true here)
        else if (
          typeof result.data === 'object' &&
          result.data !== null &&
          'output' in result.data &&
          typeof (result.data as { output: unknown }).output === 'string'
        ) {
          // Expected successful response format { output: string }
          const messageContent = (result.data as { output: string }).output;
          if (messageContent.trim() !== '') {
            addMessage('assistant', messageContent.trim());
          } else {
            console.warn('Received empty message content from service');
            addMessage('assistant', 'No data received from the service.');
          }
        } else {
          // Handle unexpected successful response format or no data
          console.error('Received unexpected data format from service', { data: result?.data });
          addMessage(
            'assistant',
            'Sorry, I received an unexpected response format or no data. Please try again.'
          );
        }

        chatState = {
          ...chatState,
          loading: false,
          stage: 'summary'
        };
      } else {
        console.debug('Skipping response processing - request was aborted by user');
      }
      isProcessing = false;
    } catch (error) {
      // Reset loading and processing state in case of error
      chatState.loading = false;
      isProcessing = false;

      // Handle specific error types from n8nService
      if (error instanceof UserCancelledError) {
        console.debug('Analytics query was cancelled by user');
        // No user-facing error message needed for cancellation
      } else if (error instanceof RequestTimeoutError) {
        console.error('Analytics query timed out', error);
        addMessage(
          'assistant',
          'The request timed out. Please try again.'
        );
      } else if (error instanceof NetworkConnectionError) {
        console.error('Analytics query network error', error);
        addMessage(
          'assistant',
          'Network connection error. Please check your internet connection and try again.'
        );
      } else if (error instanceof HttpError) {
        console.error('Analytics query HTTP error', { status: error.status, message: error.message });
        addMessage(
          'assistant',
          `An API error occurred (${error.status}). Please try again later.`
        );
      } else if (error instanceof Error) {
        console.error('Unhandled analytics query error', error);
        addMessage(
          'assistant',
          `Sorry, an unexpected error occurred: ${error.message}. Please try again.`
        );
      } else {
        console.error('Unknown error handling analytics query', error);
        addMessage(
          'assistant',
          'Sorry, an unknown error occurred. Please try again.'
        );
      }
    }

    // Note: The user-initiated abort flag is reset within the n8nService's _executeFetch method
    // when the fetch promise resolves or rejects after an abort signal.
  }

  function handlePostResponseOption(buttonId: string) {
    console.debug('Post response option selected:', buttonId);
    const button = menuConfig.menuButtons.conversation.find((b) => b.id === buttonId);
    if (!button) {
      console.error('Button not found in menu config:', buttonId);
      return;
    }

    switch (buttonId) {
      case 'back':
        // Use the reactive assignment directly to ensure the component updates
        // This structure can help TypeScript infer the correct literal type for 'stage'
        console.debug('Stage transition in handlePostResponseOption: back button', {
          from: chatState.stage, // Note: this log shows the state *before* the update
          to: 'initial',
          selectedOption: chatState.selectedOption,
          newSelectedOption: undefined
        });
        chatState = {
          ...chatState,
          stage: 'initial', // Ensure this is correctly typed as the literal 'initial'
          selectedOption: undefined // Clear the selected option state
        };
        addMessage('assistant', 'What would you like to do with your data analytics?');
        break;
      case 'end':
        addMessage('assistant', 'Thank you for using our service. The conversation has ended.');
        // Use reactive assignment directly
        chatState = { ...chatState, stage: 'welcome' };

        // Clean up the activity tracker when user ends conversation manually
        if (activityTracker) {
          activityTracker.cleanup();
        }
        break;
      case 'question':
        console.debug('Setting stage to question');
        // Use the reactive assignment directly
        chatState = { ...chatState, stage: 'question' };
        addMessage('assistant', 'What question would you like to ask?');
        console.debug('Current stage after update:', chatState.stage);
        break;
    }
  }

  async function handleSendQuestion(question: string) {
    console.debug('handleSendQuestion called with:', question.substring(0, 20) + '...');

    // Check for question length
    if (question.length > MAX_QUESTION_LENGTH) {
      console.warn(`Question exceeds max length (${MAX_QUESTION_LENGTH}): ${question}`);
      addMessage(
        'assistant',
        `Your question is too long. Please limit your input to ${MAX_QUESTION_LENGTH} characters.`
      );
      chatState = { ...chatState, loading: false }; // Ensure loading is off if we return early
      return;
    }

    // Basic validation to disallow SQL keywords and common code patterns
    const disallowedPattern =
      /(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|UNION|JOIN|--|\/\*|<\/?script>|<\/?iframe>|javascript:|eval\s*\(|function\s*\(|\=>|\{|\})/i;

    if (disallowedPattern.test(question)) {
      console.warn(`Question contains disallowed pattern: ${question}`);
      addMessage(
        'assistant',
        'Please enter only plain text. SQL, code, or special script tags are not allowed.'
      );
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

    // Verify required params before proceeding
    if (!params?.auth_token) {
      console.warn('Missing auth token for question submission');
      addMessage(
        'assistant',
        'Authentication error: Your session appears to be invalid. Please refresh the page and try again.'
      );
      chatState.loading = false;
      return;
    }

    // Verify required params
    if (!params.sessionId || !params.centre_id) {
      console.warn('Missing required parameters for question submission', {
        sessionId: params?.sessionId ? 'present' : 'missing',
        centre_id: params?.centre_id ? 'present' : 'missing'
      });

      addMessage(
        'assistant',
        'Unable to process request: Missing required session information. Please refresh the page and try again.'
      );
      chatState.loading = false;
      return;
    }

    chatState.loading = true;
    isProcessing = true;
    addMessage('user', question);

    // Wait for the DOM to update after adding the user message, then scroll
    await tick();
    scrollToBottom();

    try {
      console.debug('Making API call for question with params', {
        sessionId: params.sessionId.substring(0, 8) + '...',
        centre_id: params.centre_id,
        auth_token_present: params.auth_token ? true : false
      });

      const result = await n8nService.callWithParams(
        params.sessionId,
        params.centre_id,
        params.centre_name,
        typeof durationInput === 'string' ? parseInt(durationInput, 10) : durationInput,
        question,
        'analytics_chatbot',
        params.is_ngo
      );

      // Only process the response if the request wasn't cancelled by the user
      if (!n8nService.isUserInitiatedAbort()) {
        // Normal error handling
        if (!result.success) {
          console.error('Error from n8n service', {
            error: result.error
          });
          addMessage(
            'assistant',
            `Sorry, there was an error: ${result.error || 'Unknown error occurred'}`
          );
        }
        // Handle successful responses
        else if (result.data) {
          // Check if result.data is a string, otherwise use an error message
          const messageContent =
            result.data && typeof result.data.output === 'string'
              ? result.data.output
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
      } else {
        console.debug('Request was cancelled by user, skipping response processing');
      }
      isProcessing = false;
    } catch (error) {
      console.error('Error sending question', error);

      // Don't show errors for user-initiated aborts
      if (!n8nService.isUserInitiatedAbort()) {
        addMessage(
          'assistant',
          'An error occurred while processing your question. Please try again. If the problem persists, contact support.'
        );
        chatState.loading = false;
      }

      isProcessing = false;
    }

    // Note: Don't reset the user-initiated abort flag here  
    // Let the timeout in stopProcessing() handle it
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

    // Initialize the activity tracker
    initActivityTracker();

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

    // Clean up abort check timeout if it exists
    if (abortCheckTimeoutId) {
      clearTimeout(abortCheckTimeoutId);
      abortCheckTimeoutId = null;
    }
  });
</script>

<div class="flex flex-col h-full w-full" data-testid="chat-container">
  <!-- Connection status indicator -->
  <ConnectionStatusBanner
    {isConnected}
    serviceType="analytics"
    useConnectionStore={true}
    onRetry={async () => {
      if (activityTracker) {
        const online = await activityTracker.retryConnection();

        // Only add a message if we're transitioning from offline to online
        if (online && !lastConnectionState) {
          // This will be deduplicated by our shouldAddConnectionErrorMessage function
          addMessage('assistant', UI_TEXT.connection.restored.analytics);

          if (chatState.stage === 'welcome') {
            chatState.stage = 'initial';
          }

          // Update our tracking variable
          lastConnectionState = online;
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
        <MessageList
          messages={chatState.messages}
          userName="You"
          assistantName="Analytics Assistant"
        />
      {/if}

      {#if !chatState.loading}
        {#if chatState.stage !== 'welcome' && chatState.stage !== 'question'}
          <!-- Log which buttons are being passed to ChatOptions -->
          {#if chatState.stage === 'initial'}
            <!-- Initial stage - show main menu buttons -->
            {@const logButtons = () => {
              console.debug(
                'Passing initial menu buttons to ChatOptions:',
                menuConfig.menuButtons.main.map((b) => ({ id: b.id, icon: b.icon, label: b.label }))
              );
              return menuConfig.menuButtons.main;
            }}
            <!-- ChatOptions component with main menu buttons -->
            <ChatOptions
              stage={chatState.stage}
              buttons={logButtons() as OptionsButtonType[]}
              {durationInput}
              {durationError}
              hasMessages={chatState.messages.length > 0}
              loading={chatState.loading}
              {isProcessing}
              on:select={(e) => handleInitialOption(e.detail)}
              on:submit={(e) => handleDurationSubmit(e.detail)}
              on:stop={() => stopProcessing()}
              on:change={(e) => (durationInput = e.detail)}
            />
          {:else if chatState.stage === 'summary'}
            <!-- Summary stage - show conversation buttons -->
            {@const logButtons = () => {
              console.debug(
                'Passing conversation menu buttons to ChatOptions:',
                menuConfig.menuButtons.conversation.map((b) => ({
                  id: b.id,
                  icon: b.icon,
                  label: b.label
                }))
              );
              return menuConfig.menuButtons.conversation;
            }}
            <!-- ChatOptions component with conversation buttons -->
            <ChatOptions
              stage={chatState.stage}
              buttons={logButtons() as OptionsButtonType[]}
              {durationInput}
              {durationError}
              hasMessages={chatState.messages.length > 0}
              loading={chatState.loading}
              {isProcessing}
              on:select={(e) => handlePostResponseOption(e.detail)}
              on:submit={(e) => handleDurationSubmit(e.detail)}
              on:stop={() => stopProcessing()}
              on:change={(e) => (durationInput = e.detail)}
            />
          {:else}
            <!-- Other stages - show empty buttons array -->
            <ChatOptions
              stage={chatState.stage}
              buttons={[]}
              {durationInput}
              {durationError}
              hasMessages={chatState.messages.length > 0}
              loading={chatState.loading}
              {isProcessing}
              on:select={(e) => {
                if (chatState.stage === 'initial') {
                  handleInitialOption(e.detail);
                } else if (chatState.stage === 'summary') {
                  handlePostResponseOption(e.detail);
                }
              }}
              on:submit={(e) => handleDurationSubmit(e.detail)}
              on:stop={() => stopProcessing()}
              on:change={(e) => (durationInput = e.detail)}
            />
          {/if}
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
        <div class="flex flex-col justify-center items-center my-6">
          <LoadingIndicator state="processing" centered={true} />
          <!-- Stop button -->
          <StopProcessingButton
            isVisible={isProcessing}
            variant="default"
            on:stop={stopProcessing}
          />
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
  {#if chatState.stage === 'question'}
    <div class="w-full border-t border-gray-200 bg-white shadow-md">
      <div class="px-4 md:px-8 lg:px-12 py-3 w-full">
        <ChatInput
          onSendQuestion={handleSendQuestion}
          disabled={chatState.loading}
          {isProcessing}
          maxLength={MAX_QUESTION_LENGTH}
          on:cancel={() => {
            // Remove the last assistant message that asked for a question
            if (
              chatState.messages.length > 0 &&
              chatState.messages[chatState.messages.length - 1].role === 'assistant' &&
              typeof chatState.messages[chatState.messages.length - 1].content === 'string' &&
              (chatState.messages[chatState.messages.length - 1].content as string).includes(
                'What question would you like to ask?'
              )
            ) {
              chatState.messages = chatState.messages.slice(0, -1);
            }
            // Return to summary stage with post-response options
            chatState = { ...chatState, stage: 'summary' };
          }}
          on:stop={() => {
            stopProcessing();
          }}
        />
      </div>
    </div>
  {/if}
</div>
