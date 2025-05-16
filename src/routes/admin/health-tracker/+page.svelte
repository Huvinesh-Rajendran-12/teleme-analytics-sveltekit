<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getStoredAdminToken } from '$lib/utils/auth';
  import { fetchHealthTrackerConversations } from '$lib/services/adminService';
  import { APPLICATION_TYPES } from '$lib/config/admin';
  import { logDebug, logError } from '$lib/utils/secureLogger';
  import { parseAIMessageContent } from '$lib/utils/markdownParser';
  import AdminLayout from '$lib/components/admin/AdminLayout.svelte';
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

  // Derived state
  $: hasConversations = conversations && conversations.length > 0;

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
      error = null;
      connectionIssue = false;

      if (attempt > 1) {
        retrying = true;
      }

      logDebug('Loading health tracker conversations, page:', currentPage);

      // Call the service function with timeout
      const result = (await Promise.race([
        fetchHealthTrackerConversations(currentPage, 10),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 15000)
        )
      ])) as any;

      logDebug('Fetch result type:', typeof result);

      // Process the result based on its structure
      if (Array.isArray(result) && result.length > 0) {
        // If it's an array as expected
        const data = result[0];
        if (data && typeof data === 'object' && 'conversations' in data) {
          conversations = data.conversations || [];
          totalPages = data.total_pages || 1;

          logDebug('Successfully loaded conversations:', conversations.length);
          logDebug('Total pages:', totalPages);
        } else {
          logError('Invalid data structure:', data);
          error = 'Invalid data format from server. Please contact support.';
          conversations = [];
        }
      } else if (result && typeof result === 'object' && 'conversations' in result) {
        // If it's a direct object
        conversations = result.conversations || [];
        totalPages = result.total_pages || 1;

        logDebug('Successfully loaded conversations from direct object:', conversations.length);
      } else {
        logError('Unexpected result format:', result);
        error = 'Unexpected data format received. Please contact support.';
        conversations = [];
      }
    } catch (err) {
      logError('Error loading conversations:', err);

      // Handle specific error cases
      if (err instanceof Error) {
        if (err.message.includes('timeout') || err.message.includes('network')) {
          connectionIssue = true;
          error = 'Connection issue. Please check your internet connection and try again.';
        } else {
          error = 'Failed to load conversations. Please try again later.';
        }
      } else {
        error = 'An unexpected error occurred. Please try again.';
      }

      // If there was an error and we haven't tried too many times, retry
      if (attempt < 3) {
        logDebug(`Retrying load (attempt ${attempt + 1})...`);
        setTimeout(() => loadConversations(attempt + 1), 1500);
        return;
      }

      conversations = [];
    } finally {
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

  function renderMessageContent(message: any): string {
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
    <!-- Header section -->
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
              <!-- Health Tracker Icon Placeholder -->
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 21.052l-1.405-1.405c-4.072-3.41-6.595-5.64-6.595-8.312 0-2.21 1.79-4 4-4 1.44 0 2.815.78 3.5.975A3.992 3.992 0 0112 7.332c.685.195 2.06.975 3.5 0 2.21 0 4 1.79 4 4 0 2.672-2.523 4.902-6.595 8.312L12 21.052z"
                />
              </svg>
            </div>
            Health Tracker Summary Conversations
          </h1>
          <p class="text-gray-600 mt-2 max-w-3xl">
            Manage and monitor conversations from the Health Tracker Summary application. View user
            interactions, conversation details, and progress summaries.
          </p>
        </div>
        <div class="mt-4 md:mt-0 flex space-x-2">
          <!-- Refresh button -->
          <button
            on:click={() => loadConversations()}
            disabled={loading}
            class="inline-flex items-center justify-center rounded-md bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 ease-in-out"
          >
            {#if loading}
              <svg
                class="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-700"
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
        </div>
      </div>
    </div>

    <!-- Metric Cards -->
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
              <!-- Icon placeholder: Document/File -->
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0111.707 2.293L15.707 6.293A2 2 0 0116 7.707V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-xs text-gray-500 font-medium">Total Sessions</p>
              <p class="text-xl font-bold text-gray-900">{/* Placeholder value */ 'N/A'}</p>
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
              <!-- Icon placeholder: Clock -->
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
              <p class="text-xs text-gray-500 font-medium">Avg Session Duration</p>
              <p class="text-xl font-bold text-gray-900">{/* Placeholder value */ 'N/A'}</p>
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
              <!-- Icon placeholder: Checkmark -->
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
              <p class="text-xs text-gray-500 font-medium">Completed Plans</p>
              <p class="text-xl font-bold text-gray-900">{/* Placeholder value */ 'N/A'}</p>
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
              <!-- Icon placeholder: User group -->
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
              <p class="text-xs text-gray-500 font-medium">Active Users</p>
              <p class="text-xl font-bold text-gray-900">{/* Placeholder value */ 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error message -->
    {#if error}
      <div
        class="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-700 shadow-sm"
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
                  class="inline-flex rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
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
              class="border border-gray-200 rounded-lg overflow-hidden shadow-sm bg-white"
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
        class="rounded-lg bg-white border border-gray-200 shadow-sm py-12 px-6"
        in:fade={{ duration: 300 }}
      >
        <div class="text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="mx-auto h-16 w-16 text-gray-300"
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
          <h3 class="mt-4 text-lg font-medium text-gray-900">No conversations found</h3>
          <p class="mt-2 text-sm text-gray-500">
            There are no Health Tracker Summary conversations to display at this time.
          </p>
          <div class="mt-6">
            <button
              on:click={() => loadConversations()}
              class="inline-flex items-center rounded-md bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
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
                  <span>User: {conversation.user_name}</span>
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
                <span class="text-sm text-gray-600 mr-3 bg-gray-100 rounded-full px-2 py-1">
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
                                  class="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0"
                                >
                                  AI
                                </div>
                                <div class="prose prose-sm max-w-none">
                                  {@html renderMessageContent(msgItem.message)}
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
                                  class="h-6 w-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0"
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
                                class="h-6 w-6 rounded-full bg-gray-500 text-white flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0"
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
