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
  
  <!-- Robot head -->
  <rect x="8" y="6" width="8" height="7" rx="2" fill="#A4C2F7" stroke={color} stroke-width={strokeWidth} />
  
  <!-- Robot antenna -->
  <line x1="12" y1="6" x2="12" y2="4" stroke={color} stroke-width={strokeWidth} />
  <circle cx="12" cy="3" r="1" fill={color} />
  
  <!-- Robot eyes -->
  <circle cx="10" cy="9" r="1" fill={color} />
  <circle cx="14" cy="9" r="1" fill={color} />
  
  <!-- Robot body -->
  <rect x="9" y="13" width="6" height="5" rx="1" fill="#A4C2F7" stroke={color} stroke-width={strokeWidth} />
  
  <!-- Robot arms -->
  <line x1="9" y1="15" x2="6" y2="13" stroke={color} stroke-width={strokeWidth} />
  <line x1="15" y1="15" x2="18" y2="13" stroke={color} stroke-width={strokeWidth} />
</svg>
