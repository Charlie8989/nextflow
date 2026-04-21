import { clerkMiddleware } from "@clerk/nextjs/server";

const publicRoutes = ["/sign-in", "/sso-callback"];

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  const isPublic = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  const { userId } = await auth();

  if (!userId && !isPublic) {
    return Response.redirect(new URL("/sign-in", req.url));
  }
});

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};