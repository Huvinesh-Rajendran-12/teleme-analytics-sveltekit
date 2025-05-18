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

  // Handle value changes
  function handleInput(e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    
    // Replace any non-digit characters
    target.value = target.value.replace(/\D/g, '');
    
    // Enforce min-max range
    const numValue = parseInt(target.value);
    if (!isNaN(numValue)) {
      if (numValue > max) target.value = max.toString();
      if (numValue < min && target.value !== '') target.value = min.toString();
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
    }
    
    // Submit on Enter key
    if (charCode === 13) {
      dispatch('submit');
    }
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

<style>
  .input-number::-webkit-inner-spin-button,
  .input-number::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  
  .input-number {
    -moz-appearance: textfield; /* Firefox */
  }
  
  input:disabled {
    background-color: #f9f9f9;
    opacity: 0.7;
    cursor: not-allowed;
  }
</style>