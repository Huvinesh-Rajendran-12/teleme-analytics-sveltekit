<script lang="ts">
import { onMount } from 'svelte';
import { goto } from '$app/navigation';
import type { ConversationListItem, ConversationsList as ConversationsListType, MessageItem } from '$lib/types/conversations';
import { parseMessage } from '$lib/utils/messageParser';
import { getApplicationDisplayName } from '$lib/config/admin';
import { logDebug, logError } from '$lib/utils/secureLogger';
// 'SvelteComponent' is not used, removing import
// import { SvelteComponent } from 'svelte';

// Import markdown processing if needed
// import { marked } from 'marked';

export let application: string;
export let fetchConversationsFunction: (page: number, pageSize: number) => Promise<ConversationsListType>;

// State
let conversations: ConversationListItem[] = [];
let loading = true;
let error: string | null = null;
let page = 1;
let totalPages = 1;
let expanded: Record<string, boolean> = {};

onMount(() => {
  loadConversations();
});

async function loadConversations() {
  logDebug("======== LOAD CONVERSATIONS FUNCTION STARTED ========");
  logDebug(`loadConversations called for page ${page}`);
  logDebug("Parameters:", { application, page });

  loading = true;
  error = null;

  try {
    const result = await fetchConversationsFunction(page, 10);

    if (result && typeof result === 'object' && 'conversations' in result) {
      logDebug(`Setting ${result.conversations.length} conversations in state.`);
      conversations = result.conversations;
      totalPages = result.total_pages;
      logDebug("State updated with conversations. Total pages:", result.total_pages);
    } else {
      logError("Invalid data structure in API response:", result);
      conversations = [];
      totalPages = 1;
      error = "Invalid data format from server.";
    }
  } catch (err) {
    logError("Error loading conversations:", err);
    error = "Failed to load conversations. Please try again later.";
    conversations = [];
    totalPages = 1;
  } finally {
    loading = false;
  }
}

function toggleConversation(id: string) {
  expanded = {
    ...expanded,
    [id]: !expanded[id]
  };
}

function formatLastActivity(dateString: string) {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    logError("Error formatting date:", e);
    return dateString;
  }
}

// '_index' is intentionally unused
function renderMessage(messageItem: MessageItem, _index: number) {
  if (!messageItem || !messageItem.message) return null;

  try {
    const parsedMessage = parseMessage(messageItem.message);

    if (parsedMessage.role === 'ai' || parsedMessage.role === 'assistant') {
      let aiContentToDisplay = parsedMessage.content;
      try {
        const aiResponseJson = JSON.parse(parsedMessage.content);
        if (
          aiResponseJson &&
          aiResponseJson.output &&
          typeof aiResponseJson.output.response === "string"
        ) {
          aiContentToDisplay = aiResponseJson.output.response;
        }
      } catch {
        // Fall back to raw content if there's an error
      }

      return {
        role: 'assistant',
        content: aiContentToDisplay
      };
    }

    // Human message
    return {
      role: 'human',
      content: parsedMessage.content
    };
  } catch (error) {
    logError("Error rendering message item:", error, messageItem);
    return {
      role: 'unknown',
      content: 'Error rendering message.'
    };
  }
}

function incrementPage() {
  if (page < totalPages) {
    page += 1;
    loadConversations();
  }
}

function decrementPage() {
  if (page > 1) {
    page -= 1;
    loadConversations();
  }
}

$: {
  // Re-load when page changes
  if (page) {
    loadConversations();
  }
}
</script>

<div class="max-w-6xl mx-auto">
  {#if error}
    <div class="bg-red-50 text-red-700 p-4 rounded-md mb-6">
      {error}
    </div>
  {/if}

  {#if loading}
    <div class="text-center py-10">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
      <p class="mt-2 text-gray-700">
        Loading conversations...
      </p>
    </div>
  {:else}
    {#if !conversations || conversations.length === 0}
      <div class="text-center py-10 bg-gray-50 rounded-lg">
        <p class="text-gray-700">
          No conversations found for {getApplicationDisplayName(application)}.
        </p>
      </div>
    {:else}
      <div class="grid gap-6">
        {#each conversations as conversation (conversation.session_id)}
          <div class="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div class="flex justify-between items-center p-4 bg-gray-50">
              <div>
                <h3 class="font-medium">
                  User: {conversation.user_name}
                </h3>
                <p class="text-xs text-gray-500 mt-1">
                  Last Activity: {formatLastActivity(conversation.last_activity)}
                </p>
              </div>
              <div class="flex items-center">
                <span class="text-sm text-gray-600 mr-3">
                  {conversation.conversation_history.length} messages
                </span>
                <div class="flex space-x-3">
                    <button
                        on:click={() => goto(`/admin/conversation/${conversation.session_id}?application=${application}`)}
                        class="text-blue-600 hover:text-blue-800"
                        title="View detailed conversation"
                        aria-label="View detailed conversation"
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
                        aria-label="Toggle preview"
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
                {#if conversation && conversation.conversation_history && Array.isArray(conversation.conversation_history) && conversation.conversation_history.length > 0}
                  {#each conversation.conversation_history as msgItem, index}
                    <div class="mb-3">
                      {#if msgItem}
                        {@const renderedMsg = renderMessage(msgItem, index)}
                        {#if renderedMsg}
                          {#if renderedMsg.role === 'assistant'}
                            <div class="rounded-md bg-blue-50 p-3 mb-2">
                              <b>AI:</b>
                              <div class="prose prose-sm max-w-none inline-block align-top">
                                {renderedMsg.content}
                              </div>
                            </div>
                          {:else if renderedMsg.role === 'human'}
                            <div class="rounded-md bg-amber-50 p-3 mb-2">
                              <b>Human:</b> {renderedMsg.content}
                            </div>
                          {:else}
                            <div class="rounded-md bg-gray-100 p-3 mb-2">
                              <b>Message:</b> {renderedMsg.content}
                            </div>
                          {/if}
                        {/if}
                      {/if}
                    </div>
                  {/each}
                {:else}
                  <div class="text-center py-4">
                    <p class="text-gray-700">
                      No messages in this conversation preview.
                    </p>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    {#if totalPages > 1}
      <div class="flex justify-center mt-6">
        <nav class="inline-flex rounded-md shadow">
          <button
            on:click={decrementPage}
            disabled={page === 1 || loading}
            class="px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <div class="px-4 py-2 border-t border-b border-gray-300 bg-white text-sm text-gray-700">
            Page {page} of {totalPages}
          </div>
          <button
            on:click={incrementPage}
            disabled={page === totalPages || loading}
            class="px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </nav>
      </div>
    {/if}
  {/if}
</div>
