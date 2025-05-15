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
  <!-- Paper airplane background -->
  <path d="M12 21.5L18.5 7L5.5 11.5L9.5 14L12 21.5Z" fill="#E8F0FE" />
  
  <!-- Paper airplane outline -->
  <path d="M12 21.5L18.5 7L5.5 11.5L9.5 14L12 21.5Z" stroke={color} stroke-width={strokeWidth} fill="none" />
  
  <!-- Paper airplane fold line -->
  <path d="M9.5 14L18.5 7" stroke={color} stroke-width={strokeWidth} />
</svg>
