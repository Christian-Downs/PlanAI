import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import AzureADProvider from "next-auth/providers/azure-ad";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "./prisma";
import { CalendarType, SyncStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        action: { label: "Action", type: "hidden" } // "login" or "register"
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }

        const { email, password, action } = credentials;

        if (action === "register") {
          // Check if user already exists
          const existingUser = await prisma.user.findUnique({
            where: { email }
          });

          if (existingUser) {
            throw new Error("User already exists with this email");
          }

          // Create new user
          const hashedPassword = await bcrypt.hash(password, 12);
          const user = await prisma.user.create({
            data: {
              email,
              password: hashedPassword,
              name: email.split("@")[0], // Use email prefix as default name
            }
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        } else {
          // Login
          const user = await prisma.user.findUnique({
            where: { email }
          });

          if (!user || !user.password) {
            throw new Error("No user found with this email");
          }

          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            throw new Error("Invalid password");
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
    // Microsoft Outlook provider
    ...(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET
      ? [
          AzureADProvider({
            clientId: process.env.MICROSOFT_CLIENT_ID!,
            clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
            tenantId: process.env.MICROSOFT_TENANT_ID || "common",
            authorization: {
              params: {
                scope: "openid email profile https://graph.microsoft.com/calendars.read",
              },
            },
          }),
        ]
      : []),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Auto-create calendar sources when user signs in with OAuth providers
      if (account?.access_token && user?.id) {
        try {
          let calendarType: CalendarType | null = null;
          let sourceName = "";
          let sourceColor = "";

          // Determine calendar type based on provider
          if (account.provider === "google") {
            calendarType = CalendarType.GOOGLE;
            sourceName = "Google Calendar";
            sourceColor = "#4285F4";
          } else if (account.provider === "azure-ad") {
            calendarType = CalendarType.OUTLOOK;
            sourceName = "Outlook Calendar";
            sourceColor = "#0078D4";
          }

          if (calendarType) {
            // Get user email for account identification
            const accountEmail = profile?.email || user.email;
            const accountId = account.providerAccountId;

            // Check if calendar source already exists for this specific account
            const existingSource = await prisma.calendarSource.findFirst({
              where: {
                userId: user.id,
                type: calendarType,
                OR: [
                  { accountEmail: accountEmail },
                  { accountId: accountId }
                ]
              },
            });

            if (!existingSource) {
              console.log(`Creating new ${sourceName} source for user:`, user.id, `(${accountEmail})`);
              // Create calendar source
              const calendarSource = await prisma.calendarSource.create({
                data: {
                  userId: user.id,
                  name: accountEmail ? `${sourceName} (${accountEmail})` : sourceName,
                  type: calendarType,
                  color: sourceColor,
                  enabled: true,
                  lastSyncStatus: SyncStatus.NEVER,
                  syncIntervalMin: 30,
                  apiToken: account.access_token,
                  accountEmail: accountEmail,
                  accountId: accountId,
                },
              });

              // Trigger initial sync in background for Google only (Outlook sync not implemented yet)
              // Temporarily disabled to avoid webpack build issues
              /*
              if (account.access_token && calendarType === CalendarType.GOOGLE) {
                // Use setTimeout to defer the import until after NextAuth initialization
                setTimeout(() => {
                  import("./calendar-sync")
                    .then(({ syncGoogleCalendar, setupGoogleWebhook }) => {
                      console.log(`Starting background sync for new ${sourceName} source`);
                      syncGoogleCalendar(calendarSource.id, account.access_token!)
                        .then((result) => console.log("Initial sync completed:", result))
                        .catch((error) => console.error("Initial sync failed:", error));

                      setupGoogleWebhook(calendarSource.id, account.access_token!)
                        .then((result) => console.log("Webhook setup result:", result))
                        .catch((error) => console.error("Webhook setup failed:", error));
                    })
                    .catch((error) => console.error("Failed to import calendar-sync:", error));
                }, 100);
              }
              */
            } else if (account.access_token) {
              console.log(`Updating existing ${sourceName} source for user:`, user.id, `(${accountEmail})`);
              // Update existing source with new access token
              await prisma.calendarSource.update({
                where: { id: existingSource.id },
                data: {
                  apiToken: account.access_token,
                  enabled: true,
                  name: accountEmail ? `${sourceName} (${accountEmail})` : sourceName,
                  accountEmail: accountEmail,
                  accountId: accountId,
                },
              });

              // Trigger sync update for Google only - temporarily disabled
              /*
              if (calendarType === CalendarType.GOOGLE) {
                // Use setTimeout to defer the import until after NextAuth initialization
                setTimeout(() => {
                  import("./calendar-sync")
                    .then(({ syncGoogleCalendar }) => {
                      console.log(`Starting background sync for existing ${sourceName} source`);
                      syncGoogleCalendar(existingSource.id, account.access_token!)
                        .then((result) => console.log("Sync update completed:", result))
                        .catch((error) => console.error("Sync update failed:", error));
                    })
                    .catch((error) => console.error("Failed to import calendar-sync:", error));
                }, 100);
              }
              */
            }
          }
        } catch (error) {
          console.error("Error creating/updating calendar source:", error);
          // Don't block login if calendar setup fails
        }
      }
      return true;
    },
    async jwt({ token, account, user }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.provider = account.provider;
      }
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.userId;
        (session.user as any).accessToken = token.accessToken;
      }
      return session;
    },
  },
  events: {
    async signOut(message) {
      console.log("User signed out, clearing calendar connections");
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
};
