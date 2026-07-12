import { Navigate, useLocation } from "react-router-dom";
import { isLoggedIn } from "../lib/auth";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  if (!isLoggedIn()) {
    // Remember where the user wanted to go; login will send them back after auth
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <>{children}</>;
}
