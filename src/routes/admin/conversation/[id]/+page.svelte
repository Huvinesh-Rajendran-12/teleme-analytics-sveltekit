<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { getStoredAdminToken } from '$lib/utils/auth';
  import { fetchConversationDetail } from '$lib/services/adminService';
  import { parseMessage } from '$lib/utils/messageParser';
  import { getApplicationDisplayName } from '$lib/config/admin';
  import { logDebug, logError } from '$lib/utils/secureLogger';
  import { parseAIMessageContent } from '$lib/utils/markdownParser';
  import AdminLayout from '$lib/components/admin/AdminLayout.svelte';
  import type { ConversationDetail } from '$lib/types/conversations';

  // State
  let conversation: ConversationDetail | null = null;
  let loading = true;
  let error: string | null = null;
  
  // Reactive values from URL
  $: conversationId = $page.params.id;
  $: application = $page.url.searchParams.get('application') || 'analytics_chatbot';
  $: appDisplayName = getApplicationDisplayName(application);

  onMount(async () => {
    const token = getStoredAdminToken();
    
    if (!token) {
      logDebug('No admin token found, redirecting to login');
      goto('/admin/login');
      return;
    }

    if (!conversationId) {
      error = 'Conversation ID is required';
      loading = false;
      return;
    }

    await loadConversation();
  });

  async function loadConversation() {
    loading = true;
    error = null;

    try {
      logDebug('Loading conversation details', { conversationId, application });
      const data = await fetchConversationDetail(conversationId, application);
      conversation = data;
      logDebug('Conversation loaded successfully', { messageCount: data.messages.length });
    } catch (err) {
      logError('Error loading conversation details:', err);
      error = 'Failed to load conversation details. Please try again later.';
    } finally {
      loading = false;
    }
  }

  function formatDate(date: Date): string {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleString();
    } catch (e) {
      logError('Error formatting date:', e);
      return String(date);
    }
  }

  function getBackLink(): string {
    return application === 'health_tracker_summary' 
      ? '/admin/health-tracker' 
      : '/admin/analytics-chatbot';
  }
</script>

<AdminLayout>
  <div class="max-w-4xl mx-auto">
    <div class="mb-6 flex justify-between items-center">
      <h1 class="text-2xl font-bold">Conversation Details</h1>
      <a 
        href={getBackLink()}
        class="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
      >
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
        </svg>
        Back to {appDisplayName}
      </a>
    </div>

    {#if error}
      <div class="bg-red-50 text-red-700 p-4 rounded-md mb-6">
        {error}
      </div>
    {/if}

    {#if loading}
      <div class="text-center py-10">
        <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        <p class="mt-2 text-gray-700">
          Loading conversation details...
        </p>
      </div>
    {:else if conversation}
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 class="text-lg font-semibold mb-4">Conversation Metadata</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-gray-500">Conversation ID</p>
            <p class="font-medium">{conversation.conversationId}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Application</p>
            <p class="font-medium">{appDisplayName}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Start Time</p>
            <p class="font-medium">{formatDate(conversation.metadata.startTime)}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">End Time</p>
            <p class="font-medium">{conversation.metadata.endTime ? formatDate(conversation.metadata.endTime) : 'Active'}</p>
          </div>
          {#if conversation.metadata.duration}
            <div>
              <p class="text-sm text-gray-500">Duration</p>
              <p class="font-medium">{conversation.metadata.duration}</p>
            </div>
          {/if}
          {#if conversation.metadata.action}
            <div>
              <p class="text-sm text-gray-500">Action</p>
              <p class="font-medium">{conversation.metadata.action}</p>
            </div>
          {/if}
          {#if conversation.metadata.referrer}
            <div class="col-span-2">
              <p class="text-sm text-gray-500">Referrer</p>
              <p class="font-medium break-all">{conversation.metadata.referrer}</p>
            </div>
          {/if}
          {#if conversation.metadata.userAgent}
            <div class="col-span-2">
              <p class="text-sm text-gray-500">User Agent</p>
              <p class="font-medium break-all">{conversation.metadata.userAgent}</p>
            </div>
          {/if}
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 class="text-lg font-semibold mb-4">Conversation Messages ({conversation.messages.length})</h2>
        
        {#if !conversation.messages || conversation.messages.length === 0}
          <div class="text-center py-4">
            <p class="text-gray-700">No messages in this conversation.</p>
          </div>
        {:else}
          <div class="space-y-4">
            {#each conversation.messages as message, index}
              {@const parsedMessage = parseMessage(message)}
              <div class="border-b border-gray-200 pb-4 {index === 0 ? '' : 'pt-4'}">
                <div class="flex justify-between items-start mb-2">
                  <div class="px-3 py-1 rounded-full {parsedMessage.role === 'human' || parsedMessage.role === 'user' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'} text-xs font-medium">
                    {parsedMessage.role === 'human' || parsedMessage.role === 'user' ? 'Human' : 'AI'}
                  </div>
                  <div class="text-xs text-gray-500">
                    {formatDate(message.timestamp)}
                  </div>
                </div>
                <div class="prose prose-sm max-w-none">
                  {#if parsedMessage.role === 'ai' || parsedMessage.role === 'assistant'}
                    <div class="whitespace-pre-wrap">{@html parseAIMessageContent(parsedMessage.content || '')}</div>
                  {:else}
                    <div class="whitespace-pre-wrap">{parsedMessage.content}</div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</AdminLayout>
