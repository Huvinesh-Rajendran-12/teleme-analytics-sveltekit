<script lang="ts">
  export let message: {
    id: string;
    role: import('$lib/types').MessageRole;
    content: string | object;
  };

  // Function to safely convert content to string
  function getMessageContent(content: string | object): string {
    if (typeof content === 'string') {
      return content;
    } else if (content && typeof content === 'object') {
      try {
        return JSON.stringify(content, null, 2);
      } catch (e) {
        return "Error: Could not display message content.";
      }
    }
    return "Unknown message format";
  }

  // Convert message content with line breaks for display
  $: formattedContent = getMessageContent(message.content).replace(/\n/g, '<br>');

  // Determine if message content has a bullet list
  $: hasBulletList = typeof message.content === 'string' && 
    (message.content.includes('\n- ') || message.content.includes('\n* ') || 
     message.content.includes('\n• ') || message.content.startsWith('- ') || 
     message.content.startsWith('* ') || message.content.startsWith('• '));

  // Format messages with bullet points with proper HTML instead of <br> tags
  function formatBulletList(content: string): string {
    if (!hasBulletList) return content.replace(/\n/g, '<br>');
    
    // Split into lines
    const lines = content.split('\n');
    let result = '';
    let inList = false;
    
    for (const line of lines) {
      // Check if this line is a bullet point
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ') || line.trim().startsWith('• ')) {
        if (!inList) {
          // Start a new list
          result += '<ul class="list-disc pl-4 space-y-1">';
          inList = true;
        }
        // Add list item, removing the bullet character
        const itemContent = line.trim().substring(2);
        result += `<li>${itemContent}</li>`;
      } else {
        // Not a bullet point
        if (inList) {
          // Close the list if we were in one
          result += '</ul>';
          inList = false;
        }
        
        // Add normal line
        if (result) {
          result += '<br>';
        }
        result += line;
      }
    }
    
    // Close list if we end with a list
    if (inList) {
      result += '</ul>';
    }
    
    return result;
  }

  // Determine message formatting based on content
  $: displayContent = hasBulletList 
    ? formatBulletList(getMessageContent(message.content))
    : formattedContent;
</script>

<div class={`p-4 rounded-lg max-w-4xl ${message.role === 'user' ? 'bg-blue-50 ml-auto' : 'bg-white shadow-sm'}`}>
  <div class="prose prose-sm">
    {@html displayContent}
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
  }
  
  .prose :global(li) {
    margin-top: 0.25em;
    margin-bottom: 0.25em;
  }
</style>