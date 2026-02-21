import React from 'react';

interface SkeletonProps {
  type?: 'text' | 'rectangular' | 'circular';
  width?: string | number;
  height?: string | number;
  className?: string;
}

const SkeletonLoader: React.FC<SkeletonProps> = ({ 
  type = 'text', 
  width, 
  height, 
  className = '' 
}) => {
  const baseClasses = "animate-pulse bg-gray-200";
  
  let typeClasses = "";
  switch (type) {
    case 'circular':
      typeClasses = "rounded-full";
      break;
    case 'rectangular':
      typeClasses = "rounded-md";
      break;
    case 'text':
    default:
      typeClasses = "rounded-sm";
      break;
  }

  const style: React.CSSProperties = {
    width: width || (type === 'text' ? '100%' : 'auto'),
    height: height || (type === 'text' ? '1rem' : 'auto')
  };

  return (
    <div className={`${baseClasses} ${typeClasses} ${className}`} style={style} />
  );
};

export const PageSkeleton = () => (
  <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <SkeletonLoader type="rectangular" height={300} className="mb-8 w-full rounded-2xl" />
    <div className="space-y-4">
      <SkeletonLoader type="text" height={40} className="w-3/4 mb-4" />
      <SkeletonLoader type="text" height={20} className="w-full" />
      <SkeletonLoader type="text" height={20} className="w-5/6" />
      <SkeletonLoader type="text" height={20} className="w-4/5" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
      <SkeletonLoader type="rectangular" height={200} className="w-full rounded-xl" />
      <SkeletonLoader type="rectangular" height={200} className="w-full rounded-xl" />
      <SkeletonLoader type="rectangular" height={200} className="w-full rounded-xl" />
    </div>
  </div>
);

export default SkeletonLoader;
