import { api, setToken, getToken } from "./api";

export type User = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export async function login(email: string, password: string) {
  const data = await api<{ token: string; user: User }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
  return data.user;
}

export function logout() {
  setToken(null);
  localStorage.removeItem("user");
}

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem("user");
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return Boolean(getToken());
}

export function hasRole(...roles: string[]) {
  const u = getStoredUser();
  return u ? roles.includes(u.role) : false;
}
