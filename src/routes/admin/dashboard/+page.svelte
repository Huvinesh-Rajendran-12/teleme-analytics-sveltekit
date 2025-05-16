<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation'; 
  import { getStoredAdminToken } from '$lib/utils/auth';
  import { logDebug } from '$lib/utils/secureLogger';
  import AdminDashboard from '$lib/components/admin/AdminDashboard.svelte';
  import AdminLayout from '$lib/components/admin/AdminLayout.svelte';
  import { fade, fly } from 'svelte/transition';

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
  <div class="max-w-7xl mx-auto" in:fade={{ duration: 300 }}>
    <AdminDashboard />
  </div>
</AdminLayout>