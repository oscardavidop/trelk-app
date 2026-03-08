import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Esto hace que la ventana vuelva a la posición x:0, y:0
    window.scrollTo(0, 0);
  }, [pathname]); // Se ejecuta cada vez que el pathname cambia

  return null;
}