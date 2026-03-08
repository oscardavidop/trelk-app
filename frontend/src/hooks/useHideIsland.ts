import { useEffect } from 'react';
import { useIslandStore } from '../stores/islandStore';

export function useHideIsland() {
  const hide = useIslandStore((s) => s.hide);
  const show = useIslandStore((s) => s.show);

  useEffect(() => {
    hide();

    return () => {
      show();
    };
  }, [hide, show]);
}