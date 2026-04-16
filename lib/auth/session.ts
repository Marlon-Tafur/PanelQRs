import { getIronSession, IronSessionData } from "iron-session";
import { cookies } from "next/headers";

declare module "iron-session" {
  interface IronSessionData {
    user?: {
      id: string;
      email: string;
      name: string;
    };
  }
}

export const sessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: "panel-qrs-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 7 días
  },
};

export async function getSession() {
  return getIronSession<IronSessionData>(await cookies(), sessionOptions);
}
