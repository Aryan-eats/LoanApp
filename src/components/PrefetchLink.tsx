import { Link, type LinkProps } from 'react-router-dom';
import { prefetchRoute } from '../utils/routePrefetch';

/**
 * Drop-in replacement for React Router's `<Link>` that prefetches the
 * target route's JS chunk on mouse-enter / focus so transitions feel instant.
 */
export default function PrefetchLink({ to, children, onMouseEnter, onFocus, ...rest }: LinkProps) {
  const path = typeof to === 'string' ? to : to.pathname ?? '';

  const mergedOnMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    prefetchRoute(path);
    onMouseEnter?.(e);
  };

  const mergedOnFocus = (e: React.FocusEvent<HTMLAnchorElement>) => {
    prefetchRoute(path);
    onFocus?.(e);
  };

  return (
    <Link
      to={to}
      onMouseEnter={mergedOnMouseEnter}
      onFocus={mergedOnFocus}
      {...rest}
    >
      {children}
    </Link>
  );
}
