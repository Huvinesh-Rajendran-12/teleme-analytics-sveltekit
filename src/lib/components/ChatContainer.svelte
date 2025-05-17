<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { v7 } from 'uuid';
  import ChatMessage from './ChatMessage.svelte';
  import OptionsButtons from './OptionsButtons.svelte';
  import ChatInput from './ChatInput.svelte';
  import { menuConfig } from '$lib/config';
  import type { OptionsButtonType } from '$lib/types';
  import { n8nService } from '$lib/services/n8nService';
  import { checkConnectionStatus } from '$lib/utils/connectionUtils';
  import { ActivityTracker, shouldAddConnectionErrorMessage } from '$lib/utils/activityUtils';
  import type { ChatState, Message, Params } from '$lib/types';

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

  // Maximum question length allowed
  const MAX_QUESTION_LENGTH = 1000;

  // Activity tracker instance
  let activityTracker: ActivityTracker;

  let chatEndRef: HTMLDivElement;
  let chatContainer: HTMLDivElement;

  // Scroll to bottom function
  function scrollToBottom() {
    if (chatEndRef) {
      chatEndRef.scrollIntoView({ behavior: 'smooth' });
      isScrolledAway = false;
    }
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
      addMessage('assistant', 'Connection restored! You can continue using the Analytics Assistant.');
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
    
    const newMessage: Message = {
      id: v7(),
      role,
      content
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

    if (inactivityTimerRef) {
      clearInterval(inactivityTimerRef);
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
    const button = menuConfig.menuButtons.conversation.find((b) => b.id === buttonId);
    if (!button) return;

    switch (buttonId) {
      case 'back':
        chatState.stage = 'initial';
        addMessage('assistant', 'What would you like to do with your data analytics?');
        break;
      case 'end':
        addMessage('assistant', 'Thank you for using our service. The conversation has ended.');
        chatState.stage = 'welcome';
        break;
      case 'question':
        chatState.stage = 'question';
        addMessage('assistant', 'What question would you like to ask?');
        break;
    }
  }

  async function handleSendQuestion(question: string) {
    // Removed chatInputError assignments as the variable is unused
    // Check for question length
    if (question.length > MAX_QUESTION_LENGTH) {
      console.warn(`Question exceeds max length (${MAX_QUESTION_LENGTH}): ${question}`);
      // Handle the error appropriately, e.g., show a notification, since chatInputError is not displayed
      chatState.loading = false; // Ensure loading is off if we return early
      return;
    }

    // Basic validation to disallow SQL keywords and common code patterns
    const disallowedPattern =
      /(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|UNION|JOIN|--|\/\*|<\/?script>|<\/?iframe>|javascript:|eval\s*\(|function\s*\(|\=>|\{|\})/i;

    if (disallowedPattern.test(question)) {
      console.warn(`Question contains disallowed pattern: ${question}`);
      // Handle the error appropriately, e.g., show a notification
      chatState.loading = false; // Ensure loading is off
      return; // Stop execution if validation fails
    }

    // Check connection status before attempting the API call
    if (!isConnected) {
      // Check if there's already a connection error message to avoid duplicates
      const connectionErrorMsg = 'Cannot connect to the service. Please check your network connection and try again later.';
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

    // Use the actual N8N API endpoint or configure via an environment variable
    const n8nEndpoint = import.meta.env.VITE_N8N_ANALYTICS_WEBHOOK_URL || '';
    
    // Initialize the activity tracker
    const TIMEOUT_MINUTES = Number(import.meta.env.VITE_ANALYTICS_CHATBOT_TIMEOUT) || 5; // Default to 5 minutes
    
    activityTracker = new ActivityTracker({
      timeoutMinutes: TIMEOUT_MINUTES,
      connectionCheckEndpoint: n8nEndpoint,
      connectionCheckTimeout: 5000,
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
      addMessage('assistant', 'Warning: Cannot connect to the Analytics service. The chat functionality may be limited until connection is restored.');
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
  {#if !isConnected}
    <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-2 text-sm flex items-center justify-between">
      <div class="flex items-center">
        <svg class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Connection to Analytics service lost. Please click Retry to reconnect.</span>
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
              addMessage('assistant', 'Connection restored! You can continue using the Analytics Assistant.');
              if (chatState.stage === 'welcome') {
                chatState.stage = 'initial';
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
    class="flex-grow overflow-y-auto bg-gradient-to-b-gray-white chat-container custom-scrollbar"
    on:wheel={(e) => e.stopPropagation()}
    bind:this={chatContainer}
  >
    <div class="px-3 md:px-6 lg:px-8 pt-4 pb-16 w-full">
      {#if chatState.messages.length === 0}
        <div class="flex flex-col items-center justify-center py-20 w-full">
          <div class="flex flex-col items-center">
            <div class="rounded-full bg-gradient-to-br-blue-teal shadow mb-8">
              <div
                class="logo-circle flex items-center justify-center text-white text-5xl font-bold"
              >
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
                  <span class="text-base font-medium mx-2"> Start New Conversation </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      {/if}

      {#each chatState.messages as msg (msg.id)}
        <div class="mb-8">
          <div class="text-sm mb-1 {msg.role === 'user' ? 'text-right' : 'text-left'}">
            <span class="text-gray-500 font-medium">
              {msg.role === 'user' ? 'You' : 'Assistant'}
            </span>
          </div>
          <ChatMessage message={msg} />
        </div>
      {/each}

      {#if !chatState.loading}
        {#if chatState.stage !== 'welcome' && chatState.stage !== 'question'}
          {#if chatState.stage === 'initial'}
            <div class="mt-4">
              <OptionsButtons
                buttons={menuConfig.menuButtons.main as OptionsButtonType[]}
                onSelect={handleInitialOption}
              />
            </div>
          {:else if chatState.stage === 'asking_duration'}
            <div class="mt-4">
              <div class="flex items-center justify-center">
                <div class="relative mr-3">
                  <input
                    type="number"
                    bind:value={durationInput}
                    min="1"
                    max="60"
                    class="input-number border rounded-lg px-4 py-2 w-24 text-center font-medium {durationError
                      ? 'border-red-500'
                      : 'border-gray-300'}"
                    placeholder="12"
                  />
                </div>
                <button
                  on:click={handleDurationSubmit}
                  class="btn-gradient text-white font-semibold py-2 px-5 rounded-full shadow"
                >
                  <div class="flex items-center justify-center">
                    <span class="text-base">✅</span>
                    <span class="font-medium text-sm mx-1"> Submit </span>
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
                onSelect={handlePostResponseOption}
              />
            </div>
          {/if}
        {/if}

        {#if chatState.stage === 'welcome' && chatState.messages.length > 0}
          <div class="flex justify-center mt-6">
            <!-- If we're not connected, show the Try Again button with connection check -->
            {#if !isConnected}
              <button
                on:click={(e) => {
                  // Visual feedback
                  const btn = e.currentTarget as HTMLButtonElement;
                  const originalInnerHTML = btn.innerText;
                  btn.innerText = 'Checking Connection...';
                  btn.disabled = true;
                  
                  // Check connection using the activity tracker
                  if (activityTracker) {
                    activityTracker.retryConnection().then((online) => {
                    isConnected = online;
                    // Reset button
                    setTimeout(() => {
                      btn.innerText = originalInnerHTML;
                      btn.disabled = false;
                    }, 1000);
                    
                    if (online) {
                      // If connected, start a new conversation
                      startConversation();
                    }
                    // If not connected, do nothing - the connection banner will still show
                    });
                  }
                }}
                class="btn-gradient text-white font-semibold py-3 px-8 rounded-full shadow"
              >
                Try Again
              </button>
            {:else}
              <button
                on:click={startConversation}
                class="btn-gradient text-white font-semibold py-3 px-8 rounded-full shadow"
              >
                Start New Conversation
              </button>
            {/if}
          </div>
        {/if}
      {/if}

      {#if chatState.loading}
        <div class="flex justify-center items-center my-6">
          <div class="thinking-loader">
            <div class="thinking-inline">
              <span class="thinking-text">Processing</span>
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
        <ChatInput
          onSendQuestion={handleSendQuestion}
          disabled={chatState.loading}
          maxLength={MAX_QUESTION_LENGTH}
        />
      </div>
    </div>
  {/if}
</div>
