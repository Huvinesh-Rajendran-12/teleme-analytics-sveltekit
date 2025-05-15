<script lang="ts">
  import BaseIcon from './BaseIcon.svelte';
  export let size = 24;
  export let color = "currentColor";
  export let strokeWidth = 2;
</script>

<BaseIcon {size} {color} {strokeWidth}>
  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
</BaseIcon>
