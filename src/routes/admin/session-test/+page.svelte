<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import AdminLayout from '$lib/components/admin/AdminLayout.svelte';
  import SessionStatusIndicator from '$lib/components/admin/SessionStatusIndicator.svelte';
  import { sessionManager, formatTimeRemaining } from '$lib/utils/sessionManager';
  import { updateUserActivity, getSessionStatus } from '$lib/utils/auth';
  import { SESSION_CONFIG } from '$lib/config/admin';

  // State
  let sessionStatus = {
    isExpired: false,
    timeRemaining: 0,
    shouldShowWarning: false,
    lastActivity: Date.now()
  };
  let statusUpdateInterval: NodeJS.Timeout | null = null;
  let activityLog: Array<{ timestamp: number; event: string }> = [];
  let testTimeoutMinutes = 2; // For testing, use shorter timeout
  let isTestMode = false;

  function updateStatus() {
    sessionStatus = getSessionStatus();
    addLogEntry(
      `Status updated - Time remaining: ${formatTimeRemaining(sessionStatus.timeRemaining)}`
    );
  }

  function addLogEntry(event: string) {
    activityLog = [
      { timestamp: Date.now(), event },
      ...activityLog.slice(0, 9) // Keep last 10 entries
    ];
  }

  function simulateActivity() {
    updateUserActivity();
    addLogEntry('Manual activity simulation');
    updateStatus();
  }

  function forceWarning() {
    // Temporarily modify last activity to trigger warning
    const warningTime =
      Date.now() - (SESSION_CONFIG.TIMEOUT_DURATION - SESSION_CONFIG.WARNING_DURATION + 1000);
    localStorage.setItem(SESSION_CONFIG.LAST_ACTIVITY_KEY, warningTime.toString());
    addLogEntry('Forced session warning');
    updateStatus();
  }

  function extendSession() {
    sessionManager.extendSession();
    addLogEntry('Session extended manually');
    updateStatus();
  }

  function enableTestMode() {
    if (
      confirm(
        'Enable test mode with 2-minute timeout? This will temporarily override session settings.'
      )
    ) {
      isTestMode = true;
      // Override session config for testing

      // Update the session manager with test config
      localStorage.setItem(SESSION_CONFIG.LAST_ACTIVITY_KEY, Date.now().toString());
      addLogEntry(`Test mode enabled - ${testTimeoutMinutes} minute timeout`);
      updateStatus();
    }
  }

  function disableTestMode() {
    isTestMode = false;
    // Reset to normal session tracking
    sessionManager.updateLastActivity();
    addLogEntry('Test mode disabled - normal session restored');
    updateStatus();
  }

  onMount(() => {
    updateStatus();
    statusUpdateInterval = setInterval(updateStatus, 1000);
    addLogEntry('Session test page loaded');
  });

  onDestroy(() => {
    if (statusUpdateInterval) {
      clearInterval(statusUpdateInterval);
    }
    if (isTestMode) {
      disableTestMode();
    }
  });
</script>

<AdminLayout>
  <div class="max-w-4xl">
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Session Timeout Test Page</h1>

    <div class="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
      <div class="flex">
        <svg class="w-5 h-5 text-yellow-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clip-rule="evenodd"
          ></path>
        </svg>
        <div>
          <h3 class="text-sm font-medium text-yellow-800">Development Testing Page</h3>
          <p class="mt-1 text-sm text-yellow-700">
            This page is for testing session timeout functionality. Use the controls below to
            simulate different scenarios.
          </p>
        </div>
      </div>
    </div>

    <!-- Current Session Status -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Current Session Status</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-gray-50 p-3 rounded">
          <div class="text-sm font-medium text-gray-500">Status</div>
          <div
            class="text-lg font-semibold {sessionStatus.isExpired
              ? 'text-red-600'
              : sessionStatus.shouldShowWarning
                ? 'text-yellow-600'
                : 'text-green-600'}"
          >
            {sessionStatus.isExpired
              ? 'Expired'
              : sessionStatus.shouldShowWarning
                ? 'Warning'
                : 'Active'}
          </div>
        </div>

        <div class="bg-gray-50 p-3 rounded">
          <div class="text-sm font-medium text-gray-500">Time Remaining</div>
          <div class="text-lg font-semibold text-gray-900">
            {formatTimeRemaining(sessionStatus.timeRemaining)}
          </div>
        </div>

        <div class="bg-gray-50 p-3 rounded">
          <div class="text-sm font-medium text-gray-500">Last Activity</div>
          <div class="text-sm text-gray-900">
            {new Date(sessionStatus.lastActivity).toLocaleTimeString()}
          </div>
        </div>

        <div class="bg-gray-50 p-3 rounded">
          <div class="text-sm font-medium text-gray-500">Mode</div>
          <div class="text-sm font-semibold {isTestMode ? 'text-blue-600' : 'text-gray-900'}">
            {isTestMode ? 'Test Mode' : 'Normal'}
          </div>
        </div>
      </div>
    </div>

    <!-- Test Controls -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Test Controls</h2>
      <div class="space-y-4">
        <div class="flex flex-wrap gap-3">
          <button
            on:click={simulateActivity}
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Simulate Activity
          </button>

          <button
            on:click={forceWarning}
            class="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
          >
            Force Warning
          </button>

          <button
            on:click={extendSession}
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Extend Session
          </button>
        </div>

        <div class="border-t pt-4">
          {#if !isTestMode}
            <div class="flex items-center space-x-3">
              <input
                type="number"
                bind:value={testTimeoutMinutes}
                min="1"
                max="5"
                class="w-20 px-3 py-1 border border-gray-300 rounded-md"
              />
              <span class="text-sm text-gray-600">minutes</span>
              <button
                on:click={enableTestMode}
                class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                Enable Test Mode
              </button>
            </div>
          {:else}
            <button
              on:click={disableTestMode}
              class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Disable Test Mode
            </button>
          {/if}
        </div>
      </div>
    </div>

    <!-- Configuration Display -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Session Configuration</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <span class="font-medium text-gray-700">Timeout Duration:</span>
          <span class="ml-2 text-gray-900">
            {isTestMode ? `${testTimeoutMinutes} minutes` : '30 minutes'}
          </span>
        </div>
        <div>
          <span class="font-medium text-gray-700">Warning Duration:</span>
          <span class="ml-2 text-gray-900">
            {isTestMode ? '30 seconds' : '5 minutes'}
          </span>
        </div>
        <div>
          <span class="font-medium text-gray-700">Check Interval:</span>
          <span class="ml-2 text-gray-900">1 minute</span>
        </div>
        <div>
          <span class="font-medium text-gray-700">Activity Events:</span>
          <span class="ml-2 text-gray-900">Mouse, Keyboard, Touch, Scroll</span>
        </div>
      </div>
    </div>

    <!-- Activity Log -->
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Activity Log</h2>
      <div class="space-y-2 max-h-64 overflow-y-auto">
        {#each activityLog as entry}
          <div class="flex justify-between items-start text-sm border-b border-gray-100 pb-2">
            <span class="text-gray-900">{entry.event}</span>
            <span class="text-gray-500 text-xs ml-4 flex-shrink-0">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </span>
          </div>
        {:else}
          <div class="text-gray-500 text-sm">No activity logged yet</div>
        {/each}
      </div>
    </div>
  </div>

  <!-- Session Status Indicator for Development -->
  <SessionStatusIndicator showInDev={true} />
</AdminLayout>
