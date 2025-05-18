<script lang="ts">
  export let name: string;
  export let size: number = 24;
  export let color: string = "#26A69A"; // Teal color to match the header
  export let strokeWidth: number = 2;
  
  // Dynamically import the requested icon
  import {
    UserIcon,
    UsersIcon,
    ChartIcon,
    CalendarIcon,
    LightningIcon,
    DocumentIcon,
    ClockIcon,
    RefreshIcon,
    ArrowUpIcon,
    PlusUserIcon,
    ViewIcon,
    ChevronDownIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    MessageIcon,
    LoadingIcon,
    RocketIcon,
    MagnifyingGlassIcon,
    BarChartIcon,
    RetentionIcon,
    SessionIcon,
    BoxesIcon,
    // New icons
    SendIcon,
    BackIcon,
    QuestionIcon,
    EndIcon,
    AssistantIcon,
    DiagnosisIcon,
    MedicineIcon,
    ScrollToBottomIcon,
    MinimizeIcon,
    CloseIcon
  } from '$lib/icons';
  
  // Map icon names to components
  const iconComponents = {
    user: UserIcon,
    users: UsersIcon,
    chart: ChartIcon,
    calendar: CalendarIcon,
    lightning: LightningIcon,
    document: DocumentIcon,
    clock: ClockIcon,
    refresh: RefreshIcon,
    arrowUp: ArrowUpIcon,
    plusUser: PlusUserIcon,
    view: ViewIcon,
    chevronDown: ChevronDownIcon,
    chevronLeft: ChevronLeftIcon,
    chevronRight: ChevronRightIcon,
    message: MessageIcon,
    loading: LoadingIcon,
    rocket: RocketIcon,
    magnifyingGlass: MagnifyingGlassIcon,
    barChart: BarChartIcon,
    retention: RetentionIcon,
    session: SessionIcon,
    boxes: BoxesIcon,
    // New icons
    send: SendIcon,
    back: BackIcon,
    question: QuestionIcon,
    end: EndIcon,
    assistant: AssistantIcon,
    diagnosis: DiagnosisIcon,
    medicine: MedicineIcon,
    scrollToBottom: ScrollToBottomIcon,
    minimize: MinimizeIcon,
    close: CloseIcon
  };
  
  // Get the requested icon component
  const IconComponent = iconComponents[name as keyof typeof iconComponents];
</script>

{#if IconComponent}
  <svelte:component this={IconComponent} {size} {color} {strokeWidth} />
{:else}
  <!-- Fallback if icon not found -->
  <span class="text-red-500">Icon {name} not found</span>
{/if}
