<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getStoredAdminToken } from '$lib/utils/auth';
  import { fetchAnalyticsChatbotConversations } from '$lib/services/adminService';
  import { APPLICATION_TYPES } from '$lib/config/admin';
  import { logDebug, logError } from '$lib/utils/secureLogger';
  import { parseAIMessageContent } from '$lib/utils/markdownParser';
  import AdminLayout from '$lib/components/admin/AdminLayout.svelte';
  import SafeHtml from '$lib/components/common/SafeHtml.svelte';
  import type { ConversationListItem } from '$lib/types/conversations';
  import { fade, fly } from 'svelte/transition';

  // State
  let loading = true;
  let error: string | null = null;
  let conversations: ConversationListItem[] = [];
  let totalPages = 1;
  let currentPage = 1;
  let expanded: Record<string, boolean> = {};
  let retrying = false;
  let connectionIssue = false;
  let showLoadingSkeleton = true;

  // Placeholder metrics - these would come from API in a real implementation
  const metrics = {
    activeUsers: 127,
    totalConversations: 843,
    avgResponseTime: '1.4s',
    completionRate: '96.5%',
    topCategories: [
      { name: 'User Queries', count: 342, percentage: 41 },
      { name: 'Support Requests', count: 227, percentage: 27 },
      { name: 'General Info', count: 165, percentage: 19 },
      { name: 'Other', count: 109, percentage: 13 }
    ]
  };

  // Filter state
  let searchQuery = '';
  let selectedDateRange = 'all';
  let selectedStatus = 'all';

  // Derived state
  $: hasConversations = conversations && conversations.length > 0;
  // $: filteredConversations = conversations; // In a real app, apply filters here

  // Check if admin is logged in and load data
  onMount(async () => {
    const token = getStoredAdminToken();
    logDebug('Admin token present:', Boolean(token));

    if (!token) {
      logDebug('No admin token found, redirecting to login');
      goto('/admin/login');
      return;
    }

    // Load conversations
    await loadConversations();

    // Small delay before removing skeleton to ensure smooth transitions
    setTimeout(() => {
      showLoadingSkeleton = false;
    }, 300);
  });

  // Load conversations with error handling and retry logic
  async function loadConversations(attempt = 1) {
    try {
      loading = true;
      error = null; // Clear previous error
      connectionIssue = false; // Clear previous connection issue

      if (attempt > 1) {
        retrying = true;
      }

      logDebug('Loading analytics chatbot conversations, page:', currentPage);

      // Define the expected successful response type
      interface FetchConversationResponse {
        conversations: ConversationListItem[];
        total_pages: number;
      }

      // Define the possible types that the fetch service function might return
      // Based on the current processing logic, it seems it might return a direct object
      // or an array containing the object as the first element.
      type PossibleFetchResult = FetchConversationResponse | FetchConversationResponse[];

      // Call the service function with timeout
      // Promise.race will resolve with the value of the first promise that resolves,
      // or reject with the reason of the first promise that rejects.
      // The timeout promise only rejects, so if it wins, Promise.race rejects.
      // If fetchAnalyticsChatbotConversations resolves first, Promise.race resolves with its value.
      const result = await Promise.race([
        fetchAnalyticsChatbotConversations(currentPage, 10) as Promise<PossibleFetchResult>, // Explicitly cast the service promise return type to remove 'any'
        new Promise<never>(
          (
            _,
            reject // Use never because this promise only rejects
          ) => setTimeout(() => reject(new Error('Request timeout')), 15000)
        )
      ]);

      logDebug('Fetch result type:', typeof result);
      // logDebug('Fetch result:', result); // Keep logging cautious

      let conversationData: FetchConversationResponse | null = null;

      // Process the result based on its structure
      if (result && typeof result === 'object') {
        if (Array.isArray(result) && result.length > 0) {
          // If it's an array, expect the first element to be the data object
          const dataObject = result[0];
          if (
            dataObject &&
            typeof dataObject === 'object' &&
            'conversations' in dataObject &&
            'total_pages' in dataObject
          ) {
            // Basic structural check before casting
            if (
              Array.isArray(dataObject.conversations) &&
              typeof dataObject.total_pages === 'number'
            ) {
              conversationData = dataObject as FetchConversationResponse; // Now safe to cast
            } else {
              logError('Invalid array element structure:', dataObject);
              error =
                'Invalid data format from server (array element structure). Please contact support.';
            }
          } else {
            logError('Invalid data structure: Array element is not a valid object', dataObject);
            error = 'Invalid data format from server (array element type). Please contact support.';
          }
        } else if ('conversations' in result && 'total_pages' in result) {
          // If it's a direct object, check structure
          if (Array.isArray(result.conversations) && typeof result.total_pages === 'number') {
            conversationData = result as FetchConversationResponse; // Now safe to cast
          } else {
            logError('Invalid direct object structure:', result);
            error =
              'Invalid data format from server (direct object structure). Please contact support.';
          }
        } else {
          logError('Unexpected object structure:', result);
          error = 'Unexpected object format received. Please contact support.';
        }
      } else {
        logError('Unexpected result type or null:', result);
        error = 'Unexpected data format received. Please contact support.';
      }

      if (conversationData) {
        conversations = conversationData.conversations || []; // Ensure conversations is an array
        totalPages = conversationData.total_pages || 1; // Ensure totalPages is at least 1

        logDebug('Successfully loaded conversations:', conversations.length);
        logDebug('Total pages:', totalPages);
      } else {
        // If conversationData is null, an error was already set above due to invalid format
        conversations = []; // Clear conversations on invalid format error
        totalPages = 1; // Reset total pages on invalid format error
      }
    } catch (err) {
      // This block catches errors thrown by fetchAnalyticsChatbotConversations
      // or the timeout error from Promise.race
      logError('Error loading conversations:', err);

      // Handle specific error cases
      if (err instanceof Error) {
        // Check for the specific timeout error message or network issues
        if (err.message === 'Request timeout' || err.message.includes('network')) {
          connectionIssue = true;
          error = 'Connection issue. Please check your internet connection and try again.';
        } else {
          // Assume other Errors are server-side API errors or unexpected issues
          error = 'Failed to load conversations. Please try again later.';
        }
      } else {
        // Catch non-Error rejections
        error = 'An unexpected error occurred while fetching data. Please try again.';
      }

      // Retry logic: Only retry if there's a connection issue, timeout,
      // or a generic error (not an invalid format error handled in the try block)
      // and we haven't exceeded max attempts.
      // The error message is checked to avoid retrying on server format errors.
      const isRetriableError =
        connectionIssue ||
        (err instanceof Error &&
          err.message !==
            'Invalid data format from server (array element structure). Please contact support.' &&
          err.message !==
            'Invalid data format from server (array element type). Please contact support.' &&
          err.message !== 'Invalid direct object structure. Please contact support.' &&
          err.message !== 'Unexpected object format received. Please contact support.' &&
          err.message !== 'Unexpected data format received. Please contact support.');

      if (isRetriableError && attempt < 3) {
        logDebug(`Retrying load (attempt ${attempt + 1})...`);
        // Do not clear error/connectionIssue here, let the retry attempt update it.
        // Just wait and call the function again.
        setTimeout(() => loadConversations(attempt + 1), 1500);
        return; // Stop processing this failed attempt
      }

      // If max retries reached or error is not retriable, finalize the error state
      conversations = []; // Ensure conversations array is empty on final failure
      totalPages = 1; // Reset total pages on final failure
    } finally {
      // This runs after try or catch block finishes
      loading = false;
      retrying = false;
    }
  }

  // Navigation functions
  function previousPage() {
    if (currentPage > 1 && !loading) {
      currentPage--;
      loadConversations();
    }
  }

  function nextPage() {
    if (currentPage < totalPages && !loading) {
      currentPage++;
      loadConversations();
    }
  }

  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages && page !== currentPage && !loading) {
      currentPage = page;
      loadConversations();
    }
  }

  // UI interaction functions
  function toggleConversation(id: string) {
    expanded = {
      ...expanded,
      [id]: !expanded[id]
    };
  }

  // Utility functions
  function formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }

  function formatRelativeTime(dateString: string): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffDays > 30) {
        return formatDate(dateString);
      } else if (diffDays > 0) {
        return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
      } else if (diffHours > 0) {
        return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
      } else if (diffMinutes > 0) {
        return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
      } else {
        return 'Just now';
      }
    } catch {
      return dateString;
    }
  }

  // Define a proper message type interface
  interface ChatMessage {
    type?: string;
    content?: string;
    [key: string]: unknown;
  }

  function renderMessageContent(message: ChatMessage | null | undefined): string {
    if (!message) return '';

    try {
      if (message.type === 'ai' || message.type === 'assistant') {
        return parseAIMessageContent(message);
      } else {
        // Human message - don't parse markdown for human messages
        return message.content || '';
      }
    } catch (e) {
      logError('Error displaying message:', e);
      return 'Error displaying message';
    }
  }

  // Generate pagination numbers
  function getPaginationNumbers(): number[] {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: number[] = [];

    // Always show first page
    pages.push(1);

    // Middle pages
    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(totalPages - 1, currentPage + 1);

    // Ensure at least 3 middle pages if possible
    if (endPage - startPage < 2) {
      if (startPage === 2) {
        endPage = Math.min(totalPages - 1, startPage + 2);
      } else if (endPage === totalPages - 1) {
        startPage = Math.max(2, endPage - 2);
      }
    }

    // Add ellipsis before middle pages if needed
    if (startPage > 2) {
      pages.push(-1); // -1 represents ellipsis
    }

    // Add middle pages
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Add ellipsis after middle pages if needed
    if (endPage < totalPages - 1) {
      pages.push(-2); // -2 represents ellipsis
    }

    // Always show last page
    pages.push(totalPages);

    return pages;
  }
</script>

<AdminLayout>
  <div class="max-w-7xl mx-auto px-4 py-6" in:fade={{ duration: 300, delay: 100 }}>
    <!-- Header with metrics -->
    <div class="mb-8">
      <div class="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1
            class="text-3xl font-bold text-gray-900 flex items-center group"
            in:fly={{ y: -20, duration: 400 }}
          >
            <div
              class="mr-3 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0 group-hover:bg-blue-200 transition-colors"
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
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            Analytics Chatbot Conversations
          </h1>
          <p class="text-gray-600 mt-2 max-w-3xl">
            Manage and monitor conversations from the Analytics Chatbot application. View user
            interactions, conversation details, and engagement metrics.
          </p>
        </div>

        <div class="mt-4 md:mt-0 flex space-x-2">
          <button
            on:click={() => loadConversations()}
            disabled={loading}
            class="inline-flex items-center justify-center rounded-md bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-4 py-2 text-sm font-medium text-white shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {#if loading}
              <svg
                class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              {retrying ? 'Retrying...' : 'Refreshing...'}
            {:else}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            {/if}
          </button>

          <button
            class="inline-flex items-center justify-center rounded-md bg-gray-50 border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            Filter
          </button>
        </div>
      </div>

      <!-- Key Metrics -->
      <div
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        in:fly={{ y: 20, duration: 400, delay: 200 }}
      >
        <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div class="h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
          <div class="p-4">
            <div class="flex items-center">
              <div
                class="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"
                  />
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-xs text-gray-500 font-medium">Active Sessions</p>
                <p class="text-xl font-bold text-gray-900">{metrics.activeUsers}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div class="h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
          <div class="p-4">
            <div class="flex items-center">
              <div
                class="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-xs text-gray-500 font-medium">Total Conversations</p>
                <p class="text-xl font-bold text-gray-900">{metrics.totalConversations}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div class="h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
          <div class="p-4">
            <div class="flex items-center">
              <div
                class="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-xs text-gray-500 font-medium">Avg Response Time</p>
                <p class="text-xl font-bold text-gray-900">{metrics.avgResponseTime}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div class="h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
          <div class="p-4">
            <div class="flex items-center">
              <div
                class="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-xs text-gray-500 font-medium">Completion Rate</p>
                <p class="text-xl font-bold text-gray-900">{metrics.completionRate}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters and Search -->
      <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label for="search" class="block text-xs font-medium text-gray-700 mb-1"
              >Search Conversations</label
            >
            <div class="relative rounded-md shadow-sm">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  class="h-4 w-4 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <input
                type="text"
                name="search"
                id="search"
                bind:value={searchQuery}
                class="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 pr-3 py-2 sm:text-sm border-gray-300 rounded-md"
                placeholder="Search by user or content"
              />
            </div>
          </div>

          <div>
            <label for="date-range" class="block text-xs font-medium text-gray-700 mb-1"
              >Date Range</label
            >
            <select
              id="date-range"
              bind:value={selectedDateRange}
              class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <div>
            <label for="status" class="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select
              id="status"
              bind:value={selectedStatus}
              class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="active">Active</option>
              <option value="abandoned">Abandoned</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Error message -->
    {#if error}
      <div
        class="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700 shadow-sm border border-red-200"
        in:fly={{ y: -10, duration: 200 }}
        out:fade={{ duration: 150 }}
      >
        <div class="flex">
          <svg
            class="h-5 w-5 text-red-400 mr-2"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
              clip-rule="evenodd"
            />
          </svg>
          <div>
            <p>{error}</p>
            {#if connectionIssue}
              <div class="mt-2">
                <button
                  on:click={() => loadConversations()}
                  class="inline-flex rounded-md bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 transition-colors"
                >
                  Try Again
                </button>
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    <!-- Loading state -->
    {#if loading && showLoadingSkeleton}
      <div in:fade={{ duration: 150 }}>
        <!-- Loading skeleton -->
        <div class="space-y-4">
          {#each Array(5) as _, i}
            <div
              class="border border-gray-100 rounded-xl overflow-hidden shadow-sm bg-white"
              in:fade={{ duration: 200, delay: i * 50 }}
            >
              <div class="flex justify-between items-center p-4">
                <div class="w-1/3">
                  <div class="h-5 bg-gray-200 rounded animate-pulse"></div>
                  <div class="h-3 bg-gray-100 rounded animate-pulse mt-2 w-1/2"></div>
                </div>
                <div class="flex items-center">
                  <div class="h-4 w-16 bg-gray-200 rounded animate-pulse mr-4"></div>
                  <div class="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {:else if !hasConversations && !loading}
      <!-- Empty state -->
      <div
        class="rounded-xl bg-white border border-gray-100 shadow-sm py-12 px-6"
        in:fade={{ duration: 300 }}
      >
        <div class="text-center">
          <div class="mx-auto h-20 w-20 rounded-full bg-blue-50 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-10 w-10 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h3 class="mt-4 text-lg font-medium text-gray-900">No conversations found</h3>
          <p class="mt-2 text-sm text-gray-500 max-w-md mx-auto">
            There are no Analytics Chatbot conversations to display at this time. Check your filters
            or try again later.
          </p>
          <div class="mt-6">
            <button
              on:click={() => loadConversations()}
              class="inline-flex items-center rounded-md bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-4 py-2 text-sm font-medium text-white shadow-sm hover:shadow"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>
    {:else}
      <!-- Conversation list -->
      <div class="space-y-4">
        {#each conversations as conversation, i (conversation.session_id)}
          <div
            class="border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 bg-white transform hover:-translate-y-1"
            in:fade={{ duration: 300, delay: Math.min(i * 50, 300) }}
          >
            <div class="h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
            <div class="flex flex-col md:flex-row md:justify-between md:items-center p-4">
              <div>
                <h3 class="font-medium text-gray-900 flex items-center">
                  <div
                    class="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0 mr-2"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-3 w-3"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </div>
                  <span>{conversation.user_name}</span>
                </h3>
                <p class="text-xs text-gray-500 mt-1 flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-3 w-3 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span title={formatDate(conversation.last_activity)}>
                    {formatRelativeTime(conversation.last_activity)}
                  </span>
                </p>
              </div>
              <div class="flex items-center mt-2 md:mt-0">
                <span
                  class="text-sm text-blue-700 mr-3 bg-blue-50 rounded-full px-2.5 py-1 font-medium"
                >
                  {conversation.conversation_history?.length || 0} messages
                </span>
                <div class="flex space-x-3">
                  <button
                    on:click={() =>
                      goto(
                        `/admin/conversation/${conversation.session_id}?application=${APPLICATION_TYPES.ANALYTICS_CHATBOT}`
                      )}
                    class="text-blue-600 hover:text-blue-800 rounded-full p-1.5 hover:bg-blue-50 transition-colors duration-150"
                    title="View detailed conversation"
                    aria-label="View detailed conversation"
                  >
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  </button>
                  <button
                    on:click={() => toggleConversation(conversation.session_id)}
                    class="text-gray-600 hover:text-gray-800 rounded-full p-1.5 hover:bg-gray-100 transition-colors duration-150"
                    title="Toggle preview"
                    aria-label="Toggle conversation preview"
                  >
                    <svg
                      class="h-5 w-5 transform {expanded[conversation.session_id]
                        ? 'rotate-180'
                        : ''} transition-transform"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- Conversation preview -->
            {#if expanded[conversation.session_id]}
              <div
                class="p-4 bg-gray-50 border-t border-gray-100"
                transition:fly={{ y: 10, duration: 200 }}
              >
                {#if conversation.conversation_history && conversation.conversation_history.length > 0}
                  <div class="space-y-3">
                    {#each conversation.conversation_history as msgItem, index}
                      {#if msgItem}
                        {#if msgItem.message}
                          {#if msgItem.message.type === 'ai' || msgItem.message.type === 'assistant'}
                            <div
                              class="rounded-xl bg-blue-50 border border-blue-100 p-3"
                              in:fade={{ duration: 200, delay: index * 40 }}
                            >
                              <div class="flex items-start">
                                <div
                                  class="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0 shadow-sm"
                                >
                                  AI
                                </div>
                                <div class="prose prose-sm max-w-none">
                                  <SafeHtml html={renderMessageContent(msgItem.message)} />
                                </div>
                              </div>
                            </div>
                          {:else}
                            <div
                              class="rounded-xl bg-amber-50 border border-amber-100 p-3"
                              in:fade={{ duration: 200, delay: index * 40 }}
                            >
                              <div class="flex items-start">
                                <div
                                  class="h-7 w-7 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0 shadow-sm"
                                >
                                  U
                                </div>
                                <div>
                                  {renderMessageContent(msgItem.message)}
                                </div>
                              </div>
                            </div>
                          {/if}
                        {:else}
                          <div
                            class="rounded-xl bg-gray-100 border border-gray-200 p-3"
                            in:fade={{ duration: 200, delay: index * 40 }}
                          >
                            <div class="flex items-start">
                              <div
                                class="h-7 w-7 rounded-full bg-gray-500 text-white flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0"
                              >
                                ?
                              </div>
                              <div>Invalid message format</div>
                            </div>
                          </div>
                        {/if}
                      {/if}
                    {/each}
                  </div>
                {:else}
                  <div class="text-center py-6">
                    <p class="text-gray-500">No messages in this conversation preview.</p>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>

      <!-- Pagination -->
      {#if totalPages > 1}
        <div class="mt-8 flex justify-center">
          <nav class="relative z-0 inline-flex rounded-xl shadow-sm" aria-label="Pagination">
            <!-- Previous page -->
            <button
              on:click={previousPage}
              disabled={currentPage === 1 || loading}
              class="relative inline-flex items-center px-3 py-2 rounded-l-xl border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span class="sr-only">Previous</span>
              <svg
                class="h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fill-rule="evenodd"
                  d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>

            <!-- Page numbers -->
            {#each getPaginationNumbers() as page}
              {#if page === -1 || page === -2}
                <!-- Ellipsis -->
                <span
                  class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                >
                  ...
                </span>
              {:else}
                <button
                  on:click={() => goToPage(page)}
                  class="relative inline-flex items-center px-4 py-2 border border-gray-300 {page ===
                  currentPage
                    ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-200 z-10 font-medium'
                    : 'bg-white text-gray-500 hover:bg-gray-50'} text-sm"
                >
                  {page}
                </button>
              {/if}
            {/each}

            <!-- Next page -->
            <button
              on:click={nextPage}
              disabled={currentPage === totalPages || loading}
              class="relative inline-flex items-center px-3 py-2 rounded-r-xl border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span class="sr-only">Next</span>
              <svg
                class="h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fill-rule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
          </nav>
        </div>
      {/if}
    {/if}
  </div>
</AdminLayout>
