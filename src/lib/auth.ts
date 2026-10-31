import { NextRequest } from 'next/server';

// 从cookie获取认证信息 (服务端使用)
export function getAuthInfoFromCookie(request: NextRequest): {
  password?: string;
  username?: string;
  signature?: string;
  timestamp?: number;
} | null {
  const authCookie = request.cookies.get('auth');

  if (!authCookie) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(authCookie.value);
    const authData = JSON.parse(decoded);
    return authData;
  } catch (error) {
    return null;
  }
}

// 从cookie获取认证信息 (客户端使用)
export function getAuthInfoFromBrowserCookie(): {
  password?: string;
  username?: string;
  signature?: string;
  timestamp?: number;
  role?: 'owner' | 'admin' | 'user';
} | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    // 解析 document.cookie
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const trimmed = cookie.trim();
      const firstEqualIndex = trimmed.indexOf('=');

      if (firstEqualIndex > 0) {
        const key = trimmed.substring(0, firstEqualIndex);
        const value = trimmed.substring(firstEqualIndex + 1);
        if (key && value) {
          acc[key] = value;
        }
      }

      return acc;
    }, {} as Record<string, string>);

    const authCookie = cookies['auth'];
    if (!authCookie) {
      return null;
    }

    // cookie 由 encodeURIComponent(JSON.stringify(...)) 写入，解码一次即可。
    // 只在 JSON 解析失败时，才尝试再解一次以兼容历史双重编码的 cookie，
    // 避免密码本身含 '%' 时被误判成双重编码而抛 URI malformed。
    let authData: {
      password?: string;
      username?: string;
      signature?: string;
      timestamp?: number;
      role?: 'owner' | 'admin' | 'user';
    };

    try {
      authData = JSON.parse(decodeURIComponent(authCookie));
    } catch {
      authData = JSON.parse(decodeURIComponent(decodeURIComponent(authCookie)));
    }

    return authData;
  } catch (error) {
    return null;
  }
}
