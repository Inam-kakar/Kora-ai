import { LoginClient } from "@/app/(auth)/login/LoginClient";
import { authProviderFlags } from "@/lib/auth-provider-flags";

export default function LoginPage() {
  return (
    <LoginClient
      emailEnabled={authProviderFlags.email}
      emailDevMode={authProviderFlags.emailLocalDevFallback}
      googleEnabled={authProviderFlags.google}
    />
  );
}
