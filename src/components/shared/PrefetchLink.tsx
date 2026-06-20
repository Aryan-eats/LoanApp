import { Link, type LinkProps } from 'react-router-dom';

interface PrefetchLinkProps extends LinkProps {
  prefetchRoute?: () => Promise<unknown>;
}

const PrefetchLink = ({ prefetchRoute: _prefetchRoute, ...props }: PrefetchLinkProps) => (
  <Link {...props} />
);

export default PrefetchLink;
