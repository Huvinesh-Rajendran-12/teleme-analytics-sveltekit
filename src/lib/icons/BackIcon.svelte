<script lang="ts">
  export let size = 24;
  export let color = "#4285F4"; // Google blue color by default
  export let strokeWidth = 2;
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke={color}
  stroke-width={strokeWidth}
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <!-- Background circle -->
  <circle cx="12" cy="12" r="10" fill="#E8F0FE" />
  
  <!-- Back arrow -->
  <path d="M18 12H8" stroke={color} stroke-width={strokeWidth} />
  <path d="M12 8L8 12L12 16" stroke={color} stroke-width={strokeWidth} fill="none" />
</svg>
