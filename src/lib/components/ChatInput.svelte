<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';

  // Create a dispatcher for events
  const dispatch = createEventDispatcher();

  // Maximum characters allowed in the input field
  export let maxLength = 1000;
  export let disabled = false;
  export let error: string | null = null;

  let question = '';
  let charCount = 0;
  let isExceedingLimit = false;
  
  // Update character count whenever question changes
  $: {
    charCount = question.length;
    isExceedingLimit = question.length > maxLength;
  }

  function handleSubmit(e: Event) {
    e.preventDefault();
    
    // Don't allow submission if exceeding the character limit
    if (question.trim() && !isExceedingLimit) {
      dispatch('sendQuestion', question);
      question = '';
      charCount = 0;
    }
  }
  
  function handleInputChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const newValue = target.value;
    
    // Always update the state to show the current input and character count
    question = newValue;
    
    // If exceeding limit, don't allow more characters (but allow deletion)
    if (newValue.length > maxLength && question.length === maxLength) {
      // At the limit, don't allow more input
      question = question;
    }
  }
</script>

<form on:submit={handleSubmit} class="mt-6">
  <div class="chat-input-container relative flex flex-col">
    <div class="flex items-center p-1 bg-white rounded-2xl shadow">
      <input
        type="text"
        value={question}
        on:input={handleInputChange}
        placeholder="Type your question here..."
        {disabled}
        class="chat-input flex-grow p-3 px-4 bg-transparent border-none {isExceedingLimit ? 'border-red-500 text-red-500' : ''}"
        maxlength={maxLength + 1} 
      />
      <button
        type="submit"
        disabled={disabled || !question.trim()}
        class="chat-submit-btn relative overflow-hidden p-3 px-5 btn-gradient text-white font-medium rounded-xl"
      >
        <div class="flex items-center">
          <span>Send</span>
          <svg xmlns="http://www.w3.org/2000/svg" class="send-icon h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </div>
        <div class="hover-overlay"></div>
      </button>
    </div>
    
    <div class="flex justify-between items-center mt-1 px-2">
      <div class="text-xs {isExceedingLimit ? 'text-red-500 font-medium' : 'text-gray-500'}">
        {charCount}/{maxLength} characters
      </div>
      
      {#if isExceedingLimit}
        <div class="text-red-500 text-xs">
          Question is too long. Please shorten your text.
        </div>
      {/if}
    </div>
  </div>
  
  {#if error}
    <div class="text-red-500 text-sm mt-2 text-center">
      {error}
    </div>
  {/if}
</form>