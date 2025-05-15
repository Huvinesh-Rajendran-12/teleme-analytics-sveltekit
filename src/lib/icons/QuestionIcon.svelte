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
  <!-- Question mark background -->
  <circle cx="12" cy="12" r="10" fill="#E8F0FE" />
  
  <!-- Question mark body -->
  <path d="M9.5 9C9.5 7.34315 10.6193 6 12 6C13.3807 6 14.5 7.34315 14.5 9C14.5 10.3 13.3807 11 12 13" stroke={color} stroke-width={strokeWidth} fill="none" />
  
  <!-- Question mark dot -->
  <circle cx="12" cy="17" r="1" fill={color} />
</svg>
