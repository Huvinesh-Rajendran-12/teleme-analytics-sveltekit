<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { formatTimeRemaining } from '$lib/utils/sessionManager';

  // Props
  export let show = false;
  export let timeRemaining = 0;

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    extend: void;
    logout: void;
  }>();

  // Reactive statements
  $: formattedTime = formatTimeRemaining(timeRemaining);
  $: isUrgent = timeRemaining < 60 * 1000; // Less than 1 minute

  function handleExtend() {
    dispatch('extend');
  }

  function handleLogout() {
    dispatch('logout');
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleExtend(); // Pressing escape extends session (stays logged in)
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if show}
  <!-- Modal backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    transition:fade={{ duration: 200 }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="session-warning-title"
    aria-describedby="session-warning-description"
  >
    <!-- Modal content -->
    <div
      class="relative mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      transition:scale={{ duration: 200, start: 0.95 }}
    >
      <!-- Warning icon -->
      <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full {isUrgent ? 'bg-red-100' : 'bg-yellow-100'}">
        <svg
          class="h-6 w-6 {isUrgent ? 'text-red-600' : 'text-yellow-600'}"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
      </div>

      <!-- Title -->
      <div class="mt-3 text-center sm:mt-5">
        <h3 class="text-lg font-medium leading-6 text-gray-900" id="session-warning-title">
          {isUrgent ? 'Session Expiring Soon!' : 'Session Timeout Warning'}
        </h3>
        
        <!-- Description -->
        <div class="mt-2" id="session-warning-description">
          <p class="text-sm text-gray-500">
            {#if isUrgent}
              Your admin session will expire in <span class="font-semibold text-red-600">{formattedTime}</span>.
              Please choose an action to avoid being logged out.
            {:else}
              Your admin session will expire in <span class="font-semibold text-yellow-600">{formattedTime}</span>
              due to inactivity.
            {/if}
          </p>
        </div>

        <!-- Countdown display -->
        <div class="mt-4 rounded-md {isUrgent ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'} p-3">
          <div class="flex items-center justify-center">
            <svg
              class="mr-2 h-5 w-5 {isUrgent ? 'text-red-400' : 'text-yellow-400'}"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
            <span class="text-lg font-mono font-semibold {isUrgent ? 'text-red-700' : 'text-yellow-700'}">
              {formattedTime}
            </span>
          </div>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
        <!-- Stay logged in button -->
        <button
          type="button"
          class="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:col-start-2"
          on:click={handleExtend}
        >
          <svg
            class="mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
          Stay Logged In
        </button>

        <!-- Logout button -->
        <button
          type="button"
          class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
          on:click={handleLogout}
        >
          <svg
            class="mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
            />
          </svg>
          Logout Now
        </button>
      </div>

      <!-- Help text -->
      <div class="mt-3 text-center">
        <p class="text-xs text-gray-400">
          Press Escape to stay logged in
        </p>
      </div>
    </div>
  </div>
{/if}