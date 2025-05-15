<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { getStoredAdminToken, clearAdminToken } from '$lib/utils/auth';
  import { logDebug } from '$lib/utils/secureLogger';

  // Props
  export let isLoginPage = false;

  // State
  let isLoading = true;
  
  // Handle logout
  function handleLogout() {
    clearAdminToken();
    goto('/admin/login');
  }

  onMount(() => {
    // Skip auth check for login page
    if (isLoginPage) {
      isLoading = false;
      return;
    }

    // Check if admin is logged in
    const token = getStoredAdminToken();
    logDebug('Admin layout - token available:', Boolean(token));
    
    if (!token) {
      logDebug('No admin token found, redirecting to login');
      goto('/admin/login');
      return;
    }

    isLoading = false;
  });
</script>

{#if isLoading}
  <div class="flex h-screen items-center justify-center">
    <div class="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
  </div>
{:else if isLoginPage}
  <slot />
{:else}
  <div class="min-h-screen bg-gray-50">
    <nav class="bg-white shadow-sm">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 justify-between">
          <div class="flex">
            <div class="flex flex-shrink-0 items-center">
              <a href="/admin/home" class="text-xl font-bold text-blue-600">
                Admin Dashboard
              </a>
            </div>
            <div class="ml-6 flex items-center space-x-4">
              <a 
                href="/admin/analytics-chatbot" 
                class="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 {$page.url.pathname.includes('analytics-chatbot') ? 'border-b-2 border-blue-600 text-blue-600' : ''}"
              >
                Analytics Chatbot
              </a>
              <a 
                href="/admin/health-tracker" 
                class="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 {$page.url.pathname.includes('health-tracker') ? 'border-b-2 border-blue-600 text-blue-600' : ''}"
              >
                Health Tracker
              </a>
              <a 
                href="/admin/dashboard" 
                class="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 {$page.url.pathname === '/admin/dashboard' ? 'border-b-2 border-blue-600 text-blue-600' : ''}"
              >
                Statistics
              </a>
              <a 
                href="/admin/users" 
                class="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 {$page.url.pathname.includes('/admin/users') ? 'border-b-2 border-blue-600 text-blue-600' : ''}"
              >
                Users
              </a>
            </div>
          </div>
          <div class="flex items-center">
            <button 
              on:click={handleLogout}
              class="ml-4 rounded-md bg-red-100 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
    <main class="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
      <slot />
    </main>
  </div>
{/if}
