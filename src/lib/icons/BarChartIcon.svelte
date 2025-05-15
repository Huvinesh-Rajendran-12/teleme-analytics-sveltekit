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
  <!-- Background with subtle graph grid -->
  <rect x="2" y="2" width="20" height="20" rx="2" fill={bgColor} stroke={color} stroke-width="1" stroke-opacity="0.3" />
  
  <!-- Horizontal grid lines -->
  <line x1="4" y1="8" x2="20" y2="8" stroke={color} stroke-width="0.5" stroke-opacity="0.2" />
  <line x1="4" y1="14" x2="20" y2="14" stroke={color} stroke-width="0.5" stroke-opacity="0.2" />
  
  <!-- Base axis -->
  <path d="M4 20h16" stroke={color} stroke-width={strokeWidth} />
  
  <!-- Vertical bars with fills -->
  <rect x="6" y="16" width="2" height="4" fill={accentColor} stroke={color} stroke-width="1" />
  <rect x="10" y="8" width="2" height="12" fill={accentColor} stroke={color} stroke-width="1" />
  <rect x="14" y="12" width="2" height="8" fill={accentColor} stroke={color} stroke-width="1" />
  <rect x="18" y="4" width="2" height="16" fill={accentColor} stroke={color} stroke-width="1" />
</BaseIcon>
