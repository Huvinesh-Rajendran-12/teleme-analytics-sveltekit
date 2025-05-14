<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import HealthTrackerChat from '$lib/components/HealthTrackerChat.svelte'; // Assuming this component will be created
  import { logInfo, logError } from '$lib/utils/secureLogger'; // Assuming utils are ported

  let patientId: string | null = null;
  let userId: string | null = null;
  let userName: string | null = null;
  let loading: boolean = true;

  onMount(async () => {
    async function getUserData() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const authToken = urlParams.get("auth_token");

        // Assume an API endpoint exists in SvelteKit that replicates the Node.js one
        const response = await fetch(`/api/me?auth_token=${encodeURIComponent(authToken ?? "")}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();
        logInfo("Response:", JSON.stringify(data));

        if (!response.ok) {
          throw new Error("Failed to get user data");
        }

        if (data.userId && data.userName && data.patientId) {
          userId = data.userId;
          userName = data.userName;
          patientId = data.patientId;
        } else {
          logError("No userId, userName, or patientId found in response");
          goto("/unauthorized?error=Authentication+failed");
        }
      } catch (error) {
        logError("Error getting user data:", error);
        goto("/unauthorized?error=Authentication+failed");
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