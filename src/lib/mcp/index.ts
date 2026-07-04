import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfile from "./tools/get-my-profile";
import updateMyProfile from "./tools/update-my-profile";
import listMyReviews from "./tools/list-my-reviews";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "feito-a-mao-mcp",
  title: "Feito à Mão",
  version: "0.1.0",
  instructions:
    "Tools for the Feito à Mão artisan marketplace. Use get_my_profile / update_my_profile to read or edit the signed-in artisan's shop profile, and list_my_reviews to fetch customer reviews for their shop.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyProfile, updateMyProfile, listMyReviews],
});
