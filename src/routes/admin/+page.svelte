<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getStoredAdminToken } from '$lib/utils/auth';
  import { logDebug } from '$lib/utils/secureLogger';

  onMount(() => {
    const token = getStoredAdminToken();
    
    if (!token) {
      logDebug('No admin token found, redirecting to login');
      goto('/admin/login');
    } else {
      logDebug('Admin token found, redirecting to home');
      goto('/admin/home');
    }
  });
</script>

<div class="flex h-screen w-full items-center justify-center">
  <div class="text-center">
    <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
    <p class="mt-4 text-gray-600">Redirecting to admin dashboard...</p>
  </div>
</div>
