import { supabaseAdmin } from "@/integrations/supabase/client.server";

function hash(input: string): string {
  // Lightweight non-crypto hash — avoids storing raw device IDs in error logs.
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return `d${(h >>> 0).toString(36)}`;
}

export async function logServerError(params: {
  functionName: string;
  error: unknown;
  errorCode?: string;
  userId?: string | null;
  deviceId?: string | null;
  context?: Record<string, unknown>;
}): Promise<void> {
  try {
    const message =
      params.error instanceof Error
        ? params.error.message
        : typeof params.error === "string"
          ? params.error
          : JSON.stringify(params.error);

    await supabaseAdmin.from("server_error_logs").insert({
      function_name: params.functionName,
      error_message: message.slice(0, 1000),
      error_code: params.errorCode ?? null,
      user_id: params.userId ?? null,
      device_id_hash: params.deviceId ? hash(params.deviceId) : null,
      context: params.context ?? null,
    });
  } catch (e) {
    // Never throw from the logger itself.
    console.error("[error-logger] failed:", e);
  }
}
