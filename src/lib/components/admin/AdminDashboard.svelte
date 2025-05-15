<script lang="ts">
  import { onMount } from 'svelte';
  import { getStoredAdminToken } from '$lib/utils/auth';
  import { 
    fetchAnalyticsChatbotStats, 
    fetchHealthTrackerStats 
  } from '$lib/services/adminService';
  import { 
    APPLICATION_TYPES, 
    getApplicationDisplayName 
  } from '$lib/config/admin';
  import type { 
    UserActivityStats, 
    TimeSinceLastActivity 
  } from '$lib/types/conversations';
  import { logDebug, logError } from '$lib/utils/secureLogger';

  // State
  let loading = true;
  let error: string | null = null;
  let analyticsStats: UserActivityStats | null = null;
  let healthTrackerStats: UserActivityStats | null = null;

  // Format time since last activity
  function formatTimeSince(time: TimeSinceLastActivity | undefined): string {
    if (!time) return "N/A";

    const hours = typeof time.hours === 'number' ? time.hours : 0;
    const minutes = typeof time.minutes === 'number' ? time.minutes : 0;
    const seconds = typeof time.seconds === 'number' ? Math.round(time.seconds) : 0;

    return `${hours}h ${minutes}m ${seconds}s ago`;
  }

  // Format UTC date time
  function formatUtcDateTime(isoString: string | undefined): string {
    if (!isoString) return "N/A";
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) {
        // Check for invalid date
        logError("Invalid date string passed to formatUtcDateTime:", { isoString });
        return "Invalid Date";
      }
      const year = date.getUTCFullYear();
      // Using toLocaleString for month name is generally robust
      const month = date.toLocaleString("en-US", {
        month: "short",
        timeZone: "UTC",
      }); // e.g., "May"
      const day = date.getUTCDate();
      let hours = date.getUTCHours();
      const minutes = date.getUTCMinutes();
      const seconds = date.getUTCSeconds();
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12; // Convert hour 0 to 12 for 12 AM
      const paddedMinutes = minutes < 10 ? "0" + minutes : minutes;
      const paddedSeconds = seconds < 10 ? "0" + seconds : seconds;
      return `${month} ${day}, ${year}, ${hours}:${paddedMinutes}:${paddedSeconds} ${ampm} UTC`;
    } catch (e) {
      logError("Error formatting UTC date-time:", e);
      return "Error Formatting Date";
    }
  }

  async function fetchStats() {
    loading = true;
    error = null;

    try {
      const token = getStoredAdminToken();
      if (!token) {
        error = "Authentication required. Please login as admin.";
        loading = false;
        return;
      }

      logDebug("Attempting to fetch analytics chatbot stats...");
      const analyticsData = await fetchAnalyticsChatbotStats();
      logDebug("Analytics chatbot stats fetched", {
        statsReceived: !!analyticsData,
      });
      analyticsStats = analyticsData;

      logDebug("Attempting to fetch health tracker stats...");
      const healthTrackerData = await fetchHealthTrackerStats();
      logDebug("Health tracker stats fetched", {
        statsReceived: !!healthTrackerData,
      });
      healthTrackerStats = healthTrackerData;
    } catch (err) {
      logError("Error fetching dashboard statistics:", err);
      error = "Failed to load dashboard statistics.";
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    logDebug("AdminDashboard component mounted - fetching stats");
    fetchStats();
  });
</script>

<div class="space-y-12 p-4 md:p-6">
  <h1 class="text-3xl font-bold text-gray-800 mb-8">
    Dashboard Statistics Overview
  </h1>

  {#if loading}
    <div class="text-center py-10">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
      <p class="mt-2 text-gray-700">
        Loading statistics...
      </p>
    </div>
  {:else if error}
    <div class="bg-red-50 text-red-700 p-4 rounded-md mb-6">
      {error}
    </div>
  {:else}
    <!-- Analytics Chatbot Stats -->
    <section aria-labelledby="analytics-chatbot-stats-title">
      <h2 id="analytics-chatbot-stats-title" class="text-2xl font-semibold text-gray-700 mb-6">
        {getApplicationDisplayName(APPLICATION_TYPES.ANALYTICS_CHATBOT)}
      </h2>

      {#if !analyticsStats}
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <p class="text-gray-500">
            No stats available for {getApplicationDisplayName(APPLICATION_TYPES.ANALYTICS_CHATBOT)}.
          </p>
        </div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <!-- Daily Active Users -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-300 ease-in-out hover:shadow-xl hover:transform hover:scale-[1.03]">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-slate-100 rounded-md p-3">
                <svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
              </div>
              <div class="ml-5">
                <h3 class="text-gray-500 text-sm">Daily Active Users (DAU)</h3>
                <div class="mt-1 text-2xl font-semibold">
                  {analyticsStats.dau}
                </div>
              </div>
            </div>
          </div>

          <!-- Weekly Active Users -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-300 ease-in-out hover:shadow-xl hover:transform hover:scale-[1.03]">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-slate-100 rounded-md p-3">
                <svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2v2.219c-.324.457-.723.838-1.13 1.17L9 15h3l-3 4v2h15v-2l-3-4h-3l1.13-1.17c-.407-.332-.806-.713-1.13-1.17V10c0-1.105-1.343-2-3-2z"></path>
                </svg>
              </div>
              <div class="ml-5">
                <h3 class="text-gray-500 text-sm">Weekly Active Users (WAU)</h3>
                <div class="mt-1 text-2xl font-semibold">
                  {analyticsStats.wau}
                </div>
              </div>
            </div>
          </div>

          <!-- Monthly Active Users -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-300 ease-in-out hover:shadow-xl hover:transform hover:scale-[1.03]">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-slate-100 rounded-md p-3">
                <svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h.01M7 12h.01M15 12h.01M17 12h.01M3 21h18a2 2 0 002-2V7a2 2 0 00-2-2H3a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
              </div>
              <div class="ml-5">
                <h3 class="text-gray-500 text-sm">Monthly Active Users (MAU)</h3>
                <div class="mt-1 text-2xl font-semibold">
                  {analyticsStats.mau}
                </div>
              </div>
            </div>
          </div>

          <!-- Total Users Ever -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-300 ease-in-out hover:shadow-xl hover:transform hover:scale-[1.03]">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-slate-100 rounded-md p-3">
                <svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
              </div>
              <div class="ml-5">
                <h3 class="text-gray-500 text-sm">Total Users Ever</h3>
                <div class="mt-1 text-2xl font-semibold">
                  {analyticsStats.totalUsersEver}
                </div>
              </div>
            </div>
          </div>

          <!-- Active Sessions -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-300 ease-in-out hover:shadow-xl hover:transform hover:scale-[1.03]">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-slate-100 rounded-md p-3">
                <svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.084-1.268-.25-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.084-1.268.25-1.857m0 0a5.002 5.002 0 019.5 0m0 0a5.002 5.002 0 01-9.5 0M12 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div class="ml-5">
                <h3 class="text-gray-500 text-sm">Active Sessions</h3>
                <div class="mt-1 text-2xl font-semibold">
                  {analyticsStats.activeSessions}
                </div>
              </div>
            </div>
          </div>

          <!-- Total Sessions -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-300 ease-in-out hover:shadow-xl hover:transform hover:scale-[1.03]">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-slate-100 rounded-md p-3">
                <svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                </svg>
              </div>
              <div class="ml-5">
                <h3 class="text-gray-500 text-sm">Total Sessions</h3>
                <div class="mt-1 text-2xl font-semibold">
                  {analyticsStats.totalSessions}
                </div>
              </div>
            </div>
          </div>

          <!-- More stats... add all the other stats from the original component -->
          <!-- Avg Sessions/User -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-300 ease-in-out hover:shadow-xl hover:transform hover:scale-[1.03]">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-slate-100 rounded-md p-3">
                <svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 14h.01M12 11h.01M12 8h.01M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16l-3-2-3 2-3-2-3 2z"></path>
                </svg>
              </div>
              <div class="ml-5">
                <h3 class="text-gray-500 text-sm">Avg Sessions/User</h3>
                <div class="mt-1 text-2xl font-semibold">
                  {analyticsStats.avgSessionsPerUser ? analyticsStats.avgSessionsPerUser.toFixed(2) : "N/A"}
                </div>
              </div>
            </div>
          </div>

          <!-- Weekly Retention -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-300 ease-in-out hover:shadow-xl hover:transform hover:scale-[1.03]">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-slate-100 rounded-md p-3">
                <svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m-15.357-2a8.001 8.001 0 0015.357 2m0 0H15"></path>
                </svg>
              </div>
              <div class="ml-5">
                <h3 class="text-gray-500 text-sm">Weekly Retention</h3>
                <div class="mt-1 text-2xl font-semibold">
                  {analyticsStats.weeklyRetentionRate ? `${analyticsStats.weeklyRetentionRate.toFixed(2)}%` : "N/A"}
                </div>
              </div>
            </div>
          </div>

          <!-- Last Activity -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-300 ease-in-out hover:shadow-xl hover:transform hover:scale-[1.03]">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-slate-100 rounded-md p-3">
                <svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
              </div>
              <div class="ml-5">
                <h3 class="text-gray-500 text-sm">Most Recent Activity</h3>
                <div class="mt-1 text-lg font-semibold">
                  {formatUtcDateTime(analyticsStats.mostRecentActivity)}
                </div>
              </div>
            </div>
          </div>

          <!-- Time Since Last Activity -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-300 ease-in-out hover:shadow-xl hover:transform hover:scale-[1.03]">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-slate-100 rounded-md p-3">
                <svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div class="ml-5">
                <h3 class="text-gray-500 text-sm">Time Since Last Activity</h3>
                <div class="mt-1 text-xl font-semibold">
                  {formatTimeSince(analyticsStats.timeSinceLastActivity)}
                </div>
              </div>
            </div>
          </div>
        </div>
      {/if}
    </section>

    <hr class="my-10 border-gray-300" />

    <!-- Health Tracker Stats -->
    <section aria-labelledby="health-tracker-stats-title">
      <h2 id="health-tracker-stats-title" class="text-2xl font-semibold text-gray-700 mb-6">
        {getApplicationDisplayName(APPLICATION_TYPES.HEALTH_TRACKER_SUMMARY)}
      </h2>

      {#if !healthTrackerStats}
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <p class="text-gray-500">
            No stats available for {getApplicationDisplayName(APPLICATION_TYPES.HEALTH_TRACKER_SUMMARY)}.
          </p>
        </div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <!-- Same cards as above but with healthTrackerStats data -->
          <!-- Daily Active Users -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-300 ease-in-out hover:shadow-xl hover:transform hover:scale-[1.03]">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-slate-100 rounded-md p-3">
                <svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
              </div>
              <div class="ml-5">
                <h3 class="text-gray-500 text-sm">Daily Active Users (DAU)</h3>
                <div class="mt-1 text-2xl font-semibold">
                  {healthTrackerStats.dau}
                </div>
              </div>
            </div>
          </div>

          <!-- Weekly Active Users -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-300 ease-in-out hover:shadow-xl hover:transform hover:scale-[1.03]">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-slate-100 rounded-md p-3">
                <svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2v2.219c-.324.457-.723.838-1.13 1.17L9 15h3l-3 4v2h15v-2l-3-4h-3l1.13-1.17c-.407-.332-.806-.713-1.13-1.17V10c0-1.105-1.343-2-3-2z"></path>
                </svg>
              </div>
              <div class="ml-5">
                <h3 class="text-gray-500 text-sm">Weekly Active Users (WAU)</h3>
                <div class="mt-1 text-2xl font-semibold">
                  {healthTrackerStats.wau}
                </div>
              </div>
            </div>
          </div>

          <!-- Monthly Active Users -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-300 ease-in-out hover:shadow-xl hover:transform hover:scale-[1.03]">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-slate-100 rounded-md p-3">
                <svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h.01M7 12h.01M15 12h.01M17 12h.01M3 21h18a2 2 0 002-2V7a2 2 0 00-2-2H3a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
              </div>
              <div class="ml-5">
                <h3 class="text-gray-500 text-sm">Monthly Active Users (MAU)</h3>
                <div class="mt-1 text-2xl font-semibold">
                  {healthTrackerStats.mau}
                </div>
              </div>
            </div>
          </div>

          <!-- Time Since Last Activity -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-300 ease-in-out hover:shadow-xl hover:transform hover:scale-[1.03]">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-slate-100 rounded-md p-3">
                <svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div class="ml-5">
                <h3 class="text-gray-500 text-sm">Time Since Last Activity</h3>
                <div class="mt-1 text-xl font-semibold">
                  {formatTimeSince(healthTrackerStats.timeSinceLastActivity)}
                </div>
              </div>
            </div>
          </div>
        </div>
      {/if}
    </section>
  {/if}
</div>
