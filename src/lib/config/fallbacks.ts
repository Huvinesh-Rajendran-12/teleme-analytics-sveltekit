export enum ErrorType {
  DATA_FETCH = "data_fetch",
  CONNECTION = "connection",
  AUTHENTICATION = "authentication",
  UNKNOWN = "unknown",
}

interface FallbackMessages {
  [key: string]: {
    [key in ErrorType]?: string;
  };
}

const fallbackMessages: FallbackMessages = {
  summarize: {
    [ErrorType.DATA_FETCH]:
      "Sorry, I could not retrieve the data summary at this time. Please try again later.",
    [ErrorType.CONNECTION]:
      "I cannot connect to the analytics service. Please check your network connection and try again.",
    [ErrorType.AUTHENTICATION]:
      "You do not have permission to access this data. Please contact support for assistance.",
    [ErrorType.UNKNOWN]:
      "An unexpected error occurred while processing your request. Please try again later.",
  },
  diagnoses: {
    [ErrorType.DATA_FETCH]:
      "Sorry, I could not retrieve the diagnoses data at this time. Please try again later.",
    [ErrorType.CONNECTION]:
      "I cannot connect to the analytics service. Please check your network connection and try again.",
    [ErrorType.AUTHENTICATION]:
      "You do not have permission to access this data. Please contact support for assistance.",
    [ErrorType.UNKNOWN]:
      "An unexpected error occurred while processing your request. Please try again later.",
  },
  medicines: {
    [ErrorType.DATA_FETCH]:
      "Sorry, I could not retrieve the medicines data at this time. Please try again later.",
    [ErrorType.CONNECTION]:
      "I cannot connect to the analytics service. Please check your network connection and try again.",
    [ErrorType.AUTHENTICATION]:
      "You do not have permission to access this data. Please contact support for assistance.",
    [ErrorType.UNKNOWN]:
      "An unexpected error occurred while processing your request. Please try again later.",
  },
  default: {
    [ErrorType.DATA_FETCH]:
      "Sorry, I could not retrieve the requested data at this time. Please try again later.",
    [ErrorType.CONNECTION]:
      "I cannot connect to the analytics service. Please check your network connection and try again.",
    [ErrorType.AUTHENTICATION]:
      "You do not have permission to access this data. Please contact support for assistance.",
    [ErrorType.UNKNOWN]:
      "An unexpected error occurred while processing your request. Please try again later.",
  },
};

export function getFallbackResponse(
  action: string,
  errorType: ErrorType,
): string {
  const actionFallbacks = fallbackMessages[action] || fallbackMessages.default;
  return (
    actionFallbacks[errorType] ||
    fallbackMessages.default[errorType] ||
    "An error occurred. Please try again later."
  );
}
