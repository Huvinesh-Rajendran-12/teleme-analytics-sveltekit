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
  <!-- Background -->
  <circle cx="12" cy="12" r="10" fill="#E8F0FE" />
  
  <!-- Stethoscope bell -->
  <circle cx="12" cy="15" r="2.5" fill="#A4C2F7" stroke={color} />
  
  <!-- Stethoscope tube -->
  <path d="M12 12.5V8.5" stroke={color} stroke-width={strokeWidth} />
  <path d="M12 8.5C12 7 10.5 5.5 9 5.5C7.5 5.5 6 6 6 8.5" stroke={color} stroke-width={strokeWidth} />
  <path d="M12 8.5C12 7 13.5 5.5 15 5.5C16.5 5.5 18 6 18 8.5" stroke={color} stroke-width={strokeWidth} />
  
  <!-- Number 20 -->
  <text x="10.5" y="16" font-family="Arial" font-size="4" font-weight="bold" fill={color}>20</text>
</svg>
