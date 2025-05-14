export async function checkConnectionStatus(
  endpoint: string,
  timeout: number = 5000,
): Promise<boolean> {
  try {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeout);

    try {
      const response = await fetch(endpoint, {
        method: "HEAD",
        signal: abortController.signal,
        cache: "no-cache",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      // Check if response status indicates success (e.g., 200-299)
      return response.ok;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    // Using console.error as a fallback, replace with your preferred logging if available
    console.error("Connection check failed:", {
      error: errorMessage,
      endpoint,
    });
    return false;
  }
}
