<script lang="ts">
  import Icon from '../Icon.svelte';

  export let title: string;
  export let value: string | number;
  export let iconName: string;
  export let iconColor: string;
  export let bgColorClass: string; // e.g., 'bg-blue-100', 'bg-green-100'
  export let valueClass: string = 'text-2xl font-semibold'; // Default value styling
  export let hoverBorderColor: string = 'hover:border-blue-200'; // Default hover border color
</script>

<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-all duration-300 ease-in-out hover:shadow-md {hoverBorderColor}">
  <div class="flex items-center">
    <div class="flex-shrink-0 {bgColorClass} rounded-md p-3">
      <Icon name={iconName} size={24} color={iconColor} />
    </div>
    <div class="ml-5">
      <h3 class="text-gray-500 text-sm">
        {title}
      </h3>
      <div class="mt-1 {valueClass}">
        {value}
      </div>
    </div>
  </div>
</div>