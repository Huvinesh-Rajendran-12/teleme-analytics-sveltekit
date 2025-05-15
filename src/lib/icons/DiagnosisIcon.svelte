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
  <!-- Background -->
  <circle cx="12" cy="12" r="10" fill={bgColor} />
  
  <!-- Stethoscope bell -->
  <circle cx="12" cy="15" r="2.5" fill={accentColor} stroke={color} />
  
  <!-- Stethoscope tube -->
  <path d="M12 12.5V8.5" stroke={color} stroke-width={strokeWidth} />
  <path d="M12 8.5C12 7 10.5 5.5 9 5.5C7.5 5.5 6 6 6 8.5" stroke={color} stroke-width={strokeWidth} />
  <path d="M12 8.5C12 7 13.5 5.5 15 5.5C16.5 5.5 18 6 18 8.5" stroke={color} stroke-width={strokeWidth} />
  
  <!-- Reading value (using path instead of text for better SVG compatibility) -->
  <path d="M10.5 16.8v-3.6h1.2v3.6h-1.2zm2.4 0v-3.6h1.2v3.6h-1.2z" fill={color} />
</BaseIcon>
