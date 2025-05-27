<script lang="ts">
  import { onMount } from 'svelte';
  import { getStoredAdminToken } from '$lib/utils/auth';
  import { fetchAnalyticsChatbotStats, fetchHealthTrackerStats } from '$lib/services/adminService';
  import { APPLICATION_TYPES, getApplicationDisplayName } from '$lib/config/admin';
  import type { UserActivityStats, TimeSinceLastActivity } from '$lib/types/conversations';
  import { logDebug, logError } from '$lib/utils/secureLogger';
  import { fade, fly } from 'svelte/transition';

  // Import the StatCard component
  import StatCard from './StatCard.svelte';

  // Component state and properties
  // State
  let loading = true;
  let error: string | null = null;
  let analyticsStats: UserActivityStats | null = null;
  let healthTrackerStats: UserActivityStats | null = null;
  let activeTab = 'overview'; // 'overview', 'analytics', 'health'
  // let dateRangeFilter = '7d'; // '24h', '7d', '30d', '90d', 'all'

  // Placeholder chart data
  const chartData = {
    dailyUsers: [20, 25, 30, 35, 25, 45, 40],
    weeklyLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    retentionRate: [95, 92, 88, 83, 79, 75, 73],
    messageVolume: [120, 140, 125, 160, 180, 165, 190],
    errorRates: [3, 2, 4, 2, 1, 1, 2]
  };

  // const dateRanges = [
  //   { id: '24h', label: 'Last 24 Hours' },
  //   { id: '7d', label: 'Last 7 Days' },
  //   { id: '30d', label: 'Last 30 Days' },
  //   { id: '90d', label: 'Last 90 Days' },
  //   { id: 'all', label: 'All Time' }
  // ];

  // Format time since last activity
  function formatTimeSince(time: TimeSinceLastActivity | undefined): string {
    if (!time) return 'N/A';

    const hours = typeof time.hours === 'number' ? time.hours : 0;
    const minutes = typeof time.minutes === 'number' ? time.minutes : 0;
    const seconds = typeof time.seconds === 'number' ? Math.round(time.seconds) : 0;

    return `${hours}h ${minutes}m ${seconds}s ago`;
  }

  // Format UTC date time
  function formatUtcDateTime(isoString: string | undefined): string {
    if (!isoString) return 'N/A';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) {
        // Check for invalid date
        logError('Invalid date string passed to formatUtcDateTime:', { isoString });
        return 'Invalid Date';
      }

      const year = date.getUTCFullYear();
      const month = date.toLocaleString('en-US', {
        month: 'short',
        timeZone: 'UTC'
      });
      const day = date.getUTCDate();
      let hours = date.getUTCHours();
      const minutes = date.getUTCMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // Convert hour 0 to 12 for 12 AM
      const paddedMinutes = minutes < 10 ? '0' + minutes : minutes;

      return `${month} ${day}, ${year}, ${hours}:${paddedMinutes} ${ampm} UTC`;
    } catch (e) {
      logError('Error formatting UTC date-time:', e);
      return 'Error Formatting Date';
    }
  }

  async function fetchStats() {
    loading = true;
    error = null;

    try {
      const token = getStoredAdminToken();
      if (!token) {
        error = 'Authentication required. Please login as admin.';
        loading = false;
        return;
      }

      logDebug('Attempting to fetch analytics chatbot stats...');
      const analyticsData = await fetchAnalyticsChatbotStats();
      logDebug('Analytics chatbot stats fetched', {
        statsReceived: !!analyticsData
      });
      analyticsStats = analyticsData;

      logDebug('Attempting to fetch health tracker stats...');
      const healthTrackerData = await fetchHealthTrackerStats();
      logDebug('Health tracker stats fetched', {
        statsReceived: !!healthTrackerData
      });
      healthTrackerStats = healthTrackerData;
    } catch (err) {
      logError('Error fetching dashboard statistics:', err);
      error = 'Failed to load dashboard statistics.';
    } finally {
      loading = false;
    }
  }

  function setTab(tab: string) {
    activeTab = tab;
  }

  // function setDateRange(range: string) {
  //   dateRangeFilter = range;
  //   // In a real implementation, we would refetch stats for the selected range
  // }

  onMount(() => {
    logDebug('AdminDashboard component mounted - fetching stats');
    fetchStats();
  });
</script>

<div class="max-w-7xl mx-auto" in:fade={{ duration: 300, delay: 100 }}>
  <!-- Dashboard header -->
  <div class="mb-8" in:fly={{ y: -20, duration: 400 }}>
    <div class="flex flex-col md:flex-row md:items-end justify-between">
      <div class="mb-4 md:mb-0">
        <h1 class="text-3xl font-bold text-gray-900 flex items-center">
          <div
            class="mr-3 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          Dashboard Statistics
        </h1>
        <p class="text-gray-600 mt-2 max-w-3xl">
          Comprehensive metrics and KPIs across all applications. Monitor usage, performance, and
          engagement trends.
        </p>
      </div>

      <!-- Date range selector -->
      <!-- <div
        class="flex space-x-1 rounded-lg shadow-sm bg-white border border-gray-200 overflow-hidden"
      >
        {#each dateRanges as range}
          <button
            class="px-3 py-2 text-sm font-medium {dateRangeFilter === range.id
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'} transition-colors"
            on:click={() => setDateRange(range.id)}
          >
            {range.label}
          </button>
        {/each}
      </div> -->
    </div>

    <!-- Tab navigation -->
    <div class="mt-6 border-b border-gray-200">
      <div class="flex space-x-4">
        <button
          class={`py-3 px-4 text-sm font-medium border-b-2 ${activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} transition-colors`}
          on:click={() => setTab('overview')}
        >
          Overview
        </button>
        <button
          class={`py-3 px-4 text-sm font-medium border-b-2 ${activeTab === 'analytics' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} transition-colors`}
          on:click={() => setTab('analytics')}
        >
          Analytics Chatbot
        </button>
        <button
          class={`py-3 px-4 text-sm font-medium border-b-2 ${activeTab === 'health' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} transition-colors`}
          on:click={() => setTab('health')}
        >
          Health Tracker
        </button>
      </div>
    </div>
  </div>

  <!-- Loading state -->
  {#if loading}
    <div
      class="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100"
      in:fade={{ duration: 200 }}
    >
      <div
        class="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
      ></div>
      <p class="mt-4 text-gray-700 font-medium">Loading dashboard statistics...</p>
      <p class="text-gray-500 text-sm mt-2">This may take a moment</p>
    </div>
  {:else if error}
    <!-- Error state -->
    <div
      class="rounded-xl bg-red-50 p-6 text-sm text-red-700 shadow-sm border border-red-200"
      in:fly={{ y: -10, duration: 200 }}
      out:fade={{ duration: 150 }}
    >
      <div class="flex items-center">
        <div class="flex-shrink-0 bg-red-100 rounded-full p-3 mr-4">
          <svg
            class="h-6 w-6 text-red-600"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
        <div>
          <h3 class="text-base font-medium text-red-800">Error Loading Dashboard</h3>
          <p class="mt-2">{error}</p>
          <div class="mt-4">
            <button
              on:click={fetchStats}
              class="inline-flex items-center justify-center rounded-md bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Try Again
            </button>
          </div>
        </div>
      </div>
    </div>
  {:else}
    <!-- Dashboard content based on active tab -->
    {#if activeTab === 'overview'}
      <div in:fade={{ duration: 300 }}>
        <!-- Key Metrics Comparison -->
        <div class="mb-8 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div class="border-b border-gray-100 bg-gray-50 px-6 py-4">
            <h2 class="text-lg font-semibold text-gray-800">Key Metrics Comparison</h2>
          </div>
          <div class="grid grid-cols-2 lg:grid-cols-4 p-6 gap-6">
            <!-- User Metrics -->
            <div>
              <h3 class="text-sm font-semibold text-gray-700 mb-3">Active Users</h3>
              <div class="space-y-3">
                <div class="flex justify-between items-center">
                  <span class="text-xs text-gray-500">Analytics Chatbot</span>
                  <span class="text-sm font-medium text-blue-600">{analyticsStats?.dau || 0}</span>
                </div>
                <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-blue-500 rounded-full"
                    style="width: {analyticsStats?.dau
                      ? Math.min(100, (analyticsStats.dau / 150) * 100)
                      : 0}%"
                  ></div>
                </div>

                <div class="flex justify-between items-center mt-2">
                  <span class="text-xs text-gray-500">Health Tracker</span>
                  <span class="text-sm font-medium text-green-600"
                    >{healthTrackerStats?.dau || 0}</span
                  >
                </div>
                <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-green-500 rounded-full"
                    style="width: {healthTrackerStats?.dau
                      ? Math.min(100, (healthTrackerStats.dau / 150) * 100)
                      : 0}%"
                  ></div>
                </div>
              </div>
            </div>

            <!-- Session Metrics -->
            <div>
              <h3 class="text-sm font-semibold text-gray-700 mb-3">Active Sessions</h3>
              <div class="space-y-3">
                <div class="flex justify-between items-center">
                  <span class="text-xs text-gray-500">Analytics Chatbot</span>
                  <span class="text-sm font-medium text-blue-600"
                    >{analyticsStats?.activeSessions || 0}</span
                  >
                </div>
                <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-blue-500 rounded-full"
                    style="width: {analyticsStats?.activeSessions
                      ? Math.min(100, (analyticsStats.activeSessions / 50) * 100)
                      : 0}%"
                  ></div>
                </div>

                <div class="flex justify-between items-center mt-2">
                  <span class="text-xs text-gray-500">Health Tracker</span>
                  <span class="text-sm font-medium text-green-600"
                    >{healthTrackerStats?.activeSessions || 0}</span
                  >
                </div>
                <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-green-500 rounded-full"
                    style="width: {healthTrackerStats?.activeSessions
                      ? Math.min(100, (healthTrackerStats.activeSessions / 50) * 100)
                      : 0}%"
                  ></div>
                </div>
              </div>
            </div>

            <!-- Retention Metrics -->
            <div>
              <h3 class="text-sm font-semibold text-gray-700 mb-3">Weekly Retention</h3>
              <div class="space-y-3">
                <div class="flex justify-between items-center">
                  <span class="text-xs text-gray-500">Analytics Chatbot</span>
                  <span class="text-sm font-medium text-blue-600"
                    >{analyticsStats?.weeklyRetentionRate
                      ? analyticsStats.weeklyRetentionRate.toFixed(1)
                      : 0}%</span
                  >
                </div>
                <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-blue-500 rounded-full"
                    style="width: {analyticsStats?.weeklyRetentionRate || 0}%"
                  ></div>
                </div>

                <div class="flex justify-between items-center mt-2">
                  <span class="text-xs text-gray-500">Health Tracker</span>
                  <span class="text-sm font-medium text-green-600"
                    >{healthTrackerStats?.weeklyRetentionRate
                      ? healthTrackerStats.weeklyRetentionRate.toFixed(1)
                      : 0}%</span
                  >
                </div>
                <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-green-500 rounded-full"
                    style="width: {healthTrackerStats?.weeklyRetentionRate || 0}%"
                  ></div>
                </div>
              </div>
            </div>

            <!-- Growth Metrics -->
            <div>
              <h3 class="text-sm font-semibold text-gray-700 mb-3">New Sessions</h3>
              <div class="space-y-3">
                <div class="flex justify-between items-center">
                  <span class="text-xs text-gray-500">Analytics Chatbot</span>
                  <span class="text-sm font-medium text-blue-600"
                    >{analyticsStats?.newUsersToday || 0} today</span
                  >
                </div>
                <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-blue-500 rounded-full"
                    style="width: {analyticsStats?.newUsersToday
                      ? Math.min(100, (analyticsStats.newUsersToday / 20) * 100)
                      : 0}%"
                  ></div>
                </div>

                <div class="flex justify-between items-center mt-2">
                  <span class="text-xs text-gray-500">Health Tracker</span>
                  <span class="text-sm font-medium text-green-600"
                    >{healthTrackerStats?.newUsersToday || 0} today</span
                  >
                </div>
                <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-green-500 rounded-full"
                    style="width: {healthTrackerStats?.newUsersToday
                      ? Math.min(100, (healthTrackerStats.newUsersToday / 20) * 100)
                      : 0}%"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Activity & Trends -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <!-- Recent Activity -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="border-b border-gray-100 bg-gray-50 px-6 py-4">
              <h2 class="text-lg font-semibold text-gray-800">Recent Activity</h2>
            </div>
            <div class="p-6">
              <div class="space-y-4">
                <div class="flex items-start">
                  <div
                    class="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0 mr-3"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div class="text-sm font-medium text-gray-800">New User Registration</div>
                    <div class="text-xs text-gray-500 mt-1">15 minutes ago</div>
                  </div>
                </div>

                <div class="flex items-start">
                  <div
                    class="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0 mr-3"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div class="text-sm font-medium text-gray-800">System Health Check Passed</div>
                    <div class="text-xs text-gray-500 mt-1">32 minutes ago</div>
                  </div>
                </div>

                <div class="flex items-start">
                  <div
                    class="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 flex-shrink-0 mr-3"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div class="text-sm font-medium text-gray-800">
                      Peak Traffic Alert Triggered
                    </div>
                    <div class="text-xs text-gray-500 mt-1">1 hour ago</div>
                  </div>
                </div>

                <div class="flex items-start">
                  <div
                    class="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0 mr-3"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div class="text-sm font-medium text-gray-800">Daily Backup Completed</div>
                    <div class="text-xs text-gray-500 mt-1">2 hours ago</div>
                  </div>
                </div>
              </div>

              <div class="mt-4 pt-4 border-t border-gray-100 text-center">
                <a href="/" class="text-sm font-medium text-blue-600 hover:text-blue-800">
                  View all activity
                </a>
              </div>
            </div>
          </div>

          <!-- Weekly Trends -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="border-b border-gray-100 bg-gray-50 px-6 py-4">
              <h2 class="text-lg font-semibold text-gray-800">Weekly Usage Trends</h2>
            </div>
            <div class="p-6">
              <div class="relative pt-1">
                <div class="mb-6">
                  <div class="flex items-center justify-between mb-2">
                    <div class="text-xs font-semibold text-gray-700">Daily Active Users</div>
                    <div class="text-xs font-semibold text-gray-500">
                      Average: {Math.round(
                        chartData.dailyUsers.reduce((a, b) => a + b, 0) /
                          chartData.dailyUsers.length
                      )}
                    </div>
                  </div>
                  <div class="flex h-16 items-end space-x-1">
                    {#each chartData.dailyUsers as value, i}
                      <div class="flex-1 group">
                        <div
                          class="relative h-full flex flex-col-reverse"
                          in:fly={{ y: 20, duration: 500, delay: i * 50 }}
                        >
                          <div
                            class="h-0 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t w-full hover:opacity-80 transition-[height,opacity] duration-300 ease-out cursor-pointer"
                            style="height: {(value / 50) * 100}%"
                          >
                            <div
                              class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              {value} users
                            </div>
                          </div>
                        </div>
                        <div class="text-center text-xs mt-1 text-gray-500">
                          {chartData.weeklyLabels[i]}
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>

                <div class="mb-6">
                  <div class="flex items-center justify-between mb-2">
                    <div class="text-xs font-semibold text-gray-700">Message Volume</div>
                    <div class="text-xs font-semibold text-gray-500">
                      Total: {chartData.messageVolume.reduce((a, b) => a + b, 0)}
                    </div>
                  </div>
                  <div class="flex h-16 items-end space-x-1">
                    {#each chartData.messageVolume as value, i}
                      <div class="flex-1 group">
                        <div
                          class="relative h-full flex flex-col-reverse"
                          in:fly={{ y: 20, duration: 500, delay: 100 + i * 50 }}
                        >
                          <div
                            class="h-0 bg-gradient-to-t from-green-500 to-green-400 rounded-t w-full hover:opacity-80 transition-[height,opacity] duration-300 ease-out cursor-pointer"
                            style="height: {(value / 200) * 100}%"
                          >
                            <div
                              class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              {value} messages
                            </div>
                          </div>
                        </div>
                        <div class="text-center text-xs mt-1 text-gray-500">
                          {chartData.weeklyLabels[i]}
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              </div>

              <div class="mt-4 pt-4 border-t border-gray-100 text-center">
                <a href="/" class="text-sm font-medium text-blue-600 hover:text-blue-800">
                  View detailed analytics
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Analytics Chatbot Stats Tab -->
    {#if activeTab === 'analytics'}
      <div in:fade={{ duration: 300 }}>
        <div
          class="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 mb-8 border border-blue-200"
        >
          <div class="flex items-center mb-4">
            <div
              class="mr-3 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0 border border-blue-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <div>
              <h2 class="text-2xl font-bold text-blue-900">Analytics Chatbot</h2>
              <p class="text-blue-700">Detailed statistics and performance metrics</p>
            </div>
          </div>

          <!-- Quick Analytics Stats -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-white rounded-lg shadow-sm border border-blue-200 p-4">
              <div class="text-sm font-medium text-blue-700">Total Users</div>
              <div class="text-2xl font-bold text-blue-900 mt-1">
                {analyticsStats?.totalUsersEver || 0}
              </div>
              <div class="text-xs text-blue-600 mt-1">
                <span class="font-medium">{analyticsStats?.newUsersThisMonth || 0}</span> new this month
              </div>
            </div>

            <div class="bg-white rounded-lg shadow-sm border border-blue-200 p-4">
              <div class="text-sm font-medium text-blue-700">Active Sessions</div>
              <div class="text-2xl font-bold text-blue-900 mt-1">
                {analyticsStats?.activeSessions || 0}
              </div>
              <div class="text-xs text-blue-600 mt-1">
                <span class="font-medium">{analyticsStats?.totalSessions || 0}</span> total sessions
              </div>
            </div>

            <div class="bg-white rounded-lg shadow-sm border border-blue-200 p-4">
              <div class="text-sm font-medium text-blue-700">Avg. Session Duration</div>
              <div class="text-2xl font-bold text-blue-900 mt-1">
                {analyticsStats?.avgSessionMinutes?.toFixed(1) || 0} min
              </div>
              <div class="text-xs text-blue-600 mt-1">
                Max: <span class="font-medium"
                  >{analyticsStats?.maxSessionMinutes?.toFixed(1) || 0} min</span
                >
              </div>
            </div>

            <div class="bg-white rounded-lg shadow-sm border border-blue-200 p-4">
              <div class="text-sm font-medium text-blue-700">Weekly Retention</div>
              <div class="text-2xl font-bold text-blue-900 mt-1">
                {analyticsStats?.weeklyRetentionRate?.toFixed(1) || 0}%
              </div>
              <div class="text-xs text-blue-600 mt-1">
                <span class="font-medium"
                  >{analyticsStats?.avgSessionsPerUser?.toFixed(1) || 0}</span
                > sessions per user
              </div>
            </div>
          </div>
        </div>

        <!-- Detailed Stats Cards -->
        {#if analyticsStats}
          <div
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            in:fly={{ y: 20, duration: 400, delay: 200 }}
          >
            <!-- Daily Active Users -->
            <StatCard
              title="Daily Active Users (DAU)"
              value={analyticsStats.dau}
              iconName="lightning"
              iconColor="#2563eb"
              bgColorClass="bg-blue-100"
            />

            <!-- Weekly Active Users -->
            <StatCard
              title="Weekly Active Users (WAU)"
              value={analyticsStats.wau}
              iconName="users"
              iconColor="#2563eb"
              bgColorClass="bg-blue-100"
            />

            <!-- Monthly Active Users -->
            <StatCard
              title="Monthly Active Users (MAU)"
              value={analyticsStats.mau}
              iconName="calendar"
              iconColor="#2563eb"
              bgColorClass="bg-blue-100"
            />

            <!-- Total Users Ever -->
            <StatCard
              title="Total Users Ever"
              value={analyticsStats.totalUsersEver}
              iconName="user"
              iconColor="#2563eb"
              bgColorClass="bg-blue-100"
            />

            <!-- Active Sessions -->
            <StatCard
              title="Active Sessions"
              value={analyticsStats.activeSessions}
              iconName="session"
              iconColor="#2563eb"
              bgColorClass="bg-blue-100"
            />

            <!-- Total Sessions -->
            <StatCard
              title="Total Sessions"
              value={analyticsStats.totalSessions}
              iconName="document"
              iconColor="#2563eb"
              bgColorClass="bg-blue-100"
            />

            <!-- Avg Sessions/User -->
            <StatCard
              title="Avg Sessions/User"
              value={
                analyticsStats.avgSessionsPerUser
                  ? analyticsStats.avgSessionsPerUser.toFixed(2)
                  : 'N/A'
              }
              iconName="barChart"
              iconColor="#2563eb"
              bgColorClass="bg-blue-100"
            />

            <!-- Weekly Retention -->
            <StatCard
              title="Weekly Retention"
              value={
                analyticsStats.weeklyRetentionRate
                  ? `${analyticsStats.weeklyRetentionRate.toFixed(2)}%`
                  : 'N/A'
              }
              iconName="retention"
              iconColor="#2563eb"
              bgColorClass="bg-blue-100"
            />

            <!-- Last Activity -->
            <StatCard
              title="Most Recent Activity"
              value={formatUtcDateTime(analyticsStats.mostRecentActivity)}
              iconName="calendar"
              iconColor="#2563eb"
              bgColorClass="bg-blue-100"
              valueClass="mt-1 text-lg font-semibold"
            />

            <!-- Time Since Last Activity -->
            <StatCard
              title="Time Since Last Activity"
              value={formatTimeSince(analyticsStats.timeSinceLastActivity)}
              iconName="clock"
              iconColor="#2563eb"
              bgColorClass="bg-blue-100"
              valueClass="mt-1 text-xl font-semibold"
            />
          </div>
        {:else}
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
            <p class="text-gray-500">
              No stats available for {getApplicationDisplayName(
                APPLICATION_TYPES.ANALYTICS_CHATBOT
              )}.
            </p>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Health Tracker Stats Tab -->
    {#if activeTab === 'health'}
      <div in:fade={{ duration: 300 }}>
        <div
          class="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6 mb-8 border border-green-200"
        >
          <div class="flex items-center mb-4">
            <div
              class="mr-3 h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0 border border-green-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <h2 class="text-2xl font-bold text-green-900">Health Tracker Summary</h2>
              <p class="text-green-700">Detailed statistics and performance metrics</p>
            </div>
          </div>

          <!-- Quick Health Stats -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-white rounded-lg shadow-sm border border-green-200 p-4">
              <div class="text-sm font-medium text-green-700">Total Users</div>
              <div class="text-2xl font-bold text-green-900 mt-1">
                {healthTrackerStats?.totalUsersEver || 0}
              </div>
              <div class="text-xs text-green-600 mt-1">
                <span class="font-medium">{healthTrackerStats?.newUsersThisMonth || 0}</span> new this
                month
              </div>
            </div>

            <div class="bg-white rounded-lg shadow-sm border border-green-200 p-4">
              <div class="text-sm font-medium text-green-700">Active Sessions</div>
              <div class="text-2xl font-bold text-green-900 mt-1">
                {healthTrackerStats?.activeSessions || 0}
              </div>
              <div class="text-xs text-green-600 mt-1">
                <span class="font-medium">{healthTrackerStats?.totalSessions || 0}</span> total sessions
              </div>
            </div>

            <div class="bg-white rounded-lg shadow-sm border border-green-200 p-4">
              <div class="text-sm font-medium text-green-700">Avg. Session Duration</div>
              <div class="text-2xl font-bold text-green-900 mt-1">
                {healthTrackerStats?.avgSessionMinutes?.toFixed(1) || 0} min
              </div>
              <div class="text-xs text-green-600 mt-1">
                Max: <span class="font-medium"
                  >{healthTrackerStats?.maxSessionMinutes?.toFixed(1) || 0} min</span
                >
              </div>
            </div>

            <div class="bg-white rounded-lg shadow-sm border border-green-200 p-4">
              <div class="text-sm font-medium text-green-700">Weekly Retention</div>
              <div class="text-2xl font-bold text-green-900 mt-1">
                {healthTrackerStats?.weeklyRetentionRate?.toFixed(1) || 0}%
              </div>
              <div class="text-xs text-green-600 mt-1">
                <span class="font-medium"
                  >{healthTrackerStats?.avgSessionsPerUser?.toFixed(1) || 0}</span
                > sessions per user
              </div>
            </div>
          </div>
        </div>

        <!-- Detailed Stats Cards -->
        {#if healthTrackerStats}
          <div
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            in:fly={{ y: 20, duration: 400, delay: 200 }}
          >
            <!-- Daily Active Users -->
            <StatCard
              title="Daily Active Users (DAU)"
              value={healthTrackerStats.dau}
              iconName="lightning"
              iconColor="#16a34a"
              bgColorClass="bg-green-100"
              hoverBorderColor="hover:border-green-200"
            />

            <!-- Weekly Active Users -->
            <StatCard
              title="Weekly Active Users (WAU)"
              value={healthTrackerStats.wau}
              iconName="users"
              iconColor="#16a34a"
              bgColorClass="bg-green-100"
              hoverBorderColor="hover:border-green-200"
            />

            <!-- Monthly Active Users -->
            <StatCard
              title="Monthly Active Users (MAU)"
              value={healthTrackerStats.mau}
              iconName="calendar"
              iconColor="#16a34a"
              bgColorClass="bg-green-100"
              hoverBorderColor="hover:border-green-200"
            />

            <!-- Total Users Ever -->
            <StatCard
              title="Total Users Ever"
              value={healthTrackerStats.totalUsersEver}
              iconName="user"
              iconColor="#16a34a"
              bgColorClass="bg-green-100"
              hoverBorderColor="hover:border-green-200"
            />

            <!-- Active Sessions -->
            <StatCard
              title="Active Sessions"
              value={healthTrackerStats.activeSessions}
              iconName="session"
              iconColor="#16a34a"
              bgColorClass="bg-green-100"
              hoverBorderColor="hover:border-green-200"
            />

            <!-- Total Sessions -->
            <StatCard
              title="Total Sessions"
              value={healthTrackerStats.totalSessions}
              iconName="document"
              iconColor="#16a34a"
              bgColorClass="bg-green-100"
              hoverBorderColor="hover:border-green-200"
            />

            <!-- Avg Sessions/User -->
            <StatCard
              title="Avg Sessions/User"
              value={
                healthTrackerStats.avgSessionsPerUser
                  ? healthTrackerStats.avgSessionsPerUser.toFixed(2)
                  : 'N/A'
              }
              iconName="barChart"
              iconColor="#16a34a"
              bgColorClass="bg-green-100"
              hoverBorderColor="hover:border-green-200"
            />

            <!-- Weekly Retention -->
            <StatCard
              title="Weekly Retention"
              value={
                healthTrackerStats.weeklyRetentionRate
                  ? `${healthTrackerStats.weeklyRetentionRate.toFixed(2)}%`
                  : 'N/A'
              }
              iconName="retention"
              iconColor="#16a34a"
              bgColorClass="bg-green-100"
              hoverBorderColor="hover:border-green-200"
            />

            <!-- Last Activity -->
            <StatCard
              title="Most Recent Activity"
              value={formatUtcDateTime(healthTrackerStats.mostRecentActivity)}
              iconName="calendar"
              iconColor="#16a34a"
              bgColorClass="bg-green-100"
              valueClass="mt-1 text-lg font-semibold"
              hoverBorderColor="hover:border-green-200"
            />

            <!-- Time Since Last Activity -->
            <StatCard
              title="Time Since Last Activity"
              value={formatTimeSince(healthTrackerStats.timeSinceLastActivity)}
              iconName="clock"
              iconColor="#16a34a"
              bgColorClass="bg-green-100"
              valueClass="mt-1 text-xl font-semibold"
              hoverBorderColor="hover:border-green-200"
            />
          </div>
        {:else}
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
            <p class="text-gray-500">
              No stats available for {getApplicationDisplayName(
                APPLICATION_TYPES.HEALTH_TRACKER_SUMMARY
              )}.
            </p>
          </div>
        {/if}
      </div>
    {/if}
  {/if}\n</div>
