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
>
  <path d="M4 20h16M4 20v-4M8 20V8M12 20v-8M16 20v-4M20 20v-12" />
</svg>
