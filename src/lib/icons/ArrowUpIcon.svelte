<script lang="ts">
  import BaseIcon from './BaseIcon.svelte';
  export let size = 24;
  export let color = "currentColor";
  export let strokeWidth = 2;
</script>

<BaseIcon {size} {color} {strokeWidth}>
  <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
</BaseIcon>
