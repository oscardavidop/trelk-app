import { Navigate } from 'react-router-dom';
import { useUserStore } from '../stores';

/**
 * TrelkEntry — Punto de entrada desde Telegram.
 * Redirige al dashboard del usuario autenticado.
 * Si no hay usuario en el store, redirige a /auth.
 */
export default function TrelkEntry() {
  const user = useUserStore((s) => s.user);

  if (user?.id) {
    return <Navigate to={`/users/ui/${user.id}`} replace />;
  }

  return <Navigate to="/auth" replace />;
}
