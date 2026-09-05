import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error(
    "ANTHROPIC_API_KEY must be set. Add it to the environment before starting the server.",
  );
}

// Standard first-party Anthropic client. (Previously routed through Replit's
// AI Integrations proxy via AI_INTEGRATIONS_ANTHROPIC_API_KEY / _BASE_URL.)
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
