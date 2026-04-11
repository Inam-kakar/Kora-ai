import { z } from "zod";

export const AgentPipelineResponseSchema = z.object({
  entryId: z.string(),
  patternsFound: z.number().int().nonnegative(),
  alertTriggered: z.boolean(),
});

export type AgentPipelineResponse = z.infer<typeof AgentPipelineResponseSchema>;
