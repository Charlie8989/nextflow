import { clerkMiddleware } from "@clerk/nextjs/server";

const publicRoutes = ["/sign-in", "/sso-callback"];

export default clerkMiddleware();

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};