<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let buttons: Array<{
    id: string;
    label: string;
    icon: string;
    variant: 'primary' | 'secondary' | 'ghost';
    isVisible: boolean;
    order: number;
  }>;

  const dispatch = createEventDispatcher();

  function getButtonClass(variant: string): string {
    switch (variant) {
      case 'primary':
        return 'btn-primary bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow hover:shadow-md';
      case 'secondary':
        return 'btn-secondary bg-white text-gray-700 border border-gray-200 shadow-sm hover:bg-gray-50';
      case 'ghost':
        return 'btn-ghost bg-transparent text-gray-500 hover:bg-gray-100';
      default:
        return 'btn-secondary bg-white text-gray-700 border border-gray-200 shadow-sm hover:bg-gray-50';
    }
  }

  function handleSelect(id: string) {
    dispatch('select', id);
  }

  $: visibleButtons = buttons
    .filter(b => b.isVisible)
    .sort((a, b) => a.order - b.order);
</script>

<div class="options-container flex flex-wrap justify-center gap-2 w-full">
  {#each visibleButtons as button (button.id)}
    <button
      on:click={() => handleSelect(button.id)}
      class="option-button flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 transform hover:scale-105 {getButtonClass(button.variant)}"
    >
      <span class="button-icon mr-2">{button.icon}</span>
      <span class="button-label">{button.label}</span>
    </button>
  {/each}
</div>