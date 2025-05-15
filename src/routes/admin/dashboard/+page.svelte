<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation'; 
  import { getStoredAdminToken } from '$lib/utils/auth';
  import { logDebug } from '$lib/utils/secureLogger';
  import AdminDashboard from '$lib/components/admin/AdminDashboard.svelte';
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
  <h1 class="text-2xl font-bold mb-6">Dashboard Statistics</h1>
  <p class="text-gray-600 mb-8">
    View usage statistics for all applications. These statistics are updated in real-time.
  </p>
  
  <AdminDashboard />
</AdminLayout>
