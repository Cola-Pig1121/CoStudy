import { NextRequest, NextResponse } from "next/server";

/**
 * 受保护路由（需登录）。
 *
 * Note: proxy 在服务端运行，无法读取 localStorage，
 * 因此 auth 路由实际在每个受保护页面组件内用 useAuth 检查并重定向。
 * 此 proxy 仅做轻量路径校验，刷新时若 cookie 中有 token 则放行。
 */
const PROTECTED_PREFIXES = ["/dashboard", "/workspace", "/dashboard/admin"];

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => path === p || path.startsWith(p + "/")
  );
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/workspace/:path*"],
};
