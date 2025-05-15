<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  
  // Just redirect to the [id] route with 'new' as the ID
  onMount(() => {
    goto('/admin/users/new');
  });
</script>

<!-- This page just redirects to /admin/users/new which is handled by the [id] component -->
<div class="flex items-center justify-center py-10">
  <div class="h-6 w-6 animate-spin rounded-full border-t-2 border-b-2 border-blue-600"></div>
  <span class="ml-2">Redirecting...</span>
</div>