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
  class="icon-end"
>
  <!-- Gradient definition -->
  <defs>
    <linearGradient id="endGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E0F2F1" />
      <stop offset="100%" stop-color="#B2DFDB" />
    </linearGradient>
  </defs>
  
  <!-- Background circle with gradient -->
  <circle cx="12" cy="12" r="10" fill="url(#endGradient)" />
  
  <!-- Waving hand icon - simplified and more modern -->
  <path
    d="M16 12C16 12 14.5 9 12.5 9C10.5 9 10 12.5 10 12.5C10 12.5 9 9.5 8 10C7 10.5 8 13 8 13"
    stroke={color}
    stroke-width={strokeWidth}
    stroke-linecap="round"
    fill="none"
  />
  
  <!-- Palm -->
  <path
    d="M14 14.5C14 14.5 13 16 11.5 16C10 16 9 14.5 9 14.5"
    stroke={color}
    stroke-width={strokeWidth}
    stroke-linecap="round"
    fill="none"
  />
</svg>

<style>
  .icon-end {
    transition: all 0.3s ease;
  }
  .icon-end:hover {
    transform: rotate(10deg);
  }
</style>