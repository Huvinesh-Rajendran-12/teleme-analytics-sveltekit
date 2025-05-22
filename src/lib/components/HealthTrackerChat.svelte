<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { v7 as uuidv7 } from 'uuid';
  import { logError, logDebug } from '$lib/utils/secureLogger';
  import { n8nService } from '$lib/services';
  import { ActivityTracker, shouldAddConnectionErrorMessage } from '$lib/utils/activityUtils';
  import { parseAIMessageContent } from '$lib/utils/markdownParser';

  // Common components
  import ConnectionStatusBanner from './common/ConnectionStatusBanner.svelte';
  import MessageList from './common/MessageList.svelte';
  import LoadingIndicator from './common/LoadingIndicator.svelte';
  import ChatOptions from './common/ChatOptions.svelte';
  import ScrollToBottomButton from './common/ScrollToBottomButton.svelte';
  import ChatInput from './ChatInput.svelte';
  import StopProcessingButton from './common/StopProcessingButton.svelte';
  import type { Message } from '$lib/types';

  // Config
  import { TIMEOUTS, ENDPOINTS, CONNECTION_CHECK_TIMEOUT, UI_TEXT } from '$lib/config/chatConfig';
  // Use centralized config values
  const HEALTH_TRACKER_TIMEOUT = TIMEOUTS.healthTracker;

  export let patientId: string | number;
  export let userId: string | number;
  export let userName: string;

  type ChatState = {
    messages: Message[];
    loading: boolean;
    stage: 'welcome' | 'date_selection' | 'question' | 'post_response' | 'error';
  };

  type LoadingState = 'idle' | 'connecting' | 'processing' | 'analyzing' | 'finalizing';

  let chatState: ChatState = {
    messages: [],
    loading: false,
    stage: 'date_selection'
  };

  let isConnected = true; // Connection status flag, will be verified on mount
  let loadingState: LoadingState = 'idle';
  let sessionId = uuidv7();
  let selectedDuration: number = 12; // Variable to store selected duration

  // Note: used in fetchDataFromN8n
  let isScrolledAway = false;
  let initialFetchDone = false;
  let isProcessing = false; // Track if we're waiting for a response from the server
  let abortCheckTimeoutId: number | null = null; // For the abort check timeout

  // Activity tracker instance
  let activityTracker: ActivityTracker;

  // We use ActivityTracker for managing inactivity timeout
  let chatEndRef: HTMLDivElement;
  let chatContainerRef: HTMLDivElement;

  const POST_RESPONSE_BUTTONS = [
    {
      id: 'ask',
      label: 'Ask Question',
      icon: '❓',
      variant: 'primary' as const,
      isVisible: true,
      order: 1
    },
    {
      id: 'reselect',
      label: 'Reselect Date Range',
      icon: '📅',
      variant: 'secondary' as const,
      isVisible: true,
      order: 2
    },
    {
      id: 'end',
      label: 'End Chat',
      icon: '👋',
      variant: 'ghost' as const,
      isVisible: true,
      order: 3
    }
  ];

  const DATE_RANGE_BUTTONS = [
    {
      id: '1month',
      label: '1 Month',
      icon: '📅',
      variant: 'gradient-blue-teal' as const,
      isVisible: true,
      order: 1
    },
    {
      id: '3months',
      label: '3 Months',
      icon: '📅',
      variant: 'gradient-blue-teal' as const,
      isVisible: true,
      order: 2
    },
    {
      id: '6months',
      label: '6 Months',
      icon: '📅',
      variant: 'gradient-blue-teal' as const,
      isVisible: true,
      order: 3
    }
  ];

  // Function to handle user activity
  const recordActivity = () => {
    if (activityTracker) {
      activityTracker.recordActivity();
    }
  };

  // Function to handle connection status changes
  const handleConnectionChange = (connected: boolean) => {
    logDebug(`Connection status changed to: ${connected}`);
    isConnected = connected;

    // If connection restored and we were in error state
    if (connected && chatState.stage === 'error') {

      addMessage(
        'assistant',
        'Connection to the Health Tracker service has been restored. You can continue your session.'
      );
      chatState.stage = 'post_response'; // Allow user to try again via options
    }
  };

  // Function to handle inactivity timeout
  const handleInactivityTimeout = () => {
    logDebug('Inactivity timeout reached');
    if (chatState.stage !== 'welcome') {
      endConversation(); // End conversation due to inactivity
    }
  };

  // Now using the imported shouldAddConnectionErrorMessage utility function

  const addMessage = (role: 'user' | 'assistant', content: string | object) => {
    let finalContent: string; // Ensure finalContent is always a string

    const userFriendlyErrorMessage =
      'Sorry, the assistant provided an unexpected response format. Please try again.';
    const genericErrorMessage =
      "Sorry, I couldn't process that request due to an unexpected response from the service. Please try again.";
    const emptyResponseErrorMessage = "Sorry, I couldn't generate a response. Please try again.";

    if (role === 'assistant') {
      if (typeof content === 'object' && content !== null) {
        // Assistant sent an object
        finalContent = userFriendlyErrorMessage;
        logDebug('Attempted to add object content for assistant, converting to error', {
          originalContent: content
        });
      } else if (typeof content === 'string') {
        if (content === '[object Object]') {
          // Assistant sent the specific string "[object Object]"
          finalContent = userFriendlyErrorMessage;
          logDebug('Attempted to add "[object Object]" string for assistant, converting to error');
        } else if (content.trim() === '') {
          // Assistant sent an empty string
          finalContent = emptyResponseErrorMessage;
          logDebug('Attempted to add empty string content for assistant, converting to error');
        } else {
          // Valid assistant string
          finalContent = content.trim();
        }
      } else {
        // Assistant sent something else unexpected (e.g., null, undefined)
        finalContent = genericErrorMessage;
        logDebug('Attempted to add unexpected type content for assistant, converting to error', {
          originalContent: content
        });
      }
    } else {
      // User message - should generally be a string
      if (typeof content === 'string') {
        finalContent = content.trim();
        // Although unlikely for user input, handle if user somehow inputs this literal string
        if (finalContent === '[object Object]') {
          finalContent = genericErrorMessage;
          logDebug('Attempted to add "[object Object]" string for user, converting to error');
        }
      } else {
        // User sent something unexpected (object, null, etc.)
        finalContent = genericErrorMessage;
        logDebug('Attempted to add unexpected type content for user, converting to error', {
          originalContent: content
        });
      }
    }

    // Get the last message content for duplicate checking
    const lastMessage = chatState.messages[chatState.messages.length - 1];
    const lastMessageContent = lastMessage ? lastMessage.content : undefined;

    // Prevent adding duplicate connection error messages
    if (
      role === 'assistant' &&
      !shouldAddConnectionErrorMessage(finalContent.toString(), lastMessageContent)
    ) {
      logDebug('Skipping duplicate connection error message');
      return;
    }

    let processedContent = finalContent;

    // Process AI message content with markdown parser
    // finalContent is already guaranteed to be a string here for assistant messages
    if (role === 'assistant') {
      processedContent = parseAIMessageContent(finalContent);
    }

    const newMessage: Message = {
      id: uuidv7(),
      role,
      content: processedContent
    };

    chatState.messages = [...chatState.messages, newMessage];
    logDebug('Message added', {
      role,
      content:
        typeof newMessage.content === 'string'
          ? newMessage.content.substring(0, 50) + '...'
          : 'object'
    });
    recordActivity();
  };

  // Function to initialize the activity tracker
  function initActivityTracker() {
    // Clean up any existing tracker
    if (activityTracker) {
      activityTracker.cleanup();
    }

    // Create and initialize a new activity tracker
    activityTracker = new ActivityTracker({
      timeoutMinutes: HEALTH_TRACKER_TIMEOUT,
      connectionCheckEndpoint: ENDPOINTS.healthTracker,
      connectionCheckTimeout: CONNECTION_CHECK_TIMEOUT,
      connectionCheckInterval: 30000, // Check every 30 seconds
      serviceType: 'healthTracker', // Identify this service
      onInactivityTimeout: handleInactivityTimeout,
      onConnectionChange: handleConnectionChange,
      logDebug: logDebug,
      logError: logError,
      pauseOnInvisible: false // DO NOT pause inactivity timer when tab loses focus
    });

    // Start tracking activity
    activityTracker.startInactivityTimer();

    // Attach chat container for specific tracking (scroll events) if available
    if (chatContainerRef) {
      activityTracker.attachElementListener(chatContainerRef);
    }

    logDebug('Activity tracker initialized');
  }

  const endConversation = (isError = false) => {
    logDebug('Ending conversation', { isError });

    // Still record activity to reset timer
    if (activityTracker) {
      activityTracker.recordActivity();
    }

    if (!isError) {
      const lastMsg = chatState.messages[chatState.messages.length - 1];
      if (
        !(
          lastMsg?.role === 'assistant' &&
          typeof lastMsg.content === 'string' &&
          lastMsg.content.includes('Thank you for using Teleme AI. The conversation has ended.')
        )
      ) {
        addMessage('assistant', 'Thank you for using Teleme AI. The conversation has ended.');
      }
    }

    // Don't clean up the tracker completely, just reset the timer to
    // ensure it continues to track inactivity even at the welcome screen

    chatState = {
      messages: chatState.messages, // Keep existing messages
      loading: false,
      stage: 'welcome' // Move to welcome stage to allow starting a new conversation
    };
  };

  const regenerateSessionId = () => {
    const newId = uuidv7();
    logDebug(`Generated new session ID: ${newId}`);
    sessionId = newId;
    return newId;
  };

  // Function to stop processing
  function stopProcessing() {
    if (isProcessing) {
      // Abort the current request
      const stopped = n8nService.stopCurrentRequest();
      if (stopped) {
        isProcessing = false;
        chatState.loading = false;
        loadingState = 'idle';
        // Add the message immediately so it appears right away
        addMessage(
          'assistant',
          'Processing stopped. Is there anything else you would like to know?'
        );
        // Move to post_response stage to show options
        chatState.stage = 'post_response';

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

  const fetchDataFromN8n = async (period = 1) => {
    logDebug('Attempting to fetch data from n8n');
    recordActivity();

    // Check connection status using the activity tracker
    const connectionStatus = activityTracker ? await activityTracker.checkConnection() : false;

    if (!connectionStatus) {
      logError('Connection check failed, cannot fetch data.');
      isConnected = false; // Update connection status flag
      // Only add message if we don't already have a connection error message
      const lastMsg = chatState.messages[chatState.messages.length - 1];
      const connectionErrorMsg =
        'Cannot connect to the Health Tracker service. Please check your network connection and try again later.';

      if (
        !lastMsg ||
        typeof lastMsg.content !== 'string' ||
        !lastMsg.content.includes('Cannot connect to the Health Tracker service')
      ) {
        addMessage('assistant', connectionErrorMsg);
      }

      chatState.loading = false;
      loadingState = 'idle';
      isProcessing = false;
      chatState.stage = 'error'; // Move to error stage if not connected
      return;
    }

    // If we reached here, we're connected
    isConnected = true;

    logDebug('Fetching data from n8n', { period, patientId, sessionId });

    loadingState = 'connecting';
    chatState.loading = true;
    isProcessing = true;

    const periodText = period === 1 ? '1 month' : period === 3 ? '3 months' : '6 months';
    const userMsgContent = `Summarize health tracker data for ${periodText}.`;

    const lastMessage = chatState.messages[chatState.messages.length - 1];
    if (
      !lastMessage ||
      typeof lastMessage.content !== 'string' ||
      !lastMessage.content.includes(userMsgContent)
    ) {
      addMessage('user', userMsgContent);
    } else {
      logDebug('User message already present for this request.');
    }

    try {
      loadingState = 'processing';

      const message = `Summarize health tracker data for ${periodText}.`;
      const result = await n8nService.callWithParams(
        sessionId,
        userId,
        userName,
        period,
        message,
        'health_tracker_summary',
        null,
        patientId
      );

      loadingState = 'analyzing';

      // Special handling for user-cancelled requests
      if (n8nService.isUserInitiatedAbort()) {
        // No need to add a message here as it was already added in stopProcessing()
        logDebug('Request was cancelled by user, skipping error message');
        // Reset the flag after checking
        n8nService.resetUserInitiatedAbort();
        chatState.stage = 'post_response'; // Move to post-response stage
      }
      // Normal error handling
      else if (!result || !result.success) {
        logError('Service call failed or returned error:', {
          error: result?.error,
          sessionId,
          data: result?.data
        });
        addMessage(
          'assistant',
          `The service returned an error: ${result?.error || 'Unknown service error'}. Please try again.`
        );
        chatState.stage = 'post_response'; // Allow user to try again via options
      } else if ( // Check for object with output field
        typeof result.data === 'object' &&
        result.data !== null &&
        typeof result.data.output === 'string' &&
        result.data.output.trim() !== ''
      ) {
        // Expecting a JSON object with a non-empty 'output' string from n8nService
        loadingState = 'finalizing';
        addMessage('assistant', result.data.output.trim());
        chatState.stage = 'post_response'; // Move to post-response stage on success
      } else {
        // Handle cases where data is not the expected object structure or 'output' is invalid
        logError('Received invalid or empty data from service (expected JSON with output key)', {
          sessionId,
          data: result?.data
        });
        addMessage(
          'assistant',
          "Sorry, I couldn't generate a summary for the selected period or received invalid data. Please try another duration or try again later."
        );
        chatState.stage = 'post_response'; // Allow retry via post-response options or new selection
      }

      chatState.loading = false;
      loadingState = 'idle';
      isProcessing = false;
    } catch (error: unknown) {
      logError('Caught exception during fetchDataFromN8n:', error);

      // Check if this was caused by an abort
      if (
        error instanceof Error &&
        error.name === 'AbortError' &&
        n8nService.isUserInitiatedAbort()
      ) {
        // Don't add a message here as it was already added in stopProcessing()
        logDebug('Request was cancelled by user, skipping error message');
      } else {
        addMessage('assistant', 'An error occurred while fetching data. Please try again.');
      }

      chatState.loading = false;
      loadingState = 'idle';
      isProcessing = false;
      chatState.stage = 'error'; // Move to error stage on unexpected fetch error

      // Reset the user-initiated abort flag
      n8nService.resetUserInitiatedAbort();
    }
  };

  const startNewConversation = () => {
    logDebug('Starting new conversation');
    recordActivity(); // Record activity immediately
    chatState = {
      messages: [],
      loading: false,
      stage: 'date_selection'
    };
    initActivityTracker(); // Re-initialize and start the tracker for the new conversation
    regenerateSessionId(); // Generate a new session ID for the new conversation
    addMessage('assistant', 'Please select a date range:');
    loadingState = 'idle';

    // Perform a connection check immediately when starting a new conversation
    if (activityTracker) {
      activityTracker.retryConnection().then((online) => {
        isConnected = online;
        if (!online) {
          logError('Connection check failed after starting new conversation.');
          addMessage(
            'assistant',
            'Cannot connect to the Health Tracker service. Please check your network connection and try again later.'
          );
          chatState.stage = 'error'; // Set to error stage if not connected
        } else {
          logDebug('Connection re-established after starting new conversation.');
          // No message needed, user can now select a date range
        }
      });
    }
  };

  const handleScrollEvent = () => {
    if (!chatContainerRef) {
      isScrolledAway = false;
      return;
    }
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef;
    const threshold = 50; // px
    const isAtOrNearBottom = scrollHeight - scrollTop - clientHeight <= threshold;

    const shouldBeScrolledAway = !isAtOrNearBottom;

    if (isScrolledAway !== shouldBeScrolledAway) {
      logDebug(`Scroll state changed: isScrolledAway = ${shouldBeScrolledAway}`);
      isScrolledAway = shouldBeScrolledAway;
    }
  };

  const scrollToBottom = () => {
    logDebug('Attempting to scroll to bottom.');
    if (chatEndRef) {
      chatEndRef.scrollIntoView({ behavior: 'smooth' });
      isScrolledAway = false;
    } else {
      logDebug('chatEndRef not available for scrollToBottom.');
    }
  };

  const handleDateRangeSelection = async (option: string) => {
    logDebug(`Date range selected: ${option}`);
    recordActivity();

    // Check connection before processing
    if (!isConnected && activityTracker) {
      const connectionStatus = await activityTracker.checkConnection();
      isConnected = connectionStatus;

      if (!connectionStatus) {
        addMessage(
          'assistant',
          'Cannot connect to the Health Tracker service. Please check your network connection and try again later.'
        );
        chatState.stage = 'error';
        return;
      }
    }

    let period = 1;
    if (option === '1month') period = 1;
    else if (option === '3months') period = 3;
    else if (option === '6months') period = 6;

    selectedDuration = period; // Store the selected duration

    logDebug(`Fetching data for period: ${period} months`);
    fetchDataFromN8n(period);
  };

  const handlePostResponseOption = async (id: string) => {
    logDebug(`Post-response option selected: ${id}`);
    recordActivity();

    // For options that will need a connection, check it first using the activity tracker
    if (activityTracker && (id === 'ask' || id === 'reselect')) {
      const connectionStatus = await activityTracker.checkConnection();

      // Update state based on the check result
      isConnected = connectionStatus;

      // If not connected, show error and return.
      // The 'connection restored' message is handled by activityTracker's callback (handleConnectionChange).
      if (!isConnected) {
        addMessage(
          'assistant',
          'Cannot connect to the Health Tracker service. Please check your network connection and try again later.'
        );
        chatState.stage = 'error';
        return;
      }
    }

    if (id === 'ask') {
      chatState.stage = 'question';
      const lastMsg = chatState.messages[chatState.messages.length - 1];
      if (
        !(
          lastMsg?.role === 'assistant' &&
          typeof lastMsg.content === 'string' &&
          lastMsg.content.includes('What would you like to ask?')
        )
      ) {
        addMessage('assistant', 'What would you like to ask?');
      }
    } else if (id === 'reselect') {
      chatState.stage = 'date_selection';

      // Don't add "Please select a date range:" message if there's a connection error
      // or if we've just shown a connection restored message
      const lastMsg = chatState.messages[chatState.messages.length - 1];
      const isLastMsgConnectionRestored =
        lastMsg?.role === 'assistant' &&
        typeof lastMsg.content === 'string' &&
        (lastMsg.content.includes('Connection to the Health Tracker service has been restored') ||
          lastMsg.content.includes('Connection restored'));

      // Only add the date range message if the last message wasn't about connections
      if (
        !isLastMsgConnectionRestored &&
        !(
          lastMsg?.role === 'assistant' &&
          typeof lastMsg.content === 'string' &&
          lastMsg.content.includes('Please select a date range:')
        )
      ) {
        addMessage('assistant', 'Please select a date range:');
      }
    } else if (id === 'end') {
      endConversation(); // This will properly clean up the activity tracker and timers
    }
  };

  const handleSendQuestion = async (question: string) => {
    logDebug(`Sending question: ${question.substring(0, 50)}...`);
    recordActivity();

    // Check connection status using the activity tracker
    const connectionStatus = activityTracker ? await activityTracker.checkConnection() : false;

    if (!connectionStatus) {
      logError('Connection check failed, cannot send question.');
      isConnected = false; // Update connection status flag
      // Only add message if we don't already have a connection error message
      const lastMsg = chatState.messages[chatState.messages.length - 1];
      const connectionErrorMsg =
        'Cannot connect to the Health Tracker service. Please check your network connection and try again later.';

      // Use the utility function to check if a connection error message should be added
      if (shouldAddConnectionErrorMessage(connectionErrorMsg, lastMsg?.content)) {
        addMessage('assistant', connectionErrorMsg);
      } else {
        logDebug('Skipping duplicate connection error message before sending question.');
      }

      chatState.loading = false;
      loadingState = 'idle';
      chatState.stage = 'error'; // Move to error stage if not connected
      return;
    }

    // If we reached here, we're connected
    isConnected = true;

    if (!question.trim()) {
      logDebug('Ignoring empty question.');
      return;
    }
    chatState.loading = true;
    loadingState = 'processing';
    isProcessing = true;

    addMessage('user', question);

    try {
      // Correcting the call arguments
      const result = await n8nService.callWithParams(
        sessionId,
        userId,
        userName,
        selectedDuration, // Pass selectedDuration for the 'period' argument
        question, // Pass question for the 'message' argument
        'health_tracker_summary', // Assuming this workflow type also handles general questions
        null, // Assuming history should be null for a new question on existing summary
        patientId
      );

      loadingState = 'analyzing';

      // Special handling for user-cancelled requests
      // Relying only on the service's internal flag
      if (n8nService.isUserInitiatedAbort()) {
        // No need to add a message here as it was already added in stopProcessing()
        logDebug('Request was cancelled by user, skipping error message');
        // Reset the flag after checking
        n8nService.resetUserInitiatedAbort();
        chatState.stage = 'post_response'; // Move to post-response stage
      }
      // Normal error handling based on result success status
      else if (!result?.success) {
        logError('Service reported an error for question:', {
          error: result?.error,
          sessionId,
          data: result?.data
        });
        addMessage(
          'assistant',
          `The service returned an error while processing your question: ${result?.error || 'Unknown service error'}. Please try asking something else.`
        );
        chatState.stage = 'post_response'; // Allow user to try again
      }
      // Handle successful response data
      else {
        // Expecting result.data to be either a string or an object with an 'output' string property
        let assistantContent: string | undefined;

        if (
          typeof result.data === 'object' &&
          result.data !== null &&
          typeof result.data.output === 'string' &&
          result.data.output.trim() !== ''
        ) {
          assistantContent = result.data.output.trim();
        }

        if (assistantContent) {
          loadingState = 'finalizing';
          // addMessage handles processing markdown if it's a string
          addMessage('assistant', assistantContent);
          chatState.stage = 'post_response'; // Move to post-response stage on success
        } else {
          // Handle cases where data is empty string, null, empty object, or object without output
          logError(
            'Received invalid or empty data from service for question despite success=true',
            {
              data: result?.data,
              sessionId
            }
          );
          addMessage(
            'assistant',
            "Sorry, I couldn't process that question. Please try asking something else or try again later."
          );
          chatState.stage = 'post_response'; // Allow retry via post-response options
        }
      }

      chatState.loading = false;
      loadingState = 'idle';
      isProcessing = false;
    } catch (error: unknown) {
      logError('Caught exception during handleSendQuestion:', error);

      // Check if this was caused by an abort
      if (
        error instanceof Error &&
        error.name === 'AbortError' &&
        n8nService.isUserInitiatedAbort()
      ) {
        // Don't add a message here as it was already added in stopProcessing()
        logDebug('Request was cancelled by user, skipping error message');
      } else {
        addMessage(
          'assistant',
          'An error occurred while processing your question. Please try again.'
        );
        // Move to error stage only on unexpected error, not abort
        chatState.stage = 'error';
      }

      chatState.loading = false;
      loadingState = 'idle';
      isProcessing = false;

      // Reset the user-initiated abort flag
      n8nService.resetUserInitiatedAbort();
    }
  };

  // Removed renderLoadingIndicator function as we now use the LoadingIndicator component

  onMount(() => {
    if (!initialFetchDone) {
      initialFetchDone = true;
      addMessage('assistant', 'Please select a date range:');
    }

    // Endpoint is now used directly in the ActivityTracker config below

    // Initialize the activity tracker
    initActivityTracker();

    // Initial connection status
    isConnected = activityTracker.getConnectionStatus();

    // Additional component-specific event listener for scroll events to update UI state
    // This is separate from activity tracking
    chatContainerRef?.addEventListener('scroll', handleScrollEvent);

    return () => {
      logDebug('Component onDestroy cleanup');
      if (activityTracker) {
        activityTracker.cleanup(); // This handles unregistering from observer too
      }
      if (n8nService?.cleanup) n8nService.cleanup();
      chatContainerRef?.removeEventListener('scroll', handleScrollEvent);
    };
  });

  onDestroy(() => {
    logDebug('Component onDestroy');
    if (activityTracker) {
      activityTracker.cleanup();
    }

    // Clean up abort check timeout if it exists
    if (abortCheckTimeoutId) {
      clearTimeout(abortCheckTimeoutId);
      abortCheckTimeoutId = null;
    }
  });

  // Reactive block to scroll to the bottom after messages update
  $: {
    const lastMessage = chatState.messages[chatState.messages.length - 1];
    if (
      chatState.messages.length === 0 ||
      (lastMessage && lastMessage.role === 'user') ||
      (!chatState.loading && chatState.messages.length > 0) // Scroll when loading finishes if there are messages
    ) {
      tick()
        .then(() => {
          if (chatEndRef && chatContainerRef) {
            logDebug('Scrolling to bottom after state update.');
            scrollToBottom();
            isScrolledAway = false;
          } else {
            logDebug('Refs not available for scrolling.');
          }
        })
        .catch((err) => {
          logError('Error during tick or scroll:', err);
        });
    } else {
      logDebug('Not scrolling: Assistant message received while loading, or no new messages.');
    }
  }
</script>

<div class="flex flex-col h-full w-full">
  <!-- Connection status indicator -->
  <ConnectionStatusBanner
    {isConnected}
    serviceType="healthTracker"
    onRetry={async () => {
      if (activityTracker) {
        const online = await activityTracker.retryConnection();
        // Handle connection result
        if (online) {
          addMessage('assistant', UI_TEXT.connection.restored.healthTracker);
          if (chatState.stage === 'error') {
            chatState.stage = 'post_response';
          }
        } else {
          // If connection is still down, update the UI instead of adding message
          if (chatState.stage !== 'error') {
            chatState.stage = 'error';
          }
        }
        return online;
      }
      return false;
    }}
  />

  <div
    bind:this={chatContainerRef}
    class="flex flex-col flex-grow overflow-y-auto bg-gradient-to-b-gray-white"
    on:scroll={handleScrollEvent}
  >
    <div class="px-3 md:px-6 lg:px-8 pt-4 pb-16 w-full">
      <!-- Message list component -->
      <MessageList messages={chatState.messages} {userName} assistantName="Health Assistant" />

      <!-- Loading indicator for empty state -->
      {#if chatState.messages.length === 0 && chatState.loading}
        <div class="flex flex-col items-center justify-center py-20 w-full">
          <LoadingIndicator state={loadingState} centered={true} />
        </div>
      {/if}

      <!-- Options panel -->
      {#if !chatState.loading}
        {#if chatState.stage !== 'question'}
          <ChatOptions
            stage={chatState.stage}
            buttons={chatState.stage === 'date_selection'
              ? DATE_RANGE_BUTTONS
              : chatState.stage === 'post_response'
                ? POST_RESPONSE_BUTTONS
                : []}
            hasMessages={chatState.messages.length > 0}
            loading={chatState.loading}
            on:select={(e) => {
              if (chatState.stage === 'date_selection') {
                handleDateRangeSelection(e.detail);
              } else if (chatState.stage === 'post_response') {
                handlePostResponseOption(e.detail);
              }
            }}
            on:startNew={() => startNewConversation()}
          />
        {/if}
      {/if}

      <!-- Loading indicator during ongoing conversation -->
      {#if chatState.loading && chatState.messages.length > 0}
        <div class="flex flex-col justify-center items-center my-6">
          <LoadingIndicator state={loadingState} centered={true} />
          <!-- Stop button -->
          <StopProcessingButton
            isVisible={isProcessing}
            variant="default"
            on:stop={stopProcessing}
          />
        </div>
      {/if}

      <!-- Reference for scrolling to bottom -->
      <div bind:this={chatEndRef}></div>
      <div class="h-20"></div>
      <!-- Spacer for scroll -->

      <!-- Scroll to bottom button -->
      <ScrollToBottomButton
        isVisible={isScrolledAway && chatState.messages.length > 0}
        position="chat"
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
          maxLength={1000}
          disabled={chatState.loading}
          {isProcessing}
          on:cancel={() => {
            // Remove the last assistant message that asked for a question
            if (
              chatState.messages.length > 0 &&
              chatState.messages[chatState.messages.length - 1].role === 'assistant' &&
              typeof chatState.messages[chatState.messages.length - 1].content === 'string' &&
              (chatState.messages[chatState.messages.length - 1].content as string).includes(
                'What would you like to ask?'
              )
            ) {
              chatState.messages = chatState.messages.slice(0, -1);
            }
            // Return to post_response stage with the previous options
            chatState = { ...chatState, stage: 'post_response' };
          }}
          on:stop={() => {
            stopProcessing();
          }}
        />
      </div>
    </div>
  {/if}
</div>

<style>
  /* Gradient button styles */
  :global(.btn-gradient) {
    background-image: linear-gradient(
      to bottom right,
      var(--color-primary-500, #3b82f6),
      var(--color-teal-500, #14b8a6)
    ); /* Example gradient */
    color: white;
    border: none;
    /* Add other button styles as needed */
  }

  /* Gradient background for chat container */
  :global(.bg-gradient-to-b-gray-white) {
    background-image: linear-gradient(to bottom, #f3f4f6, #ffffff); /* Light gray to white */
  }
</style>
