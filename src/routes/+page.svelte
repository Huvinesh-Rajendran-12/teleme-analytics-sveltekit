<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { siteConfig } from '$lib/config/site';

  onMount(() => {
    // Redirect to analytics-chat route after a brief delay
    setTimeout(() => {
      goto('/analytics-chat');
    }, 1000);
  });
</script>

<div class="h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-primary-500 to-secondary-500">
  <div class="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden p-8 text-center">
    <div class="mb-6">
      <div class="inline-flex rounded-full bg-gradient-to-br-blue-teal p-3 mb-4">
        <div class="w-16 h-16 flex items-center justify-center text-white text-3xl font-bold rounded-full">
          T
        </div>
      </div>
      <h1 class="text-2xl font-bold text-gray-800 mb-2">{siteConfig.name}</h1>
      <p class="text-gray-600">{siteConfig.description}</p>
    </div>
    
    <div class="mt-4">
      <div class="animate-pulse flex flex-col items-center">
        <div class="h-8 w-8 border-t-4 border-b-4 border-primary-500 rounded-full animate-spin mb-4"></div>
        <p class="text-gray-700">Redirecting to Analytics Chat...</p>
      </div>
    </div>
    
    <div class="mt-6">
      <a 
        href="/analytics-chat" 
        class="inline-block px-6 py-2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white font-medium rounded-full shadow transition-transform hover:scale-105"
      >
        Click here if not redirected
      </a>
    </div>
  </div>
</div>