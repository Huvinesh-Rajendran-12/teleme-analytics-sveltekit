<script lang="ts">
  import { Icon } from '$lib/icons';

  // Define the button type
  export let buttons: {
    id: string;
    label: string;
    icon: string;
    variant: 'primary' | 'secondary' | 'ghost' | 'gradient-blue-teal';
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

    const result = iconMap[iconEmoji] || '';
    console.debug('Mapping emoji to icon:', {
      emoji: iconEmoji,
      iconName: result,
      mappingFound: !!result
    });
    return result;
  }

  // Handle button click
  function handleSelect(id: string) {
    console.debug('Option button clicked:', id);
    onSelect(id);
  }

  // Call the debug function whenever buttons change
</script>

<div class="flex flex-wrap justify-center gap-3">
  {#each buttons.filter((b) => b.isVisible).sort((a, b) => a.order - b.order) as button}
    {@const iconToUse = button.icon}
    <button
      on:click={() => handleSelect(button.id)}
      class="option-button {button.variant === 'primary'
        ? 'bg-teal-500 hover:bg-teal-600 text-white shadow-md hover:shadow-lg'
        : button.variant === 'secondary'
          ? 'bg-teal-50 hover:bg-teal-100 text-teal-800 shadow-sm hover:shadow'
          : button.variant === 'gradient-blue-teal'
            ? 'bg-gradient-to-teal text-white shadow hover:shadow-lg hover:brightness-110'
            : 'bg-transparent hover:bg-teal-50 text-teal-700 border border-teal-200 hover:border-teal-300'}"
      aria-label={button.label}
    >
      {#if iconToUse}
        {#if getIconName(iconToUse)}
          <span class="option-icon">
            <Icon
              name={getIconName(iconToUse)}
              size={22}
              color={button.variant === 'primary' ? '#FFFFFF' : undefined}
            />
          </span>
        {:else}
          <span class="option-icon">{iconToUse}</span>
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
    padding: 0.75rem 1.4rem;
    border-radius: 0.5rem;
    font-size: 0.95rem;
    font-weight: 500;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    transform: translateY(0);
  }

  .option-button:hover {
    transform: translateY(-1px);
  }

  .option-button:active {
    transform: translateY(0);
  }

  .option-icon {
    margin-right: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .option-label {
    white-space: nowrap;
  }

  /* Add teal gradient for gradient buttons */
  :global(.bg-gradient-to-teal) {
    background-image: linear-gradient(to right, #26a69a, #4db6ac);
  }
</style>
