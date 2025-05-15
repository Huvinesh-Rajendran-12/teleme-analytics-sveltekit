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
  <!-- Medicine bottle -->
  <path d="M8 3h8l1 3v14a2 2 0 01-2 2h-6a2 2 0 01-2-2V6l1-3z" fill="#E8F0FE" stroke={color} stroke-width={strokeWidth} />
  
  <!-- Bottle neck -->
  <path d="M8 3h8v3H8V3z" fill="#A4C2F7" stroke={color} stroke-width={strokeWidth} />
  
  <!-- Bottle label -->
  <rect x="7" y="9" width="10" height="6" rx="1" fill="#A4C2F7" />
  
  <!-- Number 10 -->
  <text x="9.5" y="14" font-family="Arial" font-size="4.5" font-weight="bold" fill={color}>10</text>
  
  <!-- Pills -->
  <circle cx="9" y="7" r="1" fill={color} />
  <circle cx="12" y="7" r="1" fill={color} />
  <circle cx="15" y="7" r="1" fill={color} />
</svg>
