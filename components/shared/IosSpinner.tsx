'use client';

interface IosSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export const IosSpinner = ({ size = 'md', color = '#F4C542' }: IosSpinnerProps) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-9 h-9',
  };

  const bladeCount = 12;

  return (
    <div className={`relative inline-block ${sizeClasses[size]}`}>
      {Array.from({ length: bladeCount }).map((_, i) => {
        const rotation = i * (360 / bladeCount);
        const delay = (i * 1) / bladeCount;
        return (
          <div
            key={i}
            className="absolute top-0 left-[46%] w-[8%] h-[28%] rounded-full opacity-20 animate-ios-spinner"
            style={{
              transform: `rotate(${rotation}deg) translateY(0%)`,
              transformOrigin: '50% 170%',
              animationDelay: `${delay - 1}s`,
              backgroundColor: color,
            }}
          />
        );
      })}
    </div>
  );
};
