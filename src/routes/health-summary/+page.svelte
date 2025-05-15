<script lang="ts">
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';

  onMount(() => {
    if (browser) {
      // Get the current URL parameters
      const queryParams = window.location.search;
      // Redirect to the correct URL with the same parameters
      goto(`/health-tracker-summary${queryParams}`);
    }
  });
</script>

<!-- Simple loading indicator while redirecting -->
<div class="w-full h-screen flex items-center justify-center">
  <div class="animate-pulse flex flex-col items-center">
    <div class="h-12 w-12 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin mb-4"></div>
    <p class="text-gray-700">
      Redirecting to health tracker summary...
    </p>
  </div>
</div>
