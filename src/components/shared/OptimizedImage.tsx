import React, { useState, useEffect } from 'react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  webpSrc?: string;
  avifSrc?: string;
  containerClassName?: string;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  priority = false,
  webpSrc,
  avifSrc,
  containerClassName = '',
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // If priority is true, we want to load immediately (eager)
  // otherwise default to lazy
  const loadingStrategy = priority ? 'eager' : 'lazy';
  const fetchPriority = priority ? 'high' : 'auto';

  useEffect(() => {
    const compositeSource = avifSrc || webpSrc || src;
    if (!compositeSource) return;

    // Reset state when sources change
    setIsLoaded(false);
    setHasError(false);

    let cancelled = false;
    const img = new Image();

    const onLoad = () => {
      if (!cancelled) setIsLoaded(true);
    };
    const onError = () => {
      if (!cancelled) {
        setHasError(true);
        setIsLoaded(true);
      }
    };

    img.addEventListener('load', onLoad);
    img.addEventListener('error', onError);
    img.src = compositeSource;

    return () => {
      cancelled = true;
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onError);
      img.src = '';
    };
  }, [src, webpSrc, avifSrc]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true); // Remove blur/placeholder on error to show fallback or nothing
  };

  return (
    <div className={`relative overflow-hidden ${containerClassName}`}>
      {/* 
        Blur Placeholder 
        This is a simple CSS blur. For better results, pass a tiny base64 encoded strings as a prop.
      */}
      {!isLoaded && !hasError && (
        <div className={`absolute inset-0 bg-gray-200 animate-pulse ${className}`} />
      )}

      <picture>
        {avifSrc && <source srcSet={avifSrc} type="image/avif" />}
        {webpSrc && <source srcSet={webpSrc} type="image/webp" />}
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          loading={loadingStrategy}
          // @ts-ignore - fetchPriority is a valid attribute but React types might not support it yet
          fetchPriority={fetchPriority}
          className={`transition-all duration-500 ease-in-out ${
            isLoaded ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-xl scale-110'
          } ${className}`}
          {...props}
        />
      </picture>
    </div>
  );
};

export default OptimizedImage;
