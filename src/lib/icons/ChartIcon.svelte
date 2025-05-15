<script lang="ts">import BaseIcon from './BaseIcon.svelte';
export let size = 24;
export let color = "currentColor";
export let strokeWidth = 2;

// Colors for consistent styling
const bgColor = "#E8F0FE";
const accentColor = "#A4C2F7"; </script>

<BaseIcon {size} {color} {strokeWidth}>
  <!-- Background with more visible outline -->
  <rect x="3" y="3" width="18" height="18" rx="2" fill={bgColor} stroke={color} stroke-width={strokeWidth} />

  <!-- Axis lines with stronger appearance -->
  <path d="M3 18h18" stroke={color} stroke-width={strokeWidth} />
  <path d="M3 3v15" stroke={color} stroke-width={strokeWidth} />

  <!-- Data bars with gradient effect for better visibility -->
  <rect x="6" y="7" width="3" height="11" fill={accentColor} stroke={color} stroke-width="1" />
  <rect x="11" y="9" width="3" height="9" fill={accentColor} stroke={color} stroke-width="1" />
  <rect x="16" y="5" width="3" height="13" fill={accentColor} stroke={color} stroke-width="1" />

  <!-- Enhanced data points on top of each bar -->
  <circle cx="7.5" cy="7" r="1.2" fill={color} />
  <circle cx="12.5" cy="9" r="1.2" fill={color} />
  <circle cx="17.5" cy="5" r="1.2" fill={color} />

  <!-- Line connecting data points for trend visualization -->
  <path
    d="M7.5 7L12.5 9L17.5 5"
    stroke={color}
    stroke-width="1"
    stroke-dasharray="1 1"
    fill="none"
  />

  <!-- Title indicator -->
  <rect x="5" y="2" width="14" height="2" rx="1" fill={color} />
</BaseIcon>
