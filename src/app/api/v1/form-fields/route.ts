import { json, withApiKey } from "@/lib/api-http";
import { getFormFields } from "@/lib/booking";
import { standardFields } from "@/lib/booking-form";

/** GET /api/v1/form-fields: what a booking needs besides service, date and time. */
export const GET = withApiKey(async ({ shop }) => {
  const questions = await getFormFields(shop);
  return json({
    standard: { name: "required", ...standardFields(shop) },
    questions: questions.map(({ key, label, type, required, options, helpText }) => ({
      key,
      label,
      type,
      required,
      options,
      helpText,
    })),
  });
});
