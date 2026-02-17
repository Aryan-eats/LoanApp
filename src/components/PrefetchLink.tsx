import { Link, type LinkProps } from 'react-router-dom';
import { prefetchRoute } from '../utils/routePrefetch';

/**
 * Drop-in replacement for React Router's `<Link>` that prefetches the
 * target route's JS chunk on mouse-enter / focus so transitions feel instant.
 */
export default function PrefetchLink({ to, children, ...props }: LinkProps) {
  const path = typeof to === 'string' ? to : to.pathname ?? '';

  return (
    <Link
      to={to}
      onMouseEnter={() => prefetchRoute(path)}
      onFocus={() => prefetchRoute(path)}
      {...props}
    >
      {children}
    </Link>
  );
}
