<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authenticateAdmin } from '$lib/services/adminService';
  import { storeAdminToken, getStoredAdminToken } from '$lib/utils/auth';
  import { logDebug, logError } from '$lib/utils/secureLogger';
  import AdminLayout from '$lib/components/admin/AdminLayout.svelte';

  // State
  let username = '';
  let password = '';
  let error = '';
  let isLoading = false;

  onMount(() => {
    logDebug('Admin Login Page mounted - checking for existing token');
    const token = getStoredAdminToken();
    
    if (token) {
      logDebug('Token found, redirecting to admin dashboard');
      goto('/admin/home');
    } else {
      logDebug('No token found, showing login form');
    }
  });

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    logDebug('Login form submitted');
    logDebug('Username provided:', username ? 'Yes' : 'No');
    logDebug('Password provided:', password ? 'Yes' : 'No');
    
    error = '';
    isLoading = true;

    try {
      logDebug('Calling authenticateAdmin service...');
      const token = await authenticateAdmin(username, password);
      logDebug('Authentication response received, token present:', Boolean(token));
      
      if (token) {
        logDebug('Valid token received, storing token');
        // Store token and redirect to admin dashboard
        storeAdminToken(token);
        
        // Verify token was stored
        const storedToken = getStoredAdminToken();
        logDebug('Token storage verification:', Boolean(storedToken));
        
        logDebug('Redirecting to admin dashboard');
        goto('/admin/home');
      } else {
        logDebug('No token received, showing error');
        error = 'Invalid credentials. Please try again.';
      }
    } catch (err) {
      logError('Login error:', err);
      error = 'Authentication failed. Please try again later.';
    } finally {
      isLoading = false;
      logDebug('Login process completed, loading state reset');
    }
  }
</script>

<AdminLayout isLoginPage={true}>
  <div class="flex min-h-screen flex-col items-center justify-center">
    <div class="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-md">
      <h1 class="mb-6 text-center text-2xl font-bold text-gray-900">Admin Login</h1>
      
      {#if error}
        <div class="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      {/if}
      
      <form on:submit={handleSubmit}>
        <div class="mb-4">
          <label for="username" class="mb-2 block text-sm font-medium text-gray-900">
            Username
          </label>
          <input
            type="text"
            id="username"
            bind:value={username}
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>
        
        <div class="mb-6">
          <label for="password" class="mb-2 block text-sm font-medium text-gray-900">
            Password
          </label>
          <input
            type="password"
            id="password"
            bind:value={password}
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          class="w-full rounded-lg bg-blue-600 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:bg-blue-300"
        >
          {isLoading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
    </div>
  </div>
</AdminLayout>
