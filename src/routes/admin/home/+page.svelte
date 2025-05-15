<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getStoredAdminToken } from '$lib/utils/auth';
  import { logDebug } from '$lib/utils/secureLogger';
  import AdminLayout from '$lib/components/admin/AdminLayout.svelte';

  // Check if admin is logged in
  onMount(() => {
    const token = getStoredAdminToken();
    logDebug('Admin token present:', Boolean(token));

    if (!token) {
      logDebug('No admin token found, redirecting to login');
      goto('/admin/login');
    }
  });
</script>

<AdminLayout>
  <h2 class="text-2xl font-bold mb-4">
    Admin Dashboard Home
  </h2>
  <p class="text-gray-600 mb-8">
    Welcome to the admin dashboard. Select an application to
    manage or view statistics.
  </p>

  <div class="grid md:grid-cols-2 gap-6 mb-8">
    <!-- Analytics Chatbot Card -->
    <div class="border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow p-6">
      <h3 class="text-xl font-semibold mb-3">
        Analytics Chatbot
      </h3>
      <p class="text-gray-600 mb-4">
        View and manage conversations from the Analytics
        Chatbot application.
      </p>
      <div class="flex justify-end">
        <a
          href="/admin/analytics-chatbot"
          class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Manage Conversations
        </a>
      </div>
    </div>

    <!-- Health Tracker Summary Card -->
    <div class="border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow p-6">
      <h3 class="text-xl font-semibold mb-3">
        Health Tracker Summary
      </h3>
      <p class="text-gray-600 mb-4">
        View and manage conversations from the Health Tracker
        Summary application.
      </p>
      <div class="flex justify-end">
        <a
          href="/admin/health-tracker"
          class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Manage Conversations
        </a>
      </div>
    </div>
  </div>

  <!-- Statistics Card -->
  <div class="border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow p-6">
    <h3 class="text-xl font-semibold mb-3">
      Dashboard Statistics
    </h3>
    <p class="text-gray-600 mb-4">
      View usage statistics for all applications.
    </p>
    <div class="flex justify-end">
      <a
        href="/admin/dashboard"
        class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
      >
        View Statistics
      </a>
    </div>
  </div>
</AdminLayout>
