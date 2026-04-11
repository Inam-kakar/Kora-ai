import { createVertex } from "@ai-sdk/google-vertex";
import {
  createVertexGoogleAuthOptions,
  readGcloudConfig,
} from "@/lib/vertex-auth";

const vertexProject =
  process.env.GOOGLE_VERTEX_PROJECT ??
  process.env.GOOGLE_CLOUD_PROJECT ??
  process.env.GCLOUD_PROJECT ??
  readGcloudConfig("project");

const vertexLocation =
  process.env.GOOGLE_VERTEX_LOCATION ??
  process.env.GOOGLE_CLOUD_LOCATION ??
  readGcloudConfig("ai/region") ??
  readGcloudConfig("compute/region") ??
  "us-central1";

const vertexProvider = createVertex({
  project: vertexProject,
  location: vertexLocation,
  apiKey: process.env.GOOGLE_VERTEX_API_KEY,
  googleAuthOptions: createVertexGoogleAuthOptions(vertexProject),
});

export const geminiFlash = () => vertexProvider("gemini-2.5-flash");
export const geminiPro = () => vertexProvider("gemini-2.5-pro");
export const geminiEmbedding = () =>
  vertexProvider.textEmbeddingModel("gemini-embedding-001");
