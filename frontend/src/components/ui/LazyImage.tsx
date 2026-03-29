import { useRef, useState, useEffect } from 'react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Placeholder shown while image loads */
  placeholder?: string;
  /** Root margin for intersection observer */
  rootMargin?: string;
}

/**
 * Image component with native lazy loading + IntersectionObserver fallback.
 * Only loads image when it enters the viewport.
 */
export function LazyImage({
  src,
  alt,
  placeholder,
  rootMargin = '200px',
  className,
  ...props
}: LazyImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = imgRef.current;
    if (!node) return;

    // Native lazy loading support
    if ('loading' in HTMLImageElement.prototype) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <img
      ref={imgRef}
      src={inView ? src : placeholder || undefined}
      alt={alt}
      loading="lazy"
      className={`${className || ''} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
      onLoad={() => setLoaded(true)}
      {...props}
    />
  );
}
