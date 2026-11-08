import { createClient } from "@91/client";

// The official client uses the same public SDK as independently built clients.
// Serve /api, /admin/api and /p through the frontend origin in split deployments.
export const client = createClient();
