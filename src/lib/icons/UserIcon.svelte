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
  
  <!-- User silhouette -->
  <path d="M8 14.5C8 12.5 9.8 11 12 11C14.2 11 16 12.5 16 14.5V16H8V14.5Z" fill="#A4C2F7" stroke={color} stroke-width={strokeWidth} />
  <circle cx="12" cy="7" r="3" fill="#A4C2F7" stroke={color} stroke-width={strokeWidth} />
</svg>
