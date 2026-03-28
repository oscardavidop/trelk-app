import { useOutletContext } from 'react-router-dom';
import { useEffect } from 'react';

interface LayoutContext {
  setUseSafeProps: (val: boolean) => void;
}

export function useNoSafeProps() {
  const context = useOutletContext<LayoutContext>();

  useEffect(() => {
    // Si el contexto no existe (por si usas la página fuera del layout), 
    // evitamos que la app rompa.
    if (!context) return;

    context.setUseSafeProps(false);
    
    // Al salir de la página, restauramos los paddings automáticamente
    return () => context.setUseSafeProps(true);
  }, [context]);
}