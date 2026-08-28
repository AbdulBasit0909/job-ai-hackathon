import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher(['/api/extension(.*)'])

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    // You can add auth protection here if needed, but for now we leave it empty
  }
});

export const config = {
  matcher: [
    '/((?!.*\\..*|_next).*)',
    '/',
    '/(api|trpc)(.*)',
  ],
};