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
  <rect x="3" y="3" width="18" height="18" rx="2" fill="#E8F0FE" />
  
  <!-- Axis lines -->
  <path d="M3 18h18" stroke={color} stroke-width={strokeWidth} />
  <path d="M3 3v15" stroke={color} stroke-width={strokeWidth} />
  
  <!-- Data bars - with lighter blue to match other icons -->
  <rect x="6" y="7" width="3" height="11" fill="#A4C2F7" />
  <rect x="11" y="9" width="3" height="9" fill="#A4C2F7" />
  <rect x="16" y="5" width="3" height="13" fill="#A4C2F7" />
  
  <!-- Bar outlines -->
  <rect x="6" y="7" width="3" height="11" fill="none" stroke={color} stroke-width="1" />
  <rect x="11" y="9" width="3" height="9" fill="none" stroke={color} stroke-width="1" />
  <rect x="16" y="5" width="3" height="13" fill="none" stroke={color} stroke-width="1" />
  
  <!-- Small dots on top of each bar (data points) -->
  <circle cx="7.5" cy="7" r="1" fill={color} />
  <circle cx="12.5" cy="9" r="1" fill={color} />
  <circle cx="17.5" cy="5" r="1" fill={color} />
  
  <!-- Title Line for "Summary" representation -->
  <line x1="5" y1="3" x2="19" y2="3" stroke={color} stroke-width="3" />
</svg>
