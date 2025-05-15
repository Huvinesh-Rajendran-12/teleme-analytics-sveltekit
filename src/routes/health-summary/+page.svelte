<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import HealthTrackerChat from '$lib/components/HealthTrackerChat.svelte';
  import { logInfo, logError, logDebug } from '$lib/utils/secureLogger';

  let patientId: string | null = null;
  let userId: string | null = null;
  let userName: string | null = null;
  let loading: boolean = true;
  let error: string | null = null;
  let authToken: string | null = null;

  onMount(async () => {
    if (!browser) return;

    async function getUserData() {
      try {
        // Extract auth_token from the URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        authToken = urlParams.get("auth_token");

        // Check authorization header (if set by meta tag or similar)
        try {
          const authHeader = document
            .querySelector('meta[name="authorization"]')
            ?.getAttribute("content");
          
          if (authHeader) {
            authToken = authHeader.startsWith("Bearer ")
              ? authHeader.substring(7)
              : authHeader;
            logDebug("Auth token found in meta tag");
          }
        } catch (headerError) {
          logError("Error accessing authorization header meta tag", headerError);
        }

        if (!authToken) {
          error = "Authentication token is required";
          logError("No auth token found in URL or headers");
          goto("/unauthorized?error=Authentication+required");
          return;
        }

        // Request user data from the API
        const response = await fetch(`/api/me?auth_token=${encodeURIComponent(authToken)}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
          },
        });

        const data = await response.json();
        logInfo("User data received");

        if (!response.ok) {
          throw new Error(data.error || "Failed to get user data");
        }

        if (data.userId && data.userName && data.patientId) {
          userId = data.userId;
          userName = data.userName;
          patientId = data.patientId;
          logDebug("User authenticated successfully", { userName });
        } else {
          error = "Required user data missing";
          logError("No userId, userName, or patientId found in response");
          goto("/unauthorized?error=Authentication+failed");
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logError("Error getting user data", { error: errorMessage });
        goto(`/unauthorized?error=${encodeURIComponent(errorMessage)}`);
      } finally {
        loading = false;
      }
    }

    getUserData();
  });
</script>

<svelte:head>
  <title>Health Tracker Summary</title>
</svelte:head>

{#if loading}
  <!-- Basic loading state structure mirroring the React example -->
  <div class="w-full h-screen flex items-center justify-center bg-gradient-to-br-blue-indigo-purple">
    <div class="animate-pulse flex flex-col items-center">
      <!-- You'll need to define CSS for 'h-12 w-12 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin mb-4' -->
      <div class="h-12 w-12 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin mb-4"></div>
      <!-- You'll need to define CSS for 'text-gray-700' -->
      <p class="text-gray-700">
        Loading your health summary...
      </p>
    </div>
  </div>
{:else if userId && userName && patientId}
  <!-- Main chat container -->
  <main class="w-full h-screen overflow-hidden bg-gradient-to-br-blue-indigo-purple">
    <div class="w-full h-full flex flex-col">
      <div class="flex-grow w-full overflow-hidden shadow-md bg-white border border-gray-100">
        <!-- Render the chat component with fetched data -->
        <HealthTrackerChat {userId} {patientId} {userName} />
      </div>
    </div>
  </main>
{/if}

<!-- Add styles or link to stylesheet for classes like .bg-gradient-to-br-blue-indigo-purple, .animate-pulse etc. -->
<!-- For example, if using Tailwind CSS: -->
<!-- <style lang="postcss">
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
</style> -->