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
  
  <!-- User silhouette -->
  <path 
    d="M8 14.5C8 12.5 9.8 11 12 11C14.2 11 16 12.5 16 14.5V16H8V14.5Z" 
    fill={accentColor} 
    stroke={color} 
    stroke-width={strokeWidth} 
  />
  <circle 
    cx="12" 
    cy="7" 
    r="3" 
    fill={accentColor} 
    stroke={color} 
    stroke-width={strokeWidth} 
  />
</BaseIcon>
