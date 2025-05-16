<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getStoredAdminToken } from '$lib/utils/auth';
  import { fetchAnalyticsChatbotConversations } from '$lib/services/adminService';
  import { APPLICATION_TYPES } from '$lib/config/admin';
  import { logDebug, logError } from '$lib/utils/secureLogger';
  import AdminLayout from '$lib/components/admin/AdminLayout.svelte';
  import type { ConversationListItem } from '$lib/types/conversations';

  // State
  let loading = true;
  let error: string | null = null;
  let conversations: ConversationListItem[] = [];
  let totalPages = 1;
  let currentPage = 1;
  let expanded: Record<string, boolean> = {};

  // Check if admin is logged in
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
  });
  
  async function loadConversations() {
    try {
      loading = true;
      error = null;
      
      logDebug('Loading analytics chatbot conversations, page:', currentPage);
      
      // Call the service function
      const result = await fetchAnalyticsChatbotConversations(currentPage, 10);
      
      logDebug('Fetch result type:', typeof result);
      logDebug('Is array?', Array.isArray(result));
      
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
          error = 'Invalid data format from server.';
          conversations = [];
        }
      } else if (result && typeof result === 'object' && 'conversations' in result) {
        // If it's a direct object
        conversations = result.conversations || [];
        totalPages = result.total_pages || 1;
        
        logDebug('Successfully loaded conversations from direct object:', conversations.length);
      } else {
        logError('Unexpected result format:', result);
        error = 'Invalid data format from server.';
        conversations = [];
      }
    } catch (err) {
      logError('Error loading conversations:', err);
      error = 'Failed to load conversations. Please try again later.';
      conversations = [];
    } finally {
      loading = false;
    }
  }
  
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
  
  function toggleConversation(id: string) {
    expanded = {
      ...expanded,
      [id]: !expanded[id]
    };
  }
  
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
    } catch (e) {
      return dateString;
    }
  }
  
  function renderMessageContent(message: any): string {
    if (!message) return '';
    
    try {
      if (message.type === 'ai' || message.type === 'assistant') {
        // Try to parse AI response JSON if available
        try {
          const json = JSON.parse(message.content);
          if (json && json.output && json.output.response) {
            return json.output.response;
          }
        } catch (e) {
          // If parsing fails, just return the content
        }
        return message.content;
      } else {
        // Human message
        return message.content;
      }
    } catch (e) {
      return 'Error displaying message';
    }
  }
</script>

<AdminLayout>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold mb-6">Analytics Chatbot Conversations</h1>
    
    {#if error}
      <div class="bg-red-50 text-red-700 p-4 rounded-md mb-6">
        {error}
      </div>
    {/if}
    
    {#if loading}
      <div class="text-center py-10">
        <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        <p class="mt-2 text-gray-700">Loading conversations...</p>
      </div>
    {:else if conversations.length === 0}
      <div class="text-center py-10 bg-gray-50 rounded-lg">
        <p class="text-gray-700">No conversations found for Analytics Chatbot.</p>
      </div>
    {:else}
      <div class="grid gap-6">
        {#each conversations as conversation (conversation.session_id)}
          <div class="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div class="flex justify-between items-center p-4 bg-gray-50">
              <div>
                <h3 class="font-medium">User: {conversation.user_name}</h3>
                <p class="text-xs text-gray-500 mt-1">
                  Last Activity: {formatDate(conversation.last_activity)}
                </p>
              </div>
              <div class="flex items-center">
                <span class="text-sm text-gray-600 mr-3">
                  {conversation.conversation_history?.length || 0} messages
                </span>
                <div class="flex space-x-3">
                  <button
                    on:click={() => goto(`/admin/conversation/${conversation.session_id}?application=${APPLICATION_TYPES.ANALYTICS_CHATBOT}`)}
                    class="text-blue-600 hover:text-blue-800"
                    title="View detailed conversation"
                  >
                    <svg
                      class="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
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
                    class="text-gray-600 hover:text-gray-800"
                    title="Toggle preview"
                  >
                    <svg
                      class="h-5 w-5 transform {expanded[conversation.session_id] ? 'rotate-180' : ''} transition-transform"
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
            
            {#if expanded[conversation.session_id]}
              <div class="p-4">
                {#if conversation.conversation_history && conversation.conversation_history.length > 0}
                  {#each conversation.conversation_history as msgItem, index}
                    {#if msgItem}
                      {#if msgItem.message}
                        {#if msgItem.message.type === 'ai' || msgItem.message.type === 'assistant'}
                          <div class="rounded-md bg-blue-50 p-3 mb-2">
                            <b>AI:</b>
                            <div class="prose prose-sm max-w-none inline-block align-top">
                              {renderMessageContent(msgItem.message)}
                            </div>
                          </div>
                        {:else}
                          <div class="rounded-md bg-amber-50 p-3 mb-2">
                            <b>Human:</b> {renderMessageContent(msgItem.message)}
                          </div>
                        {/if}
                      {:else}
                        <div class="rounded-md bg-gray-100 p-3 mb-2">
                          <b>Message:</b> Invalid message format
                        </div>
                      {/if}
                    {/if}
                  {/each}
                {:else}
                  <div class="text-center py-4">
                    <p class="text-gray-700">No messages in this conversation preview.</p>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>
      
      {#if totalPages > 1}
        <div class="flex justify-center mt-6">
          <nav class="inline-flex rounded-md shadow">
            <button
              on:click={previousPage}
              disabled={currentPage === 1 || loading}
              class="px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <div class="px-4 py-2 border-t border-b border-gray-300 bg-white text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </div>
            <button
              on:click={nextPage}
              disabled={currentPage === totalPages || loading}
              class="px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </nav>
        </div>
      {/if}
    {/if}
  </div>
</AdminLayout>