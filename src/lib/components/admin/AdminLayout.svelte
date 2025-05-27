<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { getStoredAdminToken } from '$lib/utils/auth';
  import { logDebug, logInfo } from '$lib/utils/secureLogger';
  import { fade, fly } from 'svelte/transition';
  import { sessionManager, type SessionWarningCallback } from '$lib/utils/sessionManager';
  import SafeHtml from '../common/SafeHtml.svelte';
  import SessionWarningModal from './SessionWarningModal.svelte';

  // Props
  export let isLoginPage = false;

  // State
  let isLoading = true;
  let sidebarOpen = false;
  let showSessionWarning = false;
  let sessionTimeRemaining = 0;
  let warningUpdateInterval: NodeJS.Timeout | null = null;
  let navItems = [
    {
      name: 'Analytics Chatbot',
      href: '/admin/analytics-chatbot',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
            </svg>`
    },
    {
      name: 'Health Tracker',
      href: '/admin/health-tracker',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>`
    },
    {
      name: 'Statistics',
      href: '/admin/dashboard',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>`
    }
  ];

  // Handle logout
  function handleLogout() {
    logInfo('Admin logout requested');
    sessionManager.logout();
  }

  // Session warning callback
  const sessionCallback: SessionWarningCallback = {
    onWarning: (timeLeft: number) => {
      logInfo('Session timeout warning triggered');
      sessionTimeRemaining = timeLeft;
      showSessionWarning = true;

      // Update the remaining time every second while warning is shown
      if (warningUpdateInterval) {
        clearInterval(warningUpdateInterval);
      }

      warningUpdateInterval = setInterval(() => {
        const status = sessionManager.getSessionStatus();
        sessionTimeRemaining = status.timeRemaining;

        if (status.isExpired || sessionTimeRemaining <= 0) {
          clearInterval(warningUpdateInterval!);
          warningUpdateInterval = null;
          showSessionWarning = false;
          sessionManager.logout();
        }
      }, 1000);
    },

    onTimeout: () => {
      logInfo('Session timeout occurred');
      showSessionWarning = false;
      if (warningUpdateInterval) {
        clearInterval(warningUpdateInterval);
        warningUpdateInterval = null;
      }
    }
  };

  // Handle session extension
  function handleExtendSession() {
    logInfo('User extended session');
    sessionManager.extendSession();
    showSessionWarning = false;

    if (warningUpdateInterval) {
      clearInterval(warningUpdateInterval);
      warningUpdateInterval = null;
    }
  }

  // Handle manual logout from warning modal
  function handleSessionLogout() {
    logInfo('User chose to logout from session warning');
    sessionManager.logout();
  }

  // Toggle sidebar for mobile
  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
  }

  // Check if a nav item is active
  function isActive(href: string): boolean {
    if (href === '/admin/dashboard') {
      return $page.url.pathname === href;
    } else {
      return $page.url.pathname.includes(href);
    }
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

    // Initialize session management
    sessionManager.init(sessionCallback);
    logDebug('Session management initialized');

    // Set loading to false with slight delay for smoother transitions
    setTimeout(() => {
      isLoading = false;
    }, 300);
  });

  onDestroy(() => {
    // Clean up session management and intervals
    if (warningUpdateInterval) {
      clearInterval(warningUpdateInterval);
      warningUpdateInterval = null;
    }

    if (!isLoginPage) {
      sessionManager.cleanup();
    }
  });
</script>

{#if isLoading}
  <div class="flex h-screen items-center justify-center bg-gray-50">
    <div class="flex flex-col items-center">
      <div
        class="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-blue-100"
      ></div>
      <p class="mt-4 text-gray-700 font-medium">Loading dashboard...</p>
    </div>
  </div>
{:else if isLoginPage}
  <div in:fade={{ duration: 300, delay: 150 }}>
    <slot />
  </div>
{:else}
  <div class="min-h-screen bg-gray-50">
    <!-- Mobile menu button -->
    <div class="fixed top-0 left-0 z-40 lg:hidden">
      <button
        type="button"
        on:click={toggleSidebar}
        class="m-3 flex h-10 w-10 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
      >
        <span class="sr-only">Open sidebar</span>
        <!-- Icon for menu -->
        <svg
          class="h-6 w-6"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
    </div>

    <!-- Sidebar for desktop - always visible -->
    <div class="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
      <div class="flex min-h-0 flex-1 flex-col bg-white shadow">
        <div class="flex h-16 flex-shrink-0 items-center px-4 border-b border-gray-200">
          <a href="/admin/home" class="text-xl font-bold text-blue-600"> Admin Dashboard </a>
        </div>
        <div class="flex flex-1 flex-col overflow-y-auto">
          <nav class="flex-1 space-y-1 px-2 py-4">
            {#each navItems as item}
              <a
                href={item.href}
                class="{isActive(item.href)
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                  group flex items-center rounded-md px-2 py-3 text-sm font-medium transition-colors duration-150 ease-in-out"
              >
                <div
                  class="mr-3 flex-shrink-0 {isActive(item.href)
                    ? 'text-blue-600'
                    : 'text-gray-500 group-hover:text-gray-600'}"
                >
                  <SafeHtml html={item.icon} allowSvg={true} />
                </div>
                {item.name}
              </a>
            {/each}
          </nav>
        </div>
        <div class="flex flex-shrink-0 border-t border-gray-200 p-4">
          <button
            on:click={handleLogout}
            class="flex w-full items-center justify-center rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors duration-150 ease-in-out"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-5 h-5 mr-2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
              />
            </svg>
            Logout
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile sidebar - conditionally rendered -->
    {#if sidebarOpen}
      <div
        class="fixed inset-0 z-30 bg-gray-600 bg-opacity-75 lg:hidden"
        role="dialog"
        aria-modal="true"
        tabindex="0"
        on:click={() => (sidebarOpen = false)}
        on:keydown={(e) => {
          if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') sidebarOpen = false;
        }}
        transition:fade={{ duration: 150 }}
      ></div>

      <div
        class="fixed inset-y-0 left-0 z-40 w-64 transform bg-white lg:hidden"
        transition:fly={{ x: -300, duration: 200 }}
      >
        <div class="flex h-16 flex-shrink-0 items-center px-4 border-b border-gray-200">
          <a href="/admin/home" class="text-xl font-bold text-blue-600"> Admin Dashboard </a>
          <button
            class="ml-auto rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            on:click={() => (sidebarOpen = false)}
          >
            <span class="sr-only">Close sidebar</span>
            <svg
              class="h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div class="flex flex-1 flex-col overflow-y-auto">
          <nav class="flex-1 space-y-1 px-2 py-4">
            {#each navItems as item}
              <a
                href={item.href}
                class="{isActive(item.href)
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                      group flex items-center rounded-md px-2 py-3 text-sm font-medium"
              >
                <div
                  class="mr-3 flex-shrink-0 {isActive(item.href)
                    ? 'text-blue-600'
                    : 'text-gray-500 group-hover:text-gray-600'}"
                >
                  <SafeHtml html={item.icon} allowSvg={true} />
                </div>
                {item.name}
              </a>
            {/each}
          </nav>
        </div>
        <div class="flex flex-shrink-0 border-t border-gray-200 p-4">
          <button
            on:click={handleLogout}
            class="flex w-full items-center justify-center rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-5 h-5 mr-2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
              />
            </svg>
            Logout
          </button>
        </div>
      </div>
    {/if}

    <!-- Main content area -->
    <div class="lg:pl-64 flex flex-col flex-1">
      <!-- Top navigation for mobile -->
      <div class="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-white shadow lg:hidden">
        <div class="flex flex-1 justify-between px-4">
          <div class="flex items-center">
            <a href="/admin/home" class="text-xl font-bold text-blue-600"> Admin Dashboard </a>
          </div>
          <div class="flex items-center">
            <button
              on:click={handleLogout}
              class="ml-4 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <!-- Main content -->
      <main class="flex-1 px-4 py-8 sm:px-6 lg:px-8" in:fade={{ duration: 300, delay: 150 }}>
        <slot />
      </main>
    </div>
  </div>

  <!-- Session Warning Modal -->
  <SessionWarningModal
    bind:show={showSessionWarning}
    timeRemaining={sessionTimeRemaining}
    on:extend={handleExtendSession}
    on:logout={handleSessionLogout}
  />
{/if}
