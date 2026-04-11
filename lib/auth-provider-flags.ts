const googleConfigured =
  Boolean(process.env.GOOGLE_CLIENT_ID) &&
  Boolean(process.env.GOOGLE_CLIENT_SECRET);

const emailTransportConfigured =
  Boolean(process.env.EMAIL_SERVER) && Boolean(process.env.EMAIL_FROM);

const emailLocalDevFallback =
  process.env.NODE_ENV !== "production" && !emailTransportConfigured;

export const authProviderFlags = {
  google: googleConfigured,
  email: emailTransportConfigured || emailLocalDevFallback,
  emailTransportConfigured,
  emailLocalDevFallback,
} as const;
