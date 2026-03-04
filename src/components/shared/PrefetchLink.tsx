import React, { useRef } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { prefetchRoute as prefetchByPath } from '../../utils/routePrefetch';

interface PrefetchLinkProps extends LinkProps {
  prefetchRoute?: () => Promise<unknown>;
}

const PrefetchLink: React.FC<PrefetchLinkProps> = ({
  to,
  prefetchRoute,
  onMouseEnter,
  onFocus,
  onTouchStart,
  children,
  ...props
}) => {
  const prefetchedRef = useRef(false);
  const path = typeof to === 'string' ? to : to.pathname ?? '';

  const runPrefetch = () => {
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;

    const prefetchPromise = prefetchRoute ? prefetchRoute() : Promise.resolve(prefetchByPath(path));
    prefetchPromise.catch(() => {});
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
      to={to}
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
