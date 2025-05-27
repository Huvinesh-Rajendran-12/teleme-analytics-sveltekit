<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  // Create a dispatcher for events
  const dispatch = createEventDispatcher<{
    change: string;
    submit: void;
  }>();
  
  // Props
  export let value: string = '12';
  export let error: string | null = null;
  export let disabled: boolean = false;
  export let min: number = 1;
  export let max: number = 60;

  // Internal warning state
  let warning: string | null = null;
  let warningTimeout: ReturnType<typeof setTimeout> | null = null;

  // Handle value changes
  function handleInput(e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    const originalValue = target.value;
    
    // Replace any non-digit characters
    const cleanValue = originalValue.replace(/\D/g, '');
    
    // Check for invalid characters
    if (originalValue !== cleanValue && originalValue !== '') {
      showWarning('Only numbers are allowed');
    }
    
    target.value = cleanValue;
    
    // Enforce min-max range and show warnings
    const numValue = parseInt(target.value);
    if (!isNaN(numValue)) {
      if (numValue > max) {
        target.value = max.toString();
        showWarning(`Maximum value is ${max}`);
      } else if (numValue < min && target.value !== '') {
        target.value = min.toString();
        showWarning(`Minimum value is ${min}`);
      } else {
        clearWarning();
      }
    } else if (target.value === '') {
      clearWarning();
    }
    
    // Update the bound value and dispatch change event
    value = target.value;
    dispatch('change', value);
  }
  
  // Handle key press events
  function handleKeyPress(e: KeyboardEvent) {
    // Only allow digits 0-9
    const charCode = e.which ? e.which : e.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
      e.preventDefault();
      showWarning('Only numbers are allowed');
    }
    
    // Submit on Enter key
    if (charCode === 13) {
      dispatch('submit');
    }
  }

  // Show warning message
  function showWarning(message: string) {
    warning = message;
    
    // Clear any existing timeout
    if (warningTimeout) {
      clearTimeout(warningTimeout);
    }
    
    // Auto-hide warning after 3 seconds
    warningTimeout = setTimeout(() => {
      warning = null;
      warningTimeout = null;
    }, 3000);
  }

  // Clear warning message
  function clearWarning() {
    if (warningTimeout) {
      clearTimeout(warningTimeout);
      warningTimeout = null;
    }
    warning = null;
  }
</script>

<div class="relative">
  <input
    type="text"
    bind:value
    pattern="^[1-9][0-9]?$|^{max}$"
    maxlength="2"
    inputmode="numeric"
    on:input={handleInput}
    on:keypress={handleKeyPress}
    class="input-number border rounded-lg px-4 py-2 w-24 text-center font-medium {error
      ? 'border-red-500'
      : 'border-gray-300'}"
    placeholder="12"
    {disabled}
    aria-label="Duration in months"
  />
</div>

{#if error}
  <div class="text-red-500 text-sm mt-2 text-center">
    {error}
  </div>
{/if}

{#if warning}
  <div class="text-amber-600 text-sm mt-2 text-center animate-pulse">
    ⚠️ {warning}
  </div>
{/if}

<style>
  .input-number::-webkit-inner-spin-button,
  .input-number::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  
  /* Using the standard 'appearance' property with vendor prefixes */
  .input-number {
    appearance: textfield;
    -webkit-appearance: textfield;
  }
  
  input:disabled {
    background-color: #f9f9f9;
    opacity: 0.7;
    cursor: not-allowed;
  }
</style>