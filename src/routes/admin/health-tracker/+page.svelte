<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getStoredAdminToken } from '$lib/utils/auth';
  import { fetchHealthTrackerConversations } from '$lib/services/adminService';
  import { APPLICATION_TYPES } from '$lib/config/admin';
  import { logDebug } from '$lib/utils/secureLogger';
  import ConversationsList from '$lib/components/admin/conversations/ConversationsList.svelte';
  import AdminLayout from '$lib/components/admin/AdminLayout.svelte';

  // Check if admin is logged in
  onMount(() => {
    const token = getStoredAdminToken();
    logDebug('Admin token present:', Boolean(token));

    if (!token) {
      logDebug('No admin token found, redirecting to login');
      goto('/admin/login');
    }
  });
</script>

<AdminLayout>
  <h1 class="text-2xl font-bold mb-6">Health Tracker Summary Conversations</h1>
  
  <ConversationsList 
    application={APPLICATION_TYPES.HEALTH_TRACKER_SUMMARY}
    fetchConversationsFunction={fetchHealthTrackerConversations}
  />
</AdminLayout>
