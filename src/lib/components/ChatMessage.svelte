<script lang="ts">
  import { onMount } from 'svelte';
  import { marked } from 'marked';
  import { processSvgContent } from '$lib/utils/svgSanitizer';
  import type { Message } from '$lib/types';

  export let message: Message;

  // Maximum characters to show in a message before truncating
  const MAX_VISIBLE_MESSAGE_LENGTH = 2000;
  
  let isUser: boolean;
  let thoughtsExpanded = false;
  let isMessageExpanded = false;
  let isLongMessage = false;
  let mainContent = '';
  let thoughtsContent = '';

  $: {
    isUser = message.role === 'user';
    // Process the content to extract thoughts and sanitize SVG
    const processed = processContent(message.content);
    mainContent = processed.mainContent;
    thoughtsContent = processed.thoughtsContent;
    isLongMessage = mainContent.length > MAX_VISIBLE_MESSAGE_LENGTH;
  }

  // Function to process the content and extract the thoughts section
  function processContent(content: string) {
    // Only process assistant messages for thoughts
    if (isUser) return { mainContent: content, thoughtsContent: '' };

    const thinkRegex = /<think>([\s\S]*?)<\/think>/;
    // Ensure content is a string before using match
    const contentStr = typeof content === 'string' ? content : String(content || '');
    const match = contentStr.match(thinkRegex);

    // Sanitize any SVG content in the message to prevent rendering errors
    const processedContent = processSvgContent(contentStr);

    if (match) {
      // Extract the thoughts content
      const thoughtsContent = match[1].trim();
      // Remove the <think> tags from the main content
      const mainContent = processSvgContent(processedContent.replace(thinkRegex, '').trim());
      return { mainContent, thoughtsContent };
    }

    return {
      mainContent: processedContent,
      thoughtsContent: '',
    };
  }

  // Trim extra spaces while preserving proper markdown formatting
  $: trimmedMainContent = mainContent
    .trim()
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Replace triple+ newlines with double newlines
    .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs with a single space
    .replace(/\n\s*•\s*/g, '\n• ') // Fix bullet point spacing
    .replace(/\n\s*-\s*/g, '\n- '); // Fix dash list spacing

  $: trimmedThoughtsContent = thoughtsContent
    .trim()
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/[ \t]+/g, ' ');

  // Function to get the display content based on expansion state
  function getDisplayContent() {
    if (!isLongMessage || isMessageExpanded) {
      return trimmedMainContent;
    }
    // Return truncated content with ellipsis
    return trimmedMainContent.substring(0, MAX_VISIBLE_MESSAGE_LENGTH) + '...';
  }

  // Convert markdown to HTML
  $: messageHtml = marked(getDisplayContent());
  $: thoughtsHtml = marked(trimmedThoughtsContent);

  onMount(() => {
    // Check if the message is too long and needs truncation
    isLongMessage = trimmedMainContent.length > MAX_VISIBLE_MESSAGE_LENGTH;
  });
</script>

<div class="flex {isUser ? 'justify-end' : 'justify-start'}">
  {#if !isUser}
    <div class="avatar-circle flex items-center justify-center text-xs font-bold mr-3 mt-1">
      T
    </div>
  {/if}
  <div
    class="message-bubble p-4 {isUser ? 'message-user' : 'message-assistant'}"
    style="
      max-width: 85%;
      word-break: break-word;
      transform: scale(1);
      transform-origin: {isUser ? 'right center' : 'left center'};
      animation: 0.2s ease-out 0s 1 normal none running popIn;
    "
  >
    <!-- Render the main content -->
    <div class="markdown-content">
      {@html messageHtml}
    </div>

    <!-- Show "Show more/less" button for long messages -->
    {#if isLongMessage}
      <div class="mt-3 text-center">
        <button
          on:click={() => (isMessageExpanded = !isMessageExpanded)}
          class="px-4 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
        >
          {isMessageExpanded ? "Show less" : "Show more"}
        </button>
      </div>
    {/if}

    <!-- Render the thoughts toggle and content if exists -->
    {#if !isUser && trimmedThoughtsContent}
      <div class="mt-4">
        <!-- Beautiful divider with gradient -->
        <div class="relative flex py-2 items-center thoughts-divider">
          <div class="flex-grow border-t border-gray-200"></div>
          <button
            on:click={() => (thoughtsExpanded = !thoughtsExpanded)}
            class="thoughts-toggle flex items-center mx-3 px-3 py-1 rounded-full text-white text-xs font-medium"
            style="
              box-shadow: {thoughtsExpanded
                ? '0 4px 10px -1px rgba(56, 189, 248, 0.3)'
                : '0 2px 5px -2px rgba(56, 189, 248, 0.1)'};
              transform: {thoughtsExpanded ? 'translateY(-1px)' : 'none'};
            "
          >
            <span class="mr-1">
              {thoughtsExpanded ? "−" : "+"}
            </span>
            Thoughts
          </button>
          <div class="flex-grow border-t border-gray-200"></div>
        </div>

        {#if thoughtsExpanded}
          <div
            class="thoughts-content mt-3 p-3 rounded-md bg-white border border-gray-200 text-sm shadow"
            style="
              background-color: #fcfcfc;
              border-left: 3px solid #12a594;
            "
          >
            {@html thoughtsHtml}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>