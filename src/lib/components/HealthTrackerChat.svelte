<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { v7 as uuidv7 } from 'uuid';
  import { logError, logDebug } from '$lib/utils/secureLogger';
  import { n8nService } from '$lib/services';
  import { checkConnectionStatus } from '$lib/utils/connectionUtils';
  import { ActivityTracker, shouldAddConnectionErrorMessage } from '$lib/utils/activityUtils';
  import ChatMessage from './ChatMessage.svelte';
  import OptionsButtons from './OptionsButtons.svelte';
  import ChatInput from './ChatInput.svelte';
  // Import environment variables with fallback values
  const HEALTH_TRACKER_TIMEOUT = Number(import.meta.env.VITE_HEALTH_TRACKER_TIMEOUT) || 10;
  const CONNECTION_CHECK_TIMEOUT = 5000; // 5 seconds timeout for connection checks

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
  let selectedPeriod = 1;
  let isScrolledAway = false;
  let initialFetchDone = false;

  // Activity tracker instance
  let activityTracker: ActivityTracker;

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
      chatState.stage = 'post_response';
      addMessage('assistant', 'Connection to the Health Tracker service has been restored. You can continue your session.');
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
    const finalContent =
      typeof content === 'string' && content.trim() === '' && role === 'assistant'
        ? "Sorry, I couldn't generate a response. Please try again."
        : typeof content === 'string' && content !== '[object Object]'
          ? content.trim() !== ''
            ? content.trim()
            : "Sorry, I couldn't process that request due to an unexpected response from the service. Please try again."
          : typeof content === 'object' && content !== null
            ? content
            : "Sorry, I couldn't process that request due to an unexpected response from the service. Please try again.";

    if (typeof content !== 'string' || content === '[object Object]') {
      logDebug('Attempted to add unexpected content, converting to placeholder', {
        originalContent: content
      });
    }

    // Get the last message content for duplicate checking
    const lastMessage = chatState.messages[chatState.messages.length - 1];
    const lastMessageContent = lastMessage ? lastMessage.content : undefined;
    
    // Prevent adding duplicate connection error messages
    if (role === 'assistant' && !shouldAddConnectionErrorMessage(finalContent.toString(), lastMessageContent)) {
      logDebug('Skipping duplicate connection error message');
      return;
    }

    const newMessage: Message = {
      id: uuidv7(),
      role,
      content: finalContent
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

  const endConversation = (isError = false) => {
    logDebug('Ending conversation', { isError });
    recordActivity();

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

    if (inactivityTimerId) {
      clearInterval(inactivityTimerId);
      inactivityTimerId = null;
    }

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
      const connectionErrorMsg = 'Cannot connect to the Health Tracker service. Please check your network connection and try again later.';
      
      if (!lastMsg || typeof lastMsg.content !== 'string' || 
          !lastMsg.content.includes('Cannot connect to the Health Tracker service')) {
        addMessage('assistant', connectionErrorMsg);
      }
      
      chatState.loading = false;
      loadingState = 'idle';
      chatState.stage = 'error'; // Move to error stage if not connected
      return;
    }
    
    // If we reached here, we're connected
    isConnected = true;

    logDebug('Fetching data from n8n', { period, patientId, sessionId });

    loadingState = 'connecting';
    chatState.loading = true;

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

      if (!result || !result.success) {
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
      } else if (result.data) {
        let messageContent: string | object | null = null;
        if (typeof result.data === 'string' && result.data.trim() !== '') {
          messageContent = result.data.trim();
        } else if (
          typeof result.data === 'object' &&
          result.data !== null &&
          Object.keys(result.data).length > 0
        ) {
          messageContent = result.data;
        }

        loadingState = 'finalizing';

        if (
          messageContent === null ||
          (typeof messageContent === 'string' && messageContent === '')
        ) {
          logError('Empty or null response data from service', {
            data: result.data,
            sessionId
          });
          addMessage(
            'assistant',
            "Sorry, I couldn't generate a summary for the selected period. Please try another duration or try again later."
          );
          chatState.stage = 'post_response'; // Allow retry via post-response options or new selection
        } else {
          addMessage('assistant', messageContent);
          chatState.stage = 'post_response'; // Move to post-response stage on success
        }
      } else {
        logError('No data received from service despite success=true', {
          sessionId,
          data: result?.data
        });
        addMessage('assistant', 'No data received from the service.');
        chatState.stage = 'post_response'; // Allow retry via post-response options or new selection
      }

      chatState.loading = false;
      loadingState = 'idle';
    } catch (error: unknown) {
      logError('Caught exception during fetchDataFromN8n:', error);

      addMessage('assistant', 'An error occurred while fetching data. Please try again.');
      chatState.loading = false;
      loadingState = 'idle';
      chatState.stage = 'error'; // Move to error stage on unexpected fetch error
    }
  };

  const startNewConversation = () => {
    logDebug('Starting new conversation');
    recordActivity();
    chatState = {
      messages: [],
      loading: false,
      stage: 'date_selection'
    };
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
    if (!isConnected) {
      const n8nEndpoint = import.meta.env.VITE_N8N_HEALTH_TRACKER_WEBHOOK_URL || '';
      const connectionStatus = await checkConnectionStatus(n8nEndpoint, CONNECTION_CHECK_TIMEOUT);
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
    selectedPeriod = period;
    fetchDataFromN8n(period);
  };

  const handlePostResponseOption = async (id: string) => {
    logDebug(`Post-response option selected: ${id}`);
    recordActivity();

    // For options that will need a connection, check it first
    if ((id === 'ask' || id === 'reselect') && !isConnected) {
      const n8nEndpoint = import.meta.env.VITE_N8N_HEALTH_TRACKER_WEBHOOK_URL || '';
      const connectionStatus = await checkConnectionStatus(n8nEndpoint, CONNECTION_CHECK_TIMEOUT);
      isConnected = connectionStatus;
      
      if (!connectionStatus && id !== 'end') {
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
      const lastMsg = chatState.messages[chatState.messages.length - 1];
      if (
        !(
          lastMsg?.role === 'assistant' &&
          typeof lastMsg.content === 'string' &&
          lastMsg.content.includes('Please select a date range:')
        )
      ) {
        addMessage('assistant', 'Please select a date range:');
      }
    } else if (id === 'end') {
      endConversation();
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
      const connectionErrorMsg = 'Cannot connect to the Health Tracker service. Please check your network connection and try again later.';
      
      if (!lastMsg || typeof lastMsg.content !== 'string' || 
          !lastMsg.content.includes('Cannot connect to the Health Tracker service')) {
        addMessage('assistant', connectionErrorMsg);
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

    addMessage('user', question);

    try {
      const result = await n8nService.sendMessage(
        sessionId,
        question,
        userId,
        'health_tracker_summary',
        patientId
      );

      loadingState = 'analyzing';

      if (!result?.success) {
        logError('Service reported an error for question:', {
          error: result?.error,
          sessionId,
          data: result?.data
        });
        addMessage(
          'assistant',
          `The service returned an error while processing your question: ${result?.error || 'Unknown service error'}. Please try asking something else.`
        );
      } else if (result.data) {
        let messageContent: string | object | null = null;
        if (typeof result.data === 'string' && result.data.trim() !== '') {
          messageContent = result.data.trim();
        } else if (
          typeof result.data === 'object' &&
          result.data !== null &&
          Object.keys(result.data).length > 0
        ) {
          messageContent = result.data;
        }

        loadingState = 'finalizing';

        if (
          messageContent === null ||
          (typeof messageContent === 'string' && messageContent === '')
        ) {
          logError('Empty or null response data from service for question', {
            data: result.data,
            sessionId
          });
          addMessage(
            'assistant',
            "Sorry, I couldn't process that question. Please try asking something else or try again later."
          );
        } else {
          addMessage('assistant', messageContent);
        }
      } else {
        logError('No data received from service for question despite success=true', {
          sessionId,
          data: result?.data
        });
        addMessage('assistant', 'No data received from the service.');
      }

      chatState.loading = false;
      chatState.stage = 'post_response';
      loadingState = 'idle';
    } catch (error: unknown) {
      logError('Caught exception during handleSendQuestion:', error);

      addMessage(
        'assistant',
        'An error occurred while processing your question. Please try again.'
      );

      chatState.loading = false;
      chatState.stage = 'error'; // Move to error stage on unexpected question error
      loadingState = 'idle';
    }
  };

  // Helper function to render the loading indicator HTML string
  const renderLoadingIndicator = () => {
    const stateText =
      loadingState === 'connecting'
        ? 'Connecting'
        : loadingState === 'processing'
          ? 'Processing data'
          : loadingState === 'analyzing'
            ? 'Analyzing results'
            : loadingState === 'finalizing'
              ? 'Preparing response'
              : 'Processing';

    const stateIcon =
      loadingState === 'connecting'
        ? '🔄'
        : loadingState === 'processing'
          ? '⚙️'
          : loadingState === 'analyzing'
            ? '🔍'
            : loadingState === 'finalizing'
              ? '📊'
              : '';

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

  onMount(() => {
    if (!initialFetchDone) {
      initialFetchDone = true;
      addMessage('assistant', 'Please select a date range:');
    }

    const n8nEndpoint = import.meta.env.VITE_N8N_HEALTH_TRACKER_WEBHOOK_URL || '';
    
    // Initialize the activity tracker
    activityTracker = new ActivityTracker({
      timeoutMinutes: HEALTH_TRACKER_TIMEOUT,
      connectionCheckEndpoint: n8nEndpoint,
      connectionCheckTimeout: CONNECTION_CHECK_TIMEOUT,
      onInactivityTimeout: handleInactivityTimeout,
      onConnectionChange: handleConnectionChange,
      logDebug: logDebug,
      logError: logError
    });
    
    // Start tracking activity
    activityTracker.startInactivityTimer();
    activityTracker.attachActivityListeners(chatContainerRef);
    
    // Initial connection status
    isConnected = activityTracker.getConnectionStatus();
    
    // Additional component-specific event listener for scroll events
    chatContainerRef?.addEventListener('scroll', handleScrollEvent);

    return () => {
      logDebug('Component onDestroy cleanup');
      if (activityTracker) {
        activityTracker.cleanup();
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
  {#if !isConnected}
    <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-2 text-sm flex items-center justify-between">
      <div class="flex items-center">
        <svg class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Connection to Health Tracker service lost. Please click Retry to reconnect.</span>
      </div>
      <button 
        class="text-red-700 hover:text-red-900 focus:outline-none" 
        on:click={() => {
          // Visual feedback that we're checking
          const retryBtn = document.activeElement as HTMLButtonElement;
          if (retryBtn) {
            const originalText = retryBtn.innerText;
            retryBtn.innerText = 'Checking...';
            retryBtn.disabled = true;
            
            setTimeout(() => {
              retryBtn.innerText = originalText;
              retryBtn.disabled = false;
            }, 2000); // Reset after 2 seconds
          }
          
          if (activityTracker) {
            activityTracker.retryConnection().then((online) => {
            isConnected = online;
            // Only add message if connection status changed to online
            if (online) {
              addMessage('assistant', 'Connection restored! You can continue using the Health Tracker.');
              if (chatState.stage === 'error') {
                chatState.stage = 'post_response';
              }
            } else {
              // If connection is still down, update the UI instead of adding message
              // The banner will still be visible showing the connection is down
              if (chatState.stage !== 'error') {
                chatState.stage = 'error';
              }
            }
                      });
                    }
        }}
      >
        Retry
      </button>
    </div>
  {/if}
  
  <div
    bind:this={chatContainerRef}
    class="flex flex-col flex-grow overflow-y-auto bg-gradient-to-b-gray-white"
    on:scroll={handleScrollEvent}
  >
    <div class="px-3 md:px-6 lg:px-8 pt-4 pb-16 w-full">
      {#each chatState.messages as msg (msg.id)}
        <div class="mb-8">
          <div class={`text-sm mb-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
            <span class="text-gray-500 font-medium">
              {msg.role === 'user' ? userName : 'Health Assistant'}
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
        {#if chatState.stage !== 'question'}
          <div class="mt-4">
            {#if chatState.stage === 'welcome'}
              <div class="flex justify-center my-4">
                <button
                  class="btn btn-primary flex items-center px-6 py-3 rounded-full btn-gradient"
                  on:click={startNewConversation}
                >
                  <div class="flex items-center justify-center">
                    <span class="text-base">👋</span>
                    <span class="font-medium text-sm mx-2">Start New Conversation</span>
                  </div>
                </button>
              </div>
            {:else if chatState.stage === 'date_selection'}
              <OptionsButtons
                buttons={DATE_RANGE_BUTTONS}
                onSelect={(id) => handleDateRangeSelection(id)}
              />
            {:else if chatState.stage === 'post_response'}
              <OptionsButtons buttons={POST_RESPONSE_BUTTONS} onSelect={handlePostResponseOption} />
            {:else if chatState.stage === 'error'}
              <div class="flex justify-center my-4">
                <button
                  class="btn btn-primary flex items-center px-6 py-3 rounded-full btn-gradient"
                  on:click={(e) => {
                    // Visual feedback
                    const btn = e.currentTarget as HTMLButtonElement;
                    const originalInnerHTML = btn.innerHTML;
                    btn.innerHTML = '<div class="flex items-center justify-center"><span class="text-base">🔄</span><span class="font-medium text-sm mx-2">Checking...</span></div>';
                    btn.disabled = true;
                    
                    // Check connection first using activity tracker
                    if (activityTracker) {
                      activityTracker.retryConnection().then((online) => {
                      isConnected = online;
                      // Reset button
                      setTimeout(() => {
                        btn.innerHTML = originalInnerHTML;
                        btn.disabled = false;
                      }, 1000);
                      
                      if (online) {
                        // If connected, start a new conversation
                        startNewConversation();
                      }
                      // If not connected, do nothing - the connection banner will still show
                      });
                    }
                  }}
                >
                  <div class="flex items-center justify-center">
                    <span class="text-base">🔄</span>
                    <span class="font-medium text-sm mx-2">Try Again</span>
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
      <!-- Spacer for scroll -->

      {#if isScrolledAway && chatState.messages.length > 0}
        <button
          class="fixed bottom-28 right-4 md:right-8 lg:right-12 bg-blue-500 text-white p-3 rounded-full shadow-lg transition-opacity duration-300 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          on:click={scrollToBottom}
          aria-label="Scroll to latest message"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
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

  {#if chatState.stage === 'question'}
    <div class="w-full border-t border-gray-200 bg-white shadow-md">
      <div class="px-4 md:px-8 lg:px-12 py-3 w-full">
        <ChatInput onSendQuestion={handleSendQuestion} disabled={chatState.loading} />
      </div>
    </div>
  {/if}
</div>

<style>
  /* Base styles for the thinking indicator */
  :global(.thinking-loader) {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
  }

  :global(.thinking-inline) {
    display: flex;
    align-items: center;
  }

  :global(.thinking-text) {
    font-size: 0.875rem; /* text-sm */
    color: #6b7280; /* text-gray-500 */
    margin-right: 0.5rem; /* mr-2 */
  }

  /* Styles for the pulsing dots */
  :global(.thinking-dots-inline) {
    display: flex;
    align-items: center;
    height: 1em; /* Match text height */
  }

  :global(.thinking-dots-inline span) {
    display: inline-block;
    width: 6px; /* Adjust size as needed */
    height: 6px; /* Adjust size as needed */
    background-color: #6b7280; /* Match text color */
    border-radius: 50%;
    margin: 0 2px; /* Space between dots */
    animation: pulse 1.4s infinite ease-in-out both;
  }

  :global(.thinking-dots-inline span:nth-child(1)) {
    animation-delay: -0.32s;
  }

  :global(.thinking-dots-inline span:nth-child(2)) {
    animation-delay: -0.16s;
  }

  /* Keyframes for the pulse animation */
  @keyframes pulse {
    0%,
    80%,
    100% {
      opacity: 0;
      transform: scale(0);
    }
    40% {
      opacity: 1;
      transform: scale(1);
    }
  }

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
