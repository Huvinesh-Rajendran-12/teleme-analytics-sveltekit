<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  
  let errorMessage = 'Authentication required';
  
  onMount(() => {
    const error = $page.url.searchParams.get('error');
    if (error) {
      errorMessage = decodeURIComponent(error);
    }
  });
</script>

<div class="h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-primary-500 to-secondary-500">
  <div class="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden p-8 text-center">
    <div class="mb-6">
      <div class="inline-flex rounded-full bg-gray-100 p-3 mb-4">
        <div class="w-16 h-16 flex items-center justify-center text-red-500 text-3xl font-bold">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>
      </div>
      <h1 class="text-2xl font-bold text-gray-800 mb-2">Authentication Required</h1>
      <p class="text-gray-600">{errorMessage}</p>
    </div>
    
    <div class="mt-8">
      <p class="text-sm text-gray-500 mb-4">
        Please ensure you have valid authentication credentials to access this resource.
        If you believe this is an error, contact your system administrator.
      </p>
      
      <a 
        href="/" 
        class="inline-block px-6 py-2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white font-medium rounded-full shadow transition-transform hover:scale-105"
      >
        Return to Home
      </a>
    </div>
  </div>
</div>