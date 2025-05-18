<script lang="ts">
  export let size = 24;
  export let color = "#26A69A"; // Teal color to match the header
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
  aria-hidden="true"
  focusable="false"
  class="icon-back"
>
  <!-- Background circle with subtle gradient -->
  <defs>
    <linearGradient id="backGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E0F2F1" />
      <stop offset="100%" stop-color="#B2DFDB" />
    </linearGradient>
  </defs>
  
  <!-- Background circle with gradient -->
  <circle cx="12" cy="12" r="10" fill="url(#backGradient)" />
  
  <!-- Back arrow with improved proportions -->
  <path d="M16 12H9" stroke={color} stroke-width={strokeWidth} />
  <path d="M12 9L9 12L12 15" stroke={color} stroke-width={strokeWidth} fill="none" />
</svg>

<style>
  .icon-back {
    transition: transform 0.2s ease;
  }
  .icon-back:hover {
    transform: translateX(-2px);
  }
</style>