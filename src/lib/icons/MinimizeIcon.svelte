<script lang="ts">
  export let size = 24;
  export let color = "#FFFFFF"; // White color for contrast on teal header
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
  class="icon-minimize"
>
  <!-- Minimize icon (horizontal line) -->
  <path d="M8 12h8" stroke={color} stroke-width={strokeWidth} />
</svg>

<style>
  .icon-minimize {
    transition: opacity 0.2s ease;
  }
  .icon-minimize:hover {
    opacity: 0.8;
  }
</style>