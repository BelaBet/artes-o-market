import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_my_reviews",
  title: "List reviews for my shop",
  description: "List reviews left for the signed-in artisan, most recent first.",
  inputSchema: {
    limit: z.number().int().optional().describe("Max reviews to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const cap = Math.min(Math.max(limit ?? 20, 1), 100);
    const client = supabaseForUser(ctx);

    // A partir da migration de avaliações verificadas, reviews aponta
    // para artisans.id (a loja), não mais para o user_id direto.
    const { data: loja, error: erroLoja } = await client
      .from("artisans")
      .select("id")
      .eq("user_id", ctx.getUserId())
      .maybeSingle();
    if (erroLoja) return { content: [{ type: "text", text: erroLoja.message }], isError: true };
    if (!loja) {
      return {
        content: [{ type: "text", text: "Este usuário ainda não tem uma loja criada." }],
        structuredContent: { reviews: [] },
      };
    }

    const { data, error } = await client
      .from("reviews")
      .select("id, rating, comment, artisan_reply, replied_at, created_at, order_item_id")
      .eq("artisan_id", loja.id)
      .order("created_at", { ascending: false })
      .limit(cap);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { reviews: data ?? [] },
    };
  },
});
