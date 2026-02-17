import React from 'react';

interface SkeletonProps {
  className?: string;
  count?: number;
  width?: string | number;
  height?: string | number;
  circle?: boolean;
}

const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  count = 1,
  width,
  height,
  circle = false 
}) => {
  const skeletons = Array(count).fill(0);

  return (
    <>
      {skeletons.map((_, index) => (
        <span
          key={index}
          className={`inline-block animate-pulse bg-gray-200 ${circle ? 'rounded-full' : 'rounded-md'} ${className}`}
          style={{
            width: width || '100%',
            height: height || '1em',
          }}
        />
      ))}
    </>
  );
};

export default Skeleton;
