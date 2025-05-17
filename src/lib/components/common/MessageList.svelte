<script lang="ts">
  import ChatMessage from '../ChatMessage.svelte';
  import type { Message } from '$lib/types';
  
  // Props
  export let messages: Message[] = [];
  export let userName: string = 'You';
  export let assistantName: string = 'Assistant';
</script>

{#if messages.length > 0}
  {#each messages as msg (msg.id)}
    <div class="mb-8">
      <div class="text-sm mb-1 {msg.role === 'user' ? 'text-right' : 'text-left'}">
        <span class="text-gray-500 font-medium">
          {msg.role === 'user' ? userName : assistantName}
        </span>
      </div>
      <ChatMessage message={msg} />
    </div>
  {/each}
{:else}
  <!-- No messages yet -->
  <div class="py-4 text-center text-gray-400 italic">
    No messages yet.
  </div>
{/if}

<style>
  /* Any additional styling for message list */
</style>
