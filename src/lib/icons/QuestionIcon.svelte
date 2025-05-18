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
  class="icon-question"
>
  <!-- Gradient definition -->
  <defs>
    <linearGradient id="questionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E0F2F1" />
      <stop offset="100%" stop-color="#B2DFDB" />
    </linearGradient>
  </defs>
  
  <!-- Question mark background with soft gradient -->
  <circle cx="12" cy="12" r="10" fill="url(#questionGradient)" />
  
  <!-- Question mark with improved curve -->
  <path
    d="M9.5 9.5C9.5 7.6 10.62 6 12 6C13.38 6 14.5 7.6 14.5 9.5C14.5 11.5 12.5 12 12 13.5"
    stroke={color}
    stroke-width={strokeWidth}
    stroke-linecap="round"
    fill="none"
  />
  
  <!-- Question mark dot with slight glow effect -->
  <circle cx="12" cy="17" r="1" fill={color}>
    <animate
      attributeName="opacity"
      values="0.8;1;0.8"
      dur="2s"
      repeatCount="indefinite"
    />
  </circle>
</svg>

<style>
  .icon-question {
    transition: transform 0.3s ease;
  }
  .icon-question:hover {
    transform: scale(1.05);
  }
</style>