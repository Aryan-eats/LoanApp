import React, { useRef } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

interface PrefetchLinkProps extends LinkProps {
  prefetchRoute: () => Promise<any>;
}

const PrefetchLink: React.FC<PrefetchLinkProps> = ({
  prefetchRoute,
  onMouseEnter,
  onFocus,
  onTouchStart,
  children,
  ...props
}) => {
  const prefetchedRef = useRef(false);

  const runPrefetch = () => {
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;
    prefetchRoute().catch(() => {});
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    runPrefetch();
    if (onMouseEnter) {
      onMouseEnter(e);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLAnchorElement>) => {
    runPrefetch();
    if (onFocus) {
      onFocus(e);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLAnchorElement>) => {
    runPrefetch();
    if (onTouchStart) {
      onTouchStart(e);
    }
  };

  return (
    <Link
      onMouseEnter={handleMouseEnter}
      onFocus={handleFocus}
      onTouchStart={handleTouchStart}
      {...props}
    >
      {children}
    </Link>
  );
};

export default PrefetchLink;
