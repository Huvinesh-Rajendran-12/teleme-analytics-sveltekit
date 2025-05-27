<script lang="ts">
  import { onMount } from 'svelte';

  import AdminLayout from '$lib/components/admin/AdminLayout.svelte';
  import { fetchDashboardData } from '$lib/services/adminService';
  import type { WebhookDashboardResponse } from '$lib/types/conversations';

  // Reactive state variables
  let loading = true;
  let error = '';
  let dashboardData: WebhookDashboardResponse | null = null;
  let systemStatus = 'All Systems Operational';
  let lastUpdated = 'Loading...';

  // Load dashboard data from webhook
  async function loadDashboardData() {
    try {
      loading = true;
      error = '';
      dashboardData = await fetchDashboardData();

      // Update system status and last updated time
      systemStatus = dashboardData.data.health.overall_status;
      const timestamp = new Date(dashboardData.timestamp);
      lastUpdated = `Today, ${timestamp.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })}`;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load dashboard data';
      console.error('Dashboard loading error:', err);
    } finally {
      loading = false;
    }
  }

  // Load data on component mount
  onMount(() => {
    loadDashboardData();
  });
</script>

<AdminLayout>
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex flex-col md:flex-row md:items-end justify-between">
        <div class="mb-4 md:mb-0">
          <h2 class="text-3xl font-bold text-gray-900">
            Welcome to Teleme Admin
          </h2>
          <p class="text-gray-600 mt-2 text-lg">
            Manage applications, track conversations, and monitor system performance.
          </p>
        </div>
        <div class="flex space-x-2 text-sm">
          <span class="px-2 py-1 bg-green-100 text-green-800 rounded-full flex items-center">
            <span class="h-2 w-2 bg-green-500 rounded-full inline-block mr-1"></span>
            {systemStatus}
          </span>
          <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
            Last updated: {lastUpdated}
          </span>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    {#if loading}
      <div class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p class="mt-4 text-gray-600">Loading dashboard data...</p>
      </div>
    {:else if error}
      <div class="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Error Loading Dashboard</h3>
            <p class="mt-1 text-sm text-red-700">{error}</p>
            <button
              on:click={loadDashboardData}
              class="mt-2 text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    {:else if dashboardData}
      <!-- Quick Stats Overview -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <!-- Total Active Users -->
        <div
          class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200 shadow-sm hover:shadow-md transition-shadow duration-200"
        >
          <div class="flex justify-between items-start">
            <div>
              <h3 class="text-blue-800 font-medium text-sm">Total Active Users</h3>
              <p class="text-3xl font-bold text-blue-900 mt-1">
                {dashboardData.data.summary.total_active_users}
              </p>
            </div>
            <div class="rounded-full bg-blue-500 p-2 text-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"
                />
              </svg>
            </div>
          </div>
          <div class="flex items-center mt-3">
            <span class="text-green-600 flex items-center text-sm font-medium">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 mr-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z"
                  clip-rule="evenodd"
                />
              </svg>
              {dashboardData.data.trends.active_users.change_percent}%
            </span>
            <span class="text-gray-500 text-sm ml-2">vs last month</span>
          </div>
        </div>

        <!-- Conversations Today -->
        <div
          class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200 shadow-sm hover:shadow-md transition-shadow duration-200"
        >
          <div class="flex justify-between items-start">
            <div>
              <h3 class="text-purple-800 font-medium text-sm">Conversations Today</h3>
              <p class="text-3xl font-bold text-purple-900 mt-1">
                {dashboardData.data.summary.conversations_today}
              </p>
            </div>
            <div class="rounded-full bg-purple-500 p-2 text-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
          </div>
          <div class="flex items-center mt-3">
            <span class="text-green-600 flex items-center text-sm font-medium">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 mr-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z"
                  clip-rule="evenodd"
                />
              </svg>
              {dashboardData.data.trends.conversations.change_percent}%
            </span>
            <span class="text-gray-500 text-sm ml-2">vs yesterday</span>
          </div>
        </div>

        <!-- Average Response Time -->
        <div
          class="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6 border border-amber-200 shadow-sm hover:shadow-md transition-shadow duration-200"
        >
          <div class="flex justify-between items-start">
            <div>
              <h3 class="text-amber-800 font-medium text-sm">Average Response Time</h3>
              <p class="text-3xl font-bold text-amber-900 mt-1">
                {dashboardData.data.summary.avg_response_time_seconds}s
              </p>
            </div>
            <div class="rounded-full bg-amber-500 p-2 text-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
          </div>
          <div class="flex items-center mt-3">
            <span class="text-green-600 flex items-center text-sm font-medium">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 mr-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z"
                  clip-rule="evenodd"
                />
              </svg>
              {dashboardData.data.trends.response_time.change_percent}%
            </span>
            <span class="text-gray-500 text-sm ml-2">vs last week</span>
          </div>
        </div>
      </div>

      <!-- Application Cards -->
      <div class="grid md:grid-cols-2 gap-6 mb-8">
        <!-- Analytics Chatbot Card -->
        <div
          class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200"
        >
          <div class="h-2 bg-gradient-to-r from-blue-400 to-blue-600"></div>
          <div class="p-6">
            <div class="flex items-center">
              <div class="rounded-full bg-blue-100 p-3 mr-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6 text-blue-600"
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
              <h3 class="text-xl font-bold text-gray-800">Analytics Chatbot</h3>
            </div>

            <p class="text-gray-600 mt-4 mb-6">
              Monitor and manage conversations from the Analytics Chatbot application. View user
              interactions and track performance metrics.
            </p>

            <div class="grid grid-cols-3 gap-4 mb-6">
              <div class="bg-blue-50 rounded-lg p-3">
                <p class="text-xs text-blue-700 font-medium">Conversations</p>
                <p class="text-lg font-bold text-blue-900">
                  {dashboardData.data.summary.analytics.total_conversations}
                </p>
              </div>
              <div class="bg-blue-50 rounded-lg p-3">
                <p class="text-xs text-blue-700 font-medium">Active Today</p>
                <p class="text-lg font-bold text-blue-900">
                  {dashboardData.data.summary.analytics.active_today}
                </p>
              </div>
              <div class="bg-blue-50 rounded-lg p-3">
                <p class="text-xs text-blue-700 font-medium">Avg. Duration</p>
                <p class="text-lg font-bold text-blue-900">
                  {dashboardData.data.summary.analytics.avg_duration_minutes} min
                </p>
              </div>
            </div>

            <div class="flex justify-end">
              <a
                href="/admin/analytics-chatbot"
                class="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                <span>Manage Conversations</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5 ml-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                    clip-rule="evenodd"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <!-- Health Tracker Card -->
        <div
          class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200"
        >
          <div class="h-2 bg-gradient-to-r from-green-400 to-green-600"></div>
          <div class="p-6">
            <div class="flex items-center">
              <div class="rounded-full bg-green-100 p-3 mr-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6 text-green-600"
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
              <h3 class="text-xl font-bold text-gray-800">Health Tracker Summary</h3>
            </div>

            <p class="text-gray-600 mt-4 mb-6">
              Review health tracking conversations and summaries. Gain insights into user health
              patterns and monitor trends.
            </p>

            <div class="grid grid-cols-3 gap-4 mb-6">
              <div class="bg-green-50 rounded-lg p-3">
                <p class="text-xs text-green-700 font-medium">Conversations</p>
                <p class="text-lg font-bold text-green-900">
                  {dashboardData.data.summary.health_tracker.total_conversations}
                </p>
              </div>
              <div class="bg-green-50 rounded-lg p-3">
                <p class="text-xs text-green-700 font-medium">Active Today</p>
                <p class="text-lg font-bold text-green-900">
                  {dashboardData.data.summary.health_tracker.active_today}
                </p>
              </div>
              <div class="bg-green-50 rounded-lg p-3">
                <p class="text-xs text-green-700 font-medium">Avg. Duration</p>
                <p class="text-lg font-bold text-green-900">
                  {dashboardData.data.summary.health_tracker.avg_duration_minutes} min
                </p>
              </div>
            </div>

            <div class="flex justify-end">
              <a
                href="/admin/health-tracker"
                class="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors duration-200"
              >
                <span>Manage Conversations</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5 ml-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                    clip-rule="evenodd"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Statistics Card -->
      <div
        class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200"
      >
        <div class="h-2 bg-gradient-to-r from-purple-400 to-purple-600"></div>
        <div class="p-6">
          <div class="flex items-center">
            <div class="rounded-full bg-purple-100 p-3 mr-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6 text-purple-600"
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
            <h3 class="text-xl font-bold text-gray-800">Dashboard Statistics</h3>
          </div>

          <p class="text-gray-600 mt-4 mb-6">
            Access comprehensive statistics and insights across all applications. Monitor system
            performance, analyze trends, and track key metrics.
          </p>

          <!-- Stats Row -->
          <div class="grid grid-cols-4 gap-4 mb-6">
            <div class="bg-purple-50 rounded-lg p-3">
              <p class="text-xs text-purple-700 font-medium">Applications</p>
              <p class="text-lg font-bold text-purple-900">2</p>
            </div>
            <div class="bg-purple-50 rounded-lg p-3">
              <p class="text-xs text-purple-700 font-medium">System Status</p>
              <p class="text-lg font-bold text-purple-900">
                {dashboardData.data.health.system_operational ? 'Operational' : 'Attention'}
              </p>
            </div>
            <div class="bg-purple-50 rounded-lg p-3">
              <p class="text-xs text-purple-700 font-medium">Total Sessions</p>
              <p class="text-lg font-bold text-purple-900">
                {dashboardData.data.health.total_sessions}
              </p>
            </div>
            <div class="bg-purple-50 rounded-lg p-3">
              <p class="text-xs text-purple-700 font-medium">Health Score</p>
              <p class="text-lg font-bold text-purple-900">
                {dashboardData.data.health.system_operational ? 'Excellent' : 'Needs Attention'}
              </p>
            </div>
          </div>

          <div class="flex justify-end">
            <a
              href="/admin/statistics"
              class="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors duration-200"
            >
              <span>View Statistics</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 ml-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                  clip-rule="evenodd"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>

      <!-- Recent Activity Section -->
      <div class="mt-8">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div class="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <div class="text-sm font-medium text-gray-700">Latest System Events</div>
            <div class="text-xs text-gray-500">Last 24 hours</div>
          </div>
          <div class="divide-y divide-gray-100">
            <div class="p-4 flex items-start">
              <div
                class="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0 mr-3"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p class="text-sm text-gray-800">
                  <span class="font-medium">New conversation</span> started in Analytics Chatbot
                </p>
                <p class="text-xs text-gray-500 mt-1">
                  {parseFloat(dashboardData.data.health.hours_since_last_conversation).toFixed(1)} hours
                  ago
                </p>
              </div>
            </div>
            <div class="p-4 flex items-start">
              <div
                class="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0 mr-3"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p class="text-sm text-gray-800">
                  System status: <span class="font-medium"
                    >{dashboardData.data.health.overall_status}</span
                  >
                </p>
                <p class="text-xs text-gray-500 mt-1">
                  As of {lastUpdated}
                </p>
              </div>
            </div>
            <div class="p-4 flex items-start">
              <div
                class="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0 mr-3"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p class="text-sm text-gray-800">
                  <span class="font-medium">System update:</span> Recorded {dashboardData.data
                    .health.total_sessions} total sessions
                </p>
                <p class="text-xs text-gray-500 mt-1">Recently</p>
              </div>
            </div>
          </div>
          <div class="p-3 bg-gray-50 border-t border-gray-100">
            <button
              class="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center w-full"
              on:click={loadDashboardData}
            >
              Refresh Dashboard
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 ml-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 111.885-.666A5.002 5.002 0 005.999 13z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
</AdminLayout>
