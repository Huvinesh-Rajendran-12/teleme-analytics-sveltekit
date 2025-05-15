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
  
  // Import the Icon component
  import { Icon } from '$lib/icons';

  // Define the StatsCard component interface
  interface StatsCardProps {
    title: string;
    value: string | number;
    icon: string;
  }

  // StatsCard component
  const StatsCard = ({ title, value, icon }: StatsCardProps) => {
    return `
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-300 ease-in-out hover:shadow-xl hover:transform hover:scale-[1.03]">
        <div class="flex items-center">
          <div class="flex-shrink-0 bg-slate-100 rounded-md p-3">
            <div use:icon="${icon}"></div>
          </div>
          <div class="ml-5">
            <h3 class="text-gray-500 text-sm">${title}</h3>
            <div class="mt-1 text-2xl font-semibold">
              ${value}
            </div>
          </div>
        </div>
      </div>
    `;
  }

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

  // Directive to use our Icon component
  function icon(node: HTMLDivElement, iconName: string) {
    const iconInstance = new Icon({
      target: node,
      props: {
        name: iconName,
        size: 24,
        color: "#2563eb"
      }
    });

    return {
      destroy() {
        iconInstance.$destroy();
      }
    };
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
                <Icon name="lightning" size={24} color="#2563eb" />
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
                <Icon name="users" size={24} color="#2563eb" />
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
                <Icon name="calendar" size={24} color="#2563eb" />
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
                <Icon name="user" size={24} color="#2563eb" />
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
                <Icon name="session" size={24} color="#2563eb" />
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
                <Icon name="document" size={24} color="#2563eb" />
              </div>
              <div class="ml-5">
                <h3 class="text-gray-500 text-sm">Total Sessions</h3>
                <div class="mt-1 text-2xl font-semibold">
                  {analyticsStats.totalSessions}
                </div>
              </div>
            </div>
          </div>

          <!-- Avg Sessions/User -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-300 ease-in-out hover:shadow-xl hover:transform hover:scale-[1.03]">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-slate-100 rounded-md p-3">
                <Icon name="barChart" size={24} color="#2563eb" />
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
                <Icon name="retention" size={24} color="#2563eb" />
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
                <Icon name="calendar" size={24} color="#2563eb" />
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
                <Icon name="clock" size={24} color="#2563eb" />
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
          <!-- Daily Active Users -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-300 ease-in-out hover:shadow-xl hover:transform hover:scale-[1.03]">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-slate-100 rounded-md p-3">
                <Icon name="lightning" size={24} color="#2563eb" />
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
                <Icon name="users" size={24} color="#2563eb" />
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
                <Icon name="calendar" size={24} color="#2563eb" />
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
                <Icon name="clock" size={24} color="#2563eb" />
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
