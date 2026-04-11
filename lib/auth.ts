import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { MongoClient } from "mongodb";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Email from "next-auth/providers/email";
import Google from "next-auth/providers/google";
import { authProviderFlags } from "@/lib/auth-provider-flags";

declare global {
  var mongoAuthClientPromise: Promise<MongoClient> | undefined;
}

function getMongoClientPromise(): Promise<MongoClient> | undefined {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    return undefined;
  }

  if (!global.mongoAuthClientPromise) {
    const client = new MongoClient(mongoUri);
    global.mongoAuthClientPromise = client.connect();
  }

  return global.mongoAuthClientPromise;
}

const providers: NonNullable<NextAuthConfig["providers"]> = [];

if (authProviderFlags.google) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    })
  );
}

if (authProviderFlags.email) {
  providers.push(
    Email({
      ...(authProviderFlags.emailTransportConfigured
        ? {
            server: process.env.EMAIL_SERVER ?? "",
            from: process.env.EMAIL_FROM ?? "",
          }
        : {
            server: { jsonTransport: true },
            from: "noreply@localhost",
            async sendVerificationRequest({ identifier, url }) {
              console.log(
                `[auth][dev-email] Magic link for ${identifier}: ${url}`
              );
            },
          }),
    })
  );
}

const mongoClientPromise = getMongoClientPromise();

const config: NextAuthConfig = {
  adapter: mongoClientPromise
    ? MongoDBAdapter(mongoClientPromise, {
        databaseName: process.env.MONGODB_DB_NAME ?? "kora",
      })
    : undefined,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers,
  callbacks: {
    authorized({ auth, request }) {
      const pathname = request.nextUrl.pathname;
      const protectedRoutes = [
        "/dashboard",
        "/checkin",
        "/memories",
        "/patterns",
        "/review",
        "/settings",
      ];

      if (!protectedRoutes.some((route) => pathname.startsWith(route))) {
        return true;
      }

      return Boolean(auth?.user);
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);
