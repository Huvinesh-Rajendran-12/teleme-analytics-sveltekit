<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import AdminLayout from '$lib/components/admin/AdminLayout.svelte';
  import StatCard from '$lib/components/admin/StatCard.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import {
    fetchDashboardData,
    fetchAnalyticsChatbotStats,
    fetchHealthTrackerStats
  } from '$lib/services/adminService';
  import type { WebhookDashboardResponse, UserActivityStats } from '$lib/types/conversations';

  // State management
  let loading = true;
  let error: string | null = null;
  let dashboardData: WebhookDashboardResponse | null = null;
  let analyticsStats: UserActivityStats | null = null;
  let healthTrackerStats: UserActivityStats | null = null;
  let systemStatus = 'operational';
  let lastUpdated = new Date();
  let activeView = 'overview'; // overview, analytics, health, activity

  // Reactive statements for computed values
  $: weeklyUsers = dashboardData?.data.main_metrics.weekly_active_users || 0;
  $: dailyUsers = dashboardData?.data.main_metrics.daily_active_users || 0;
  $: conversationsToday = dashboardData?.data.main_metrics.conversations_today || 0;
  $: responseTime = dashboardData?.data.main_metrics.avg_response_time_seconds || 0;

  function formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  function formatTimeSince(timestamp: string): string {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  async function loadAllData() {
    try {
      loading = true;
      error = null;

      // Fetch real data from the existing services
      const [dashboardResponse, analyticsResponse, healthResponse] = await Promise.all([
        fetchDashboardData().catch((err) => {
          console.warn('Dashboard data fetch failed:', err);
          return null;
        }),
        fetchAnalyticsChatbotStats().catch((err) => {
          console.warn('Analytics stats fetch failed:', err);
          return null;
        }),
        fetchHealthTrackerStats().catch((err) => {
          console.warn('Health tracker stats fetch failed:', err);
          return null;
        })
      ]);

      dashboardData = dashboardResponse;
      analyticsStats = analyticsResponse;
      healthTrackerStats = healthResponse;

      // Update system status based on dashboard health
      if (dashboardData?.data.health) {
        const health = dashboardData.data.health;
        if (health.critical_issue) {
          systemStatus = 'critical';
        } else if (health.needs_attention) {
          systemStatus = 'warning';
        } else if (health.system_operational) {
          systemStatus = 'operational';
        } else {
          systemStatus = 'unknown';
        }
      }

      lastUpdated = new Date();
    } catch (err) {
      error = 'Failed to load dashboard data. Please try again.';
      console.error('Dashboard error:', err);
    } finally {
      loading = false;
    }
  }

  function setActiveView(view: string) {
    activeView = view;
  }

  function getRecentActivity() {
    if (!dashboardData) return [];

    const analytics = dashboardData.data.main_metrics.analytics;
    const healthTracker = dashboardData.data.main_metrics.health_tracker;

    return [
      {
        type: 'analytics_update',
        user: 'Analytics System',
        timestamp: analytics.most_recent_activity,
        details: `Last activity: ${analytics.time_since_last_activity_formatted}`
      },
      {
        type: 'health_sync',
        user: 'Health Tracker',
        timestamp: healthTracker.most_recent_activity,
        details: `Last activity: ${healthTracker.time_since_last_activity_formatted}`
      },
      {
        type: 'system_update',
        user: 'System',
        timestamp: dashboardData.data.timestamp,
        details: 'Dashboard data refreshed'
      }
    ];
  }

  onMount(() => {
    loadAllData();
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadAllData, 300000);
    return () => clearInterval(interval);
  });
</script>

<AdminLayout>
  <div class="max-w-7xl mx-auto space-y-8">
    <!-- Header Section -->
    <div
      class="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl shadow-xl"
      in:fade={{ duration: 500 }}
    >
      <div class="absolute inset-0 bg-black opacity-10"></div>
      <div class="relative px-8 py-12">
        <div class="flex flex-col md:flex-row md:items-end justify-between">
          <div class="mb-6 md:mb-0">
            <h1 class="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p class="text-blue-100 text-lg max-w-2xl">
              Monitor your platform's performance, user engagement, and system health in real-time.
            </p>
          </div>
          <div
            class="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-4"
          >
            <div class="flex items-center space-x-2 text-sm text-blue-100">
              <div
                class="h-2 w-2 {systemStatus === 'operational'
                  ? 'bg-green-400'
                  : systemStatus === 'warning'
                    ? 'bg-yellow-400'
                    : 'bg-red-400'} rounded-full animate-pulse"
              ></div>
              <span>{dashboardData?.data.health.overall_status || 'Loading...'}</span>
            </div>
            <div class="text-sm text-blue-100">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    </div>

    {#if loading}
      <div class="text-center py-16" in:fade={{ duration: 300 }}>
        <div
          class="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4"
        >
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Loading Dashboard</h3>
        <p class="text-gray-600">Fetching the latest data...</p>
      </div>
    {:else if error}
      <div class="bg-red-50 border-l-4 border-red-400 p-6 rounded-lg" in:scale={{ duration: 300 }}>
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Icon name="question" size={24} color="#DC2626" />
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Error Loading Dashboard</h3>
            <p class="mt-1 text-sm text-red-700">{error}</p>
            <button
              on:click={loadAllData}
              class="mt-3 text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded-md transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    {:else}
      <!-- Key Metrics Overview -->
      <div
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        in:fly={{ y: 20, duration: 500, delay: 100 }}
      >
        <div
          class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg text-white p-6 transform hover:scale-105 transition-transform duration-200"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-blue-100 text-sm font-medium">Weekly Active Users</p>
              <p class="text-3xl font-bold mt-1">{formatNumber(weeklyUsers)}</p>
              <div class="flex items-center mt-2 text-blue-100 text-xs">
                {#if (dashboardData?.data.trends.weekly_users.change_pct ?? 0) > 0}
                  <Icon name="arrowUp" size={12} color="white" />
                  <span class="ml-1"
                    >{(dashboardData?.data.trends.weekly_users.change_pct ?? 0).toFixed(1)}% vs last
                    week</span
                  >
                {:else if (dashboardData?.data.trends.weekly_users.change_pct ?? 0) < 0}
                  <Icon name="chevronDown" size={12} color="white" />
                  <span class="ml-1"
                    >{Math.abs(dashboardData?.data.trends.weekly_users.change_pct ?? 0).toFixed(1)}%
                    vs last week</span
                  >
                {:else}
                  <Icon name="chevronRight" size={12} color="white" />
                  <span class="ml-1">No change vs last week</span>
                {/if}
              </div>
            </div>
            <div class="bg-white bg-opacity-20 p-3 rounded-lg">
              <Icon name="users" size={24} color="white" />
            </div>
          </div>
        </div>

        <div
          class="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg text-white p-6 transform hover:scale-105 transition-transform duration-200"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-green-100 text-sm font-medium">Daily Active Users</p>
              <p class="text-3xl font-bold mt-1">{formatNumber(dailyUsers)}</p>
              <div class="flex items-center mt-2 text-green-100 text-xs">
                {#if (dashboardData?.data.trends.daily_users.change_pct ?? 0) > 0}
                  <Icon name="arrowUp" size={12} color="white" />
                  <span class="ml-1"
                    >{(dashboardData?.data.trends.daily_users.change_pct ?? 0).toFixed(1)}% vs
                    yesterday</span
                  >
                {:else if (dashboardData?.data.trends.daily_users.change_pct ?? 0) < 0}
                  <Icon name="chevronDown" size={12} color="white" />
                  <span class="ml-1"
                    >{Math.abs(dashboardData?.data.trends.daily_users.change_pct ?? 0).toFixed(1)}%
                    vs yesterday</span
                  >
                {:else}
                  <Icon name="chevronRight" size={12} color="white" />
                  <span class="ml-1">No change vs yesterday</span>
                {/if}
              </div>
            </div>
            <div class="bg-white bg-opacity-20 p-3 rounded-lg">
              <Icon name="chart" size={24} color="white" />
            </div>
          </div>
        </div>

        <div
          class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg text-white p-6 transform hover:scale-105 transition-transform duration-200"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-purple-100 text-sm font-medium">Conversations Today</p>
              <p class="text-3xl font-bold mt-1">{formatNumber(conversationsToday)}</p>
              <div class="flex items-center mt-2 text-purple-100 text-xs">
                {#if (dashboardData?.data.trends.conversations.change_pct ?? 0) > 0}
                  <Icon name="arrowUp" size={12} color="white" />
                  <span class="ml-1"
                    >{(dashboardData?.data.trends.conversations.change_pct ?? 0).toFixed(1)}% vs
                    yesterday</span
                  >
                {:else if (dashboardData?.data.trends.conversations.change_pct ?? 0) < 0}
                  <Icon name="chevronDown" size={12} color="white" />
                  <span class="ml-1"
                    >{Math.abs(dashboardData?.data.trends.conversations.change_pct ?? 0).toFixed(
                      1
                    )}% vs yesterday</span
                  >
                {:else}
                  <Icon name="chevronRight" size={12} color="white" />
                  <span class="ml-1">No change vs yesterday</span>
                {/if}
              </div>
            </div>
            <div class="bg-white bg-opacity-20 p-3 rounded-lg">
              <Icon name="message" size={24} color="white" />
            </div>
          </div>
        </div>

        <div
          class="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg text-white p-6 transform hover:scale-105 transition-transform duration-200"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-orange-100 text-sm font-medium">Response Time</p>
              <p class="text-3xl font-bold mt-1">{responseTime.toFixed(1)}s</p>
              <div class="flex items-center mt-2 text-orange-100 text-xs">
                {#if (dashboardData?.data.trends.response_time.change_pct ?? 0) > 0}
                  <Icon name="arrowUp" size={12} color="white" />
                  <span class="ml-1"
                    >{(dashboardData?.data.trends.response_time.change_pct ?? 0).toFixed(1)}% change</span
                  >
                {:else if (dashboardData?.data.trends.response_time.change_pct ?? 0) < 0}
                  <Icon name="chevronDown" size={12} color="white" />
                  <span class="ml-1"
                    >{Math.abs(dashboardData?.data.trends.response_time.change_pct ?? 0).toFixed(
                      1
                    )}% change</span
                  >
                {:else}
                  <Icon name="chevronRight" size={12} color="white" />
                  <span class="ml-1">No change</span>
                {/if}
              </div>
            </div>
            <div class="bg-white bg-opacity-20 p-3 rounded-lg">
              <Icon name="clock" size={24} color="white" />
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="border-b border-gray-200" in:fly={{ y: 20, duration: 500, delay: 200 }}>
        <nav class="flex space-x-8">
          {#each [{ id: 'overview', label: 'Overview', icon: 'barChart' }, { id: 'analytics', label: 'Analytics', icon: 'chart' }, { id: 'health', label: 'Health Tracker', icon: 'medicine' }, { id: 'activity', label: 'Recent Activity', icon: 'clock' }] as tab}
            <button
              on:click={() => setActiveView(tab.id)}
              class="flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 {activeView ===
              tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
            >
              <Icon
                name={tab.icon}
                size={16}
                color={activeView === tab.id ? '#2563EB' : '#6B7280'}
              />
              <span>{tab.label}</span>
            </button>
          {/each}
        </nav>
      </div>

      <!-- Content Sections -->
      <div class="min-h-96">
        {#if activeView === 'overview'}
          <div in:fade={{ duration: 300 }}>
            <div class="grid md:grid-cols-2 gap-8 mb-8">
              <!-- Analytics Summary -->
              <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div class="flex items-center mb-6">
                  <div class="bg-blue-100 p-3 rounded-lg mr-4">
                    <Icon name="barChart" size={24} color="#2563EB" />
                  </div>
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900">Analytics Chatbot</h3>
                    <p class="text-gray-600 text-sm">User engagement metrics</p>
                  </div>
                </div>
                <div class="grid grid-cols-3 gap-4">
                  <div class="text-center p-4 bg-blue-50 rounded-lg">
                    <p class="text-2xl font-bold text-blue-600">
                      {dashboardData?.data.main_metrics.analytics.total_conversations || 0}
                    </p>
                    <p class="text-xs text-gray-600 mt-1">Total Conversations</p>
                  </div>
                  <div class="text-center p-4 bg-blue-50 rounded-lg">
                    <p class="text-2xl font-bold text-blue-600">
                      {dashboardData?.data.main_metrics.analytics.active_today || 0}
                    </p>
                    <p class="text-xs text-gray-600 mt-1">Active Today</p>
                  </div>
                  <div class="text-center p-4 bg-blue-50 rounded-lg">
                    <p class="text-2xl font-bold text-blue-600">
                      {dashboardData?.data.main_metrics.analytics.avg_duration_minutes.toFixed(1) ||
                        0}m
                    </p>
                    <p class="text-xs text-gray-600 mt-1">Avg Duration</p>
                  </div>
                </div>
              </div>

              <!-- Health Tracker Summary -->
              <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div class="flex items-center mb-6">
                  <div class="bg-green-100 p-3 rounded-lg mr-4">
                    <Icon name="medicine" size={24} color="#059669" />
                  </div>
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900">Health Tracker</h3>
                    <p class="text-gray-600 text-sm">Health monitoring metrics</p>
                  </div>
                </div>
                <div class="grid grid-cols-3 gap-4">
                  <div class="text-center p-4 bg-green-50 rounded-lg">
                    <p class="text-2xl font-bold text-green-600">
                      {dashboardData?.data.main_metrics.health_tracker.total_conversations || 0}
                    </p>
                    <p class="text-xs text-gray-600 mt-1">Total Conversations</p>
                  </div>
                  <div class="text-center p-4 bg-green-50 rounded-lg">
                    <p class="text-2xl font-bold text-green-600">
                      {dashboardData?.data.main_metrics.health_tracker.active_today || 0}
                    </p>
                    <p class="text-xs text-gray-600 mt-1">Active Today</p>
                  </div>
                  <div class="text-center p-4 bg-green-50 rounded-lg">
                    <p class="text-2xl font-bold text-green-600">
                      {dashboardData?.data.main_metrics.health_tracker.avg_duration_minutes.toFixed(
                        1
                      ) || 0}m
                    </p>
                    <p class="text-xs text-gray-600 mt-1">Avg Duration</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Retention Analysis -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
              <div class="flex items-center mb-6">
                <div class="bg-purple-100 p-3 rounded-lg mr-4">
                  <Icon name="retention" size={24} color="#7C3AED" />
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">Retention Analysis</h3>
                  <p class="text-gray-600 text-sm">Weekly user retention metrics</p>
                </div>
              </div>
              <div class="grid md:grid-cols-2 gap-6">
                <div class="bg-blue-50 rounded-lg p-4">
                  <h4 class="font-medium text-blue-900 mb-3">Analytics Chatbot</h4>
                  <div class="space-y-2">
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-600">Weekly Retention:</span>
                      <span class="font-semibold text-blue-600"
                        >{dashboardData?.data.trends.retention.analytics_chatbot
                          .weekly_retention_pct || 0}%</span
                      >
                    </div>
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-600">True Retention:</span>
                      <span class="font-semibold text-blue-600"
                        >{dashboardData?.data.trends.retention.analytics_chatbot
                          .true_retention_pct || 0}%</span
                      >
                    </div>
                    <div class="text-xs text-blue-700 mt-2 capitalize">
                      Status: {dashboardData?.data.trends.retention.analytics_chatbot
                        .retention_status || 'N/A'}
                    </div>
                  </div>
                </div>
                <div class="bg-green-50 rounded-lg p-4">
                  <h4 class="font-medium text-green-900 mb-3">Health Tracker</h4>
                  <div class="space-y-2">
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-600">Weekly Retention:</span>
                      <span class="font-semibold text-green-600"
                        >{dashboardData?.data.trends.retention.health_tracker
                          .weekly_retention_pct || 0}%</span
                      >
                    </div>
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-600">True Retention:</span>
                      <span class="font-semibold text-green-600"
                        >{dashboardData?.data.trends.retention.health_tracker.true_retention_pct ||
                          0}%</span
                      >
                    </div>
                    <div class="text-xs text-green-700 mt-2 capitalize">
                      Status: {dashboardData?.data.trends.retention.health_tracker
                        .retention_status || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Quick Actions -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div class="flex items-center mb-6">
                <div class="bg-gray-100 p-3 rounded-lg mr-4">
                  <Icon name="boxes" size={24} color="#6B7280" />
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">Quick Actions</h3>
                  <p class="text-gray-600 text-sm">Common administrative tasks</p>
                </div>
              </div>
              <div class="grid md:grid-cols-3 gap-4">
                <a
                  href="/admin/analytics-chatbot"
                  class="block p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div class="flex items-center justify-between">
                    <span class="font-medium text-gray-900">Analytics Conversations</span>
                    <Icon name="chevronRight" size={16} color="#6B7280" />
                  </div>
                </a>
                <a
                  href="/admin/health-tracker"
                  class="block p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors"
                >
                  <div class="flex items-center justify-between">
                    <span class="font-medium text-gray-900">Health Tracker</span>
                    <Icon name="chevronRight" size={16} color="#6B7280" />
                  </div>
                </a>
              </div>
            </div>
          </div>
        {:else if activeView === 'analytics'}
          <div in:fade={{ duration: 300 }}>
            <div class="space-y-6">
              <div
                class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100"
              >
                <div class="flex items-center mb-4">
                  <div class="bg-blue-500 p-3 rounded-lg mr-4">
                    <Icon name="chart" size={24} color="white" />
                  </div>
                  <div>
                    <h2 class="text-2xl font-bold text-blue-900">Analytics Overview</h2>
                    <p class="text-blue-700">Platform usage and engagement metrics</p>
                  </div>
                </div>
              </div>

              {#if analyticsStats}
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard
                    title="Daily Active Users"
                    value={formatNumber(analyticsStats.dau)}
                    iconName="users"
                    iconColor="#2563EB"
                    bgColorClass="bg-blue-100"
                    hoverBorderColor="hover:border-blue-300"
                  />
                  <StatCard
                    title="Weekly Active Users"
                    value={formatNumber(analyticsStats.wau)}
                    iconName="calendar"
                    iconColor="#2563EB"
                    bgColorClass="bg-blue-100"
                    hoverBorderColor="hover:border-blue-300"
                  />
                  <StatCard
                    title="Monthly Active Users"
                    value={formatNumber(analyticsStats.mau)}
                    iconName="chart"
                    iconColor="#2563EB"
                    bgColorClass="bg-blue-100"
                    hoverBorderColor="hover:border-blue-300"
                  />
                  <StatCard
                    title="Total Sessions"
                    value={formatNumber(analyticsStats.totalSessions)}
                    iconName="session"
                    iconColor="#2563EB"
                    bgColorClass="bg-blue-100"
                    hoverBorderColor="hover:border-blue-300"
                  />
                  <StatCard
                    title="Avg Session Duration"
                    value="{Math.floor(analyticsStats.avgSessionMinutes)}m"
                    iconName="clock"
                    iconColor="#2563EB"
                    bgColorClass="bg-blue-100"
                    hoverBorderColor="hover:border-blue-300"
                  />
                  <StatCard
                    title="New Users Today"
                    value={formatNumber(analyticsStats.newUsersToday)}
                    iconName="plusUser"
                    iconColor="#2563EB"
                    bgColorClass="bg-blue-100"
                    hoverBorderColor="hover:border-green-300"
                  />
                  <StatCard
                    title="Avg Sessions/User"
                    value={analyticsStats.avgSessionsPerUser.toFixed(1)}
                    iconName="barChart"
                    iconColor="#2563EB"
                    bgColorClass="bg-blue-100"
                    hoverBorderColor="hover:border-blue-300"
                  />
                  <StatCard
                    title="Weekly Retention"
                    value="{analyticsStats.weeklyRetentionRate.toFixed(1)}%"
                    iconName="retention"
                    iconColor="#2563EB"
                    bgColorClass="bg-blue-100"
                    hoverBorderColor="hover:border-green-300"
                  />
                </div>
              {:else}
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
                  <p class="text-gray-500">Analytics data unavailable</p>
                </div>
              {/if}
            </div>
          </div>
        {:else if activeView === 'health'}
          <div in:fade={{ duration: 300 }}>
            <div class="space-y-6">
              <div
                class="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100"
              >
                <div class="flex items-center mb-4">
                  <div class="bg-green-500 p-3 rounded-lg mr-4">
                    <Icon name="medicine" size={24} color="white" />
                  </div>
                  <div>
                    <h2 class="text-2xl font-bold text-green-900">Health Tracker</h2>
                    <p class="text-green-700">User health and wellness metrics</p>
                  </div>
                </div>
              </div>

              {#if healthTrackerStats}
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard
                    title="Daily Active Users"
                    value={formatNumber(healthTrackerStats.dau)}
                    iconName="users"
                    iconColor="#059669"
                    bgColorClass="bg-green-100"
                    hoverBorderColor="hover:border-green-300"
                  />
                  <StatCard
                    title="Weekly Active Users"
                    value={formatNumber(healthTrackerStats.wau)}
                    iconName="calendar"
                    iconColor="#059669"
                    bgColorClass="bg-green-100"
                    hoverBorderColor="hover:border-green-300"
                  />
                  <StatCard
                    title="Monthly Active Users"
                    value={formatNumber(healthTrackerStats.mau)}
                    iconName="chart"
                    iconColor="#059669"
                    bgColorClass="bg-green-100"
                    hoverBorderColor="hover:border-green-300"
                  />
                  <StatCard
                    title="Total Users Ever"
                    value={formatNumber(healthTrackerStats.totalUsersEver)}
                    iconName="users"
                    iconColor="#059669"
                    bgColorClass="bg-green-100"
                    hoverBorderColor="hover:border-green-300"
                  />
                  <StatCard
                    title="Active Sessions"
                    value={formatNumber(healthTrackerStats.activeSessions)}
                    iconName="session"
                    iconColor="#059669"
                    bgColorClass="bg-green-100"
                    hoverBorderColor="hover:border-green-300"
                  />
                  <StatCard
                    title="Avg Session Duration"
                    value="{Math.floor(healthTrackerStats.avgSessionMinutes)}m"
                    iconName="clock"
                    iconColor="#059669"
                    bgColorClass="bg-green-100"
                    hoverBorderColor="hover:border-green-300"
                  />
                  <StatCard
                    title="New Users Today"
                    value={formatNumber(healthTrackerStats.newUsersToday)}
                    iconName="plusUser"
                    iconColor="#059669"
                    bgColorClass="bg-green-100"
                    hoverBorderColor="hover:border-green-300"
                  />
                  <StatCard
                    title="Weekly Retention"
                    value="{healthTrackerStats.weeklyRetentionRate.toFixed(1)}%"
                    iconName="retention"
                    iconColor="#059669"
                    bgColorClass="bg-green-100"
                    hoverBorderColor="hover:border-green-300"
                  />
                </div>
              {:else}
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
                  <p class="text-gray-500">Health tracker data unavailable</p>
                </div>
              {/if}
            </div>
          </div>
        {:else if activeView === 'activity'}
          <div in:fade={{ duration: 300 }}>
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div class="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <div class="flex items-center justify-between">
                  <h3 class="text-lg font-semibold text-gray-900">Recent Activity</h3>
                  <span class="text-sm text-gray-500">Last activity status</span>
                </div>
              </div>
              <div class="divide-y divide-gray-100">
                {#each getRecentActivity() as activity}
                  <div class="p-6 flex items-start space-x-4 hover:bg-gray-50 transition-colors">
                    <div
                      class="flex-shrink-0 {activity.type === 'analytics_update'
                        ? 'bg-blue-100'
                        : activity.type === 'health_sync'
                          ? 'bg-green-100'
                          : 'bg-purple-100'} rounded-full p-2"
                    >
                      <Icon
                        name={activity.type === 'analytics_update'
                          ? 'barChart'
                          : activity.type === 'health_sync'
                            ? 'medicine'
                            : 'document'}
                        size={16}
                        color={activity.type === 'analytics_update'
                          ? '#2563EB'
                          : activity.type === 'health_sync'
                            ? '#059669'
                            : '#7C3AED'}
                      />
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-900">
                        {activity.user}
                      </p>
                      <p class="text-sm text-gray-600 mt-1">
                        {activity.details}
                      </p>
                      <p class="text-xs text-gray-500 mt-2">
                        {formatTimeSince(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                {/each}
              </div>
              <div class="px-6 py-4 bg-gray-50 border-t border-gray-100">
                <button
                  on:click={loadAllData}
                  class="w-full text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  Refresh Dashboard
                </button>
              </div>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</AdminLayout>
