<script lang="ts">
  export let size = 24;
  export let color = "currentColor";
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
  class="animate-spin"
>
  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  <path d="M12 3v3m0 12v3m9-9h-3m-12 0H3m14.25-6.75l-2.12 2.12M8.87 15.13l-2.12 2.12m0-12.75l2.12 2.12m6.38 6.38l2.12 2.12" opacity="0.3" />
</svg>
