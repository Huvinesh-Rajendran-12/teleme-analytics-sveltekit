export const menuConfig = {
  menuButtons: {
    main: [
      {
        id: "summarize",
        label: "Summarize all data",
        icon: "📊",
        variant: "primary",
        isVisible: true,
        order: 1,
      },
      {
        id: "diagnoses",
        label: "Top 20 Diagnoses",
        icon: "🩺",
        variant: "secondary",
        isVisible: true,
        order: 2,
      },
      {
        id: "medicines",
        label: "Top 10 Medicines",
        icon: "💊",
        variant: "secondary",
        isVisible: true,
        order: 3,
      },
    ],
    conversation: [
      {
        id: "back",
        label: "Back to Menu",
        icon: "🔙",
        variant: "secondary",
        isVisible: true,
        order: 1,
      },
      {
        id: "question",
        label: "Ask a Question",
        icon: "❓",
        variant: "primary",
        isVisible: true,
        order: 2,
      },
      {
        id: "end",
        label: "End Conversation",
        icon: "👋",
        variant: "ghost",
        isVisible: true,
        order: 3,
      },
    ],
  },
};
