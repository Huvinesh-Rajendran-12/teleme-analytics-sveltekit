<script lang="ts">
  import { onMount } from 'svelte';
  import { getStoredAdminToken } from '$lib/utils/auth';
  import { logError } from '$lib/utils/secureLogger';
  import AdminLayout from '$lib/components/admin/AdminLayout.svelte';
  import axios from 'axios';

  // State
  let loading = true;
  let error: string | null = null;
  let rawResponseData: Record<string, unknown> | null = null;
  let formattedData: Record<string, unknown> | null = null;
  let conversations: Record<string, unknown>[] = [];

  // Load data on mount
  onMount(async () => {
    await loadData();
  });

  // Direct call to debug endpoint
  async function loadData() {
    try {
      loading = true;
      error = null;

      const token = getStoredAdminToken();
      if (!token) {
        error = 'Authentication required. Please login as admin.';
        loading = false;
        return;
      }

      // Call the debug endpoint
      const response = await axios.get('/api/debug/analytics', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      rawResponseData = response.data;

      // Try to process the data
      if (response.data && response.data.data) {
        formattedData = response.data.data;

        // Check if data is array matching expected format
        if (Array.isArray(formattedData) && formattedData.length > 0) {
          const firstItem = formattedData[0];
          if (firstItem && firstItem.conversations && Array.isArray(firstItem.conversations)) {
            conversations = firstItem.conversations;
          }
        }
        // Also check direct object format
        else if (
          formattedData &&
          typeof formattedData === 'object' &&
          formattedData.conversations &&
          Array.isArray(formattedData.conversations)
        ) {
          conversations = formattedData.conversations;
        }
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error occurred';
      logError('Error loading data:', err);
    } finally {
      loading = false;
    }
  }

  function formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  }
</script>

<AdminLayout>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-6">Analytics Chatbot Conversations (Test Page)</h1>

    {#if loading}
      <div class="flex justify-center my-8">
        <div
          class="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full"
        ></div>
      </div>
    {:else if error}
      <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    {:else}
      <div class="mb-8">
        <h2 class="text-xl font-semibold mb-2">Debug Info</h2>
        <div class="bg-gray-50 p-4 rounded overflow-x-auto">
          <pre class="text-xs">{JSON.stringify(rawResponseData?.requestInfo || {}, null, 2)}</pre>
        </div>

        <h3 class="text-lg font-semibold mt-4 mb-2">Response Info</h3>
        <div class="bg-gray-50 p-4 rounded overflow-x-auto">
          <pre class="text-xs">{JSON.stringify(rawResponseData?.responseInfo || {}, null, 2)}</pre>
        </div>
      </div>

      <div class="mb-8">
        <h2 class="text-xl font-semibold mb-4">Conversations ({conversations.length})</h2>

        {#if conversations.length === 0}
          <p class="text-gray-500 text-center py-6 bg-gray-50 rounded">No conversations found</p>
        {:else}
          <div class="grid gap-4">
            {#each conversations as conversation}
              <div class="border border-gray-200 rounded-lg p-4 bg-white">
                <div class="flex justify-between mb-2">
                  <h3 class="font-medium">User: {conversation.user_name}</h3>
                  <span class="text-sm text-gray-500">
                    ID: {conversation.session_id}
                  </span>
                </div>
                <p class="text-sm text-gray-600">
                  Last Activity: {formatDate(conversation.last_activity)}
                </p>
                <p class="text-sm mt-2">
                  Messages: {conversation.conversation_history?.length || 0}
                </p>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</AdminLayout>
