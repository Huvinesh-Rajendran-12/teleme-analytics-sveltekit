<script lang="ts">
  import BaseIcon from './BaseIcon.svelte';
  export let size = 24;
  export let color = "currentColor";
  export let strokeWidth = 2;
  
  // Colors for consistent styling
  const bgColor = "#E8F0FE";
  const accentColor = "#A4C2F7";
</script>

<BaseIcon {size} {color} {strokeWidth}>
  <!-- Background circle -->
  <circle cx="12" cy="12" r="10" fill={bgColor} />
  
  <!-- Arrow shaft -->
  <path d="M16 12H8" stroke={color} stroke-width={strokeWidth} />
  
  <!-- Arrow head -->
  <path d="M12 8L8 12L12 16" stroke={color} stroke-width={strokeWidth} />
  
  <!-- Accent detail -->
  <path 
    d="M8 12C8 12 10 10 10 8" 
    stroke={accentColor} 
    stroke-width="1.5" 
    stroke-linecap="round" 
  />
  <path 
    d="M8 12C8 12 10 14 10 16" 
    stroke={accentColor} 
    stroke-width="1.5" 
    stroke-linecap="round" 
  />
</BaseIcon>