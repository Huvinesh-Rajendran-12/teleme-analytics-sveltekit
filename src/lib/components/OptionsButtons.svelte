<script lang="ts">
import { Icon } from '$lib/icons';

// Define the button type
export let buttons: {
  id: string;
  label: string;
  icon: string;
  variant: "primary" | "secondary" | "ghost";
  isVisible: boolean;
  order: number;
}[] = [];

// Props for callback function
export let onSelect: (id: string) => void;

// Map emoji icons to our custom icon names
function getIconName(iconEmoji: string): string {
  const iconMap: Record<string, string> = {
    '📊': 'chart',
    '🩺': 'diagnosis',
    '💊': 'medicine',
    '🔙': 'back',
    '❓': 'question',
    '👋': 'end'
  };
  
  return iconMap[iconEmoji] || '';
}

// Handle button click
function handleSelect(id: string) {
  onSelect(id);
}
</script>

<div class="flex flex-wrap justify-center gap-3">
  {#each buttons.filter(b => b.isVisible).sort((a, b) => a.order - b.order) as button}
    <button
      on:click={() => handleSelect(button.id)}
      class="option-button {button.variant === 'primary'
        ? 'bg-blue-500 hover:bg-blue-600 text-white'
        : button.variant === 'secondary'
          ? 'bg-gray-200 hover:bg-gray-300 text-gray-800'
          : 'bg-transparent hover:bg-gray-100 text-gray-700 border border-gray-300'}"
    >
      {#if button.icon}
        {#if getIconName(button.icon)}
          <span class="option-icon">
            <Icon name={getIconName(button.icon)} size={22} />
          </span>
        {:else}
          <span class="option-icon">{button.icon}</span>
        {/if}
      {/if}
      <span class="option-label">{button.label}</span>
    </button>
  {/each}
</div>

<style>
.option-button {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.6rem 1.2rem;
    border-radius: 0.375rem;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.2s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

.option-icon {
    margin-right: 0.7rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .option-label {
    white-space: nowrap;
  }
</style>
