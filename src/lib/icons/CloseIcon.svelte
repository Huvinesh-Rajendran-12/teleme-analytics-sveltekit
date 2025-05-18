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
  class="icon-close"
>
  <!-- X icon (close) -->
  <path d="M18 6L6 18" stroke={color} stroke-width={strokeWidth} />
  <path d="M6 6L18 18" stroke={color} stroke-width={strokeWidth} />
</svg>

<style>
  .icon-close {
    transition: opacity 0.2s ease;
  }
  .icon-close:hover {
    opacity: 0.8;
  }
</style>