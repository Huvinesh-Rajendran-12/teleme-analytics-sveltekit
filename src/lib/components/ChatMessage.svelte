<script lang="ts">
  // import { parseMarkdown } from '$lib/utils/markdownParser';
  import type { Message } from '$lib/types';
  // import SafeHtml from './common/SafeHtml.svelte';
  import SvelteMarkdown from 'svelte-markdown';
  import { parseMarkdown } from '$lib/utils/markdownParser';

  export let message: Message;

  // Function to safely convert content to string
  function getMessageContent(content: string | object): string {
    if (typeof content === 'string') {
      return content;
    } else if (content && typeof content === 'object') {
      try {
        return JSON.stringify(content, null, 2);
      } catch {
        return 'Error: Could not display message content.';
      }
    }
    return 'Unknown message format';
  }

  // Parse markdown content properly
  $: sanitizedContent = parseMarkdown(getMessageContent(message.content));
  // $: displayContent = parseMarkdown(rawContent);
</script>

<div
  class={`p-4 rounded-lg max-w-4xl ${message.role === 'user' ? 'bg-blue-50 ml-auto' : 'bg-white shadow-sm'}`}
>
  <div class="prose prose-sm">
    <SvelteMarkdown source={sanitizedContent} />
  </div>
</div>

<style>
  .prose {
    font-size: 0.95rem;
    line-height: 1.5;
    color: #1f2937;
  }

  .prose :global(ul) {
    margin-top: 0.5em;
    margin-bottom: 0.5em;
    padding-left: 1.5em;
  }

  .prose :global(li) {
    margin-top: 0.25em;
    margin-bottom: 0.25em;
  }

  .prose :global(p) {
    margin-top: 0.75em;
    margin-bottom: 0.75em;
  }

  .prose :global(pre) {
    padding: 0.75rem;
    background-color: #f3f4f6;
    border-radius: 0.25rem;
    overflow-x: auto;
  }
</style>
