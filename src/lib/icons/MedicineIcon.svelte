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
  <!-- Medicine bottle -->
  <path 
    d="M8 3h8l1 3v14a2 2 0 01-2 2h-6a2 2 0 01-2-2V6l1-3z" 
    fill={bgColor} 
    stroke={color} 
    stroke-width={strokeWidth} 
  />
  
  <!-- Bottle neck -->
  <path 
    d="M8 3h8v3H8V3z" 
    fill={accentColor} 
    stroke={color} 
    stroke-width={strokeWidth} 
  />
  
  <!-- Bottle label -->
  <rect 
    x="7" 
    y="9" 
    width="10" 
    height="6" 
    rx="1" 
    fill={accentColor} 
  />
  
  <!-- Number 10 (using path instead of text for better SVG compatibility) -->
  <path d="M9 14.8v-3.6h1.2v3.6h-1.2zm2.4 0v-3.6h1.2v3.6h-1.2z" fill={color} />
  
  <!-- Pills -->
  <circle cx="9" cy="7" r="1" fill={color} />
  <circle cx="12" cy="7" r="1" fill={color} />
  <circle cx="15" cy="7" r="1" fill={color} />
</BaseIcon>
