<script lang="ts">
  export let size = 24;
  export let color = "currentColor";
  export let strokeWidth = 2;
  export let viewBox = "0 0 24 24";
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  {viewBox}
  fill="none"
  stroke={color}
  stroke-width={strokeWidth}
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <slot />
</svg>