import { json } from "@sveltejs/kit";
import { v7 as uuidv7 } from "uuid";
import { siteConfig } from "$lib/config/site";
import { ErrorType, getFallbackResponse } from "$lib/config/fallbacks";
import { n8nService } from "$lib/services/n8nService";
import type { RequestEvent } from "./$types";

/**
 * Authenticates the incoming request based on referer or auth token
 */
function authenticateRequest(request: Request): {
  isAuthenticated: boolean;
  errorResponse?: Response;
} {
  // Check the referer to ensure the request is coming from an allowed domain
  const referer = request.headers.get("referer") || "";
  const allowedDomains = siteConfig.security.allowedDomains;

  const isAllowedReferer = allowedDomains.some((domain) =>
    referer.includes(domain),
  );

  if (!isAllowedReferer && import.meta.env.PROD) {
    return {
      isAuthenticated: false,
      errorResponse: json(
        { message: "Unauthorized: Invalid referer" },
        { status: 403 },
      ),
    };
  }

  return { isAuthenticated: true };
}

/**
 * Calls the appropriate n8n webhook using the n8nService
 */
async function callN8nWebhook(
  action: string | undefined,
  payload: Record<string, unknown>,
  authToken: string,
): Promise<{ response: unknown; errorType?: ErrorType }> {
  console.log(`Calling n8n webhook for action: ${action || "analytics"}`);

  try {
    // Use the n8nService to call the appropriate webhook
    // Set the auth token in the payload for n8n to use
    const payloadWithAuth = {
      ...payload,
      authToken,
    };

    // Call the webhook using the n8nService
    const path = action || "analytics";
    const result = await n8nService.callDefaultWebhook(payloadWithAuth, path);

    if (!result.success || !result.data) {
      console.error("n8n webhook call failed:", result.error);
      return { response: "", errorType: ErrorType.DATA_FETCH };
    }

    return { response: result.data };
  } catch (error) {
    console.error("Failed to call n8n webhook:", error);
    return { response: "", errorType: ErrorType.DATA_FETCH };
  }
}

interface ChatRequestBody {
  duration: number;
  message: string;
  sessionId?: string;
}

function parseRequestBody(body: ChatRequestBody): {
  duration: number;
  message: string;
  sessionId?: string;
} {
  if (typeof body !== "object" || body === null) {
    throw new Error("Invalid request body");
  }
  return {
    duration: typeof body.duration === "number" ? body.duration : 12,
    message: typeof body.message === "string" ? body.message : "",
    sessionId: body.sessionId,
  };
}

function handleError(errorMessage: string, status: number = 500): Response {
  console.error("Error in chat API:", errorMessage);
  return json({ message: errorMessage }, { status });
}

export async function POST({ request }: RequestEvent) {
  const { isAuthenticated, errorResponse } = authenticateRequest(request);
  if (!isAuthenticated) return errorResponse;

  try {
    const body = await request.json();
    const { duration, message, sessionId } = parseRequestBody(body);

    if (!message || typeof duration !== "number") {
      return handleError("Missing required fields: message or duration", 400);
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return handleError("Missing or invalid Authorization header", 401);
    }

    const authToken = authHeader.substring(7);
    const n8nPayload = {
      duration,
      message,
      sessionId: sessionId || uuidv7(),
      user_id: "1160", // Default user ID
      user_name: "Analytics User", // Default username for analytics
      application: "analytics_chatbot",
    };

    const { response, errorType: n8nErrorType } = await callN8nWebhook(
      "analytics",
      n8nPayload,
      authToken,
    );

    return json({
      result: n8nErrorType
        ? getFallbackResponse("summarize", n8nErrorType)
        : response,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return handleError(errorMessage);
  }
}
