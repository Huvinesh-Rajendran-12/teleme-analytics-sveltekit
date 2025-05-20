<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { v7 } from 'uuid';
  import ChatInput from './ChatInput.svelte';
  import { menuConfig } from '$lib/config';
  import type { OptionsButtonType } from '$lib/types';
  import { n8nService } from '$lib/services/n8nService';
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

  // Note: inactivityTimerRef is not actually needed as ActivityTracker handles the timer
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
      const newState = {
        messages: [],
        loading: false,
        stage: 'initial'
      };
      console.debug('Stage transition in startConversation: full reset', {
        from: chatState.stage,
        to: 'initial'
      });
      chatState = newState;
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
      console.debug('Stage transition in startConversation: simple transition', {
        from: chatState.stage,
        to: 'initial'
      });
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

    // Clean up the activity tracker to stop monitoring events
    if (activityTracker) {
      activityTracker.cleanup();
    }
  }

  function handleInitialOption(buttonId: string) {
    console.debug('Initial option selected:', buttonId);
    const button = menuConfig.menuButtons.main.find((b) => b.id === buttonId);
    if (!button) {
      console.error('Button not found in menu config:', buttonId);
      return;
    }

    const newState = {
      ...chatState,
      stage: 'asking_duration',
      selectedOption: buttonId
    };

    console.debug('Stage transition in handleInitialOption', {
      from: chatState.stage,
      to: 'asking_duration',
      button: button.label,
      icon: button.icon,
      selectedOption: buttonId
    });

    chatState = newState;

    addMessage('user', button.label);
    addMessage('assistant', 'Please select the duration for analysis:');
  }

  // Function to stop processing
  function stopProcessing() {
    if (isProcessing) {
      // Abort the current request
      const stopped = n8nService.stopCurrentRequest();
      if (stopped) {
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

        // We need to reset the user abort flag with a slight delay
        // to ensure it's still set when the service returns its response
        abortCheckTimeoutId = window.setTimeout(() => {
          n8nService.resetUserInitiatedAbort();
          abortCheckTimeoutId = null;
        }, 500);
      }
    }
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
      console.debug('Params available for analytics', {
        sessionId: params.sessionId.substring(0, 8) + '...',
        centre_id: params.centre_id,
        auth_token: params.auth_token ? 'present' : 'missing'
      });
      handleAnalyticsQuery(action_message);
    } catch (error) {
      console.error('Error handling option', error);

      // Check if this was caused by an abort
      if (error instanceof Error && error.name === 'AbortError') {
        // Don't add a message here as it was already added in stopProcessing()
        // This prevents duplicate messages
      } else {
        addMessage(
          'assistant',
          'An error occurred while processing your request. Please try again. If the problem persists, contact support.'
        );
      }

      chatState.loading = false;
      isProcessing = false;

      // Reset the user-initiated abort flag
      n8nService.resetUserInitiatedAbort();
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

      // Special handling for user-cancelled requests
      if (n8nService.isUserInitiatedAbort() || result.data === 'Request cancelled by user') {
        // No need to add a message here as it was already added in stopProcessing()
        console.debug('Request was cancelled by user, skipping error message');
        // Reset the flag after checking
        n8nService.resetUserInitiatedAbort();
      }
      // Normal error handling
      else if (!result.success) {
        console.error('Error from n8n service', {
          error: result.error
        });
        addMessage(
          'assistant',
          `Sorry, there was an error: ${result.error || 'An unknown error occurred. Please try again later.'}`
        );
      }
      // Handle successful responses
      else if (result.data) {
        // Check if result.data is a string, otherwise use an error message
        const messageContent =
          typeof result.data === 'string'
            ? result.data
            : 'Sorry, I received an unexpected response format. Please try again.';

        // Only add the message if it's not from a cancellation
        if (messageContent !== 'Request cancelled by user') {
          addMessage('assistant', messageContent);
        }
      } else {
        addMessage('assistant', 'No data received from the service.');
      }

      chatState = {
        ...chatState,
        loading: false,
        stage: 'summary'
      };
      isProcessing = false;
    } catch (error) {
      console.error('Error handling analytics query', error);

      // Don't show errors for user-initiated aborts
      if (
        !(
          error instanceof Error &&
          error.name === 'AbortError' &&
          n8nService.isUserInitiatedAbort()
        )
      ) {
        addMessage(
          'assistant',
          'Sorry, there was an error processing your request. Please try again.'
        );
      }

      chatState.loading = false;
      isProcessing = false;
    }

    // Always reset the user-initiated abort flag after handling
    n8nService.resetUserInitiatedAbort();
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
        // Use the reactive assignment to ensure the component updates
        const newState = {
          ...chatState,
          stage: 'initial',
          // Ensure we reset the buttons with proper icons when going back to initial stage
          selectedOption: undefined
        };
        console.debug('Stage transition in handlePostResponseOption: back button', {
          from: chatState.stage,
          to: 'initial',
          selectedOption: chatState.selectedOption,
          newSelectedOption: undefined
        });
        chatState = newState;
        addMessage('assistant', 'What would you like to do with your data analytics?');
        break;
      case 'end':
        addMessage('assistant', 'Thank you for using our service. The conversation has ended.');
        chatState = { ...chatState, stage: 'welcome' };

        // Clean up the activity tracker when user ends conversation manually
        if (activityTracker) {
          activityTracker.cleanup();
        }
        break;
      case 'question':
        console.debug('Setting stage to question');
        // Use the reactive assignment for the question state
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

      // Special handling for user-cancelled requests
      if (n8nService.isUserInitiatedAbort() || result.data === 'Request cancelled by user') {
        // No need to add a message here as it was already added in stopProcessing()
        console.debug('Request was cancelled by user, skipping error message');
        // Reset the flag after checking
        n8nService.resetUserInitiatedAbort();
      }
      // Normal error handling
      else if (!result.success) {
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
          typeof result.data === 'string'
            ? result.data
            : 'Sorry, I encountered an error processing that request. Please try again.';

        // Only add the message if it's not from a cancellation
        if (messageContent !== 'Request cancelled by user') {
          addMessage('assistant', messageContent);
        }
      } else {
        addMessage('assistant', 'No data received from the service.');
      }

      chatState = {
        ...chatState,
        loading: false,
        stage: 'summary'
      };
      isProcessing = false;
    } catch (error) {
      console.error('Error sending question', error);

      // Don't show errors for user-initiated aborts
      if (
        !(
          error instanceof Error &&
          error.name === 'AbortError' &&
          n8nService.isUserInitiatedAbort()
        )
      ) {
        addMessage(
          'assistant',
          'An error occurred while processing your question. Please try again. If the problem persists, contact support.'
        );
      }

      chatState.loading = false;
      isProcessing = false;
    }

    // Always reset the user-initiated abort flag after handling
    n8nService.resetUserInitiatedAbort();
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
      connectionCheckInterval: 30000, // Check every 30 seconds
      serviceType: 'analytics', // Identify this service
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
              on:submit={() => handleDurationSubmit()}
              on:stop={() => stopProcessing()}
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
              on:submit={() => handleDurationSubmit()}
              on:stop={() => stopProcessing()}
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
              on:submit={() => handleDurationSubmit()}
              on:stop={() => stopProcessing()}
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
