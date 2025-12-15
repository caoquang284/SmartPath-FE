'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating?: number;
  totalStars?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  showValue?: boolean;
  className?: string;
  readonly?: boolean;
}

export function StarRating({
  rating = 0,
  totalStars = 5,
  size = 'md',
  interactive = false,
  onRatingChange,
  showValue = true,
  className,
  readonly = false,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const [currentRating, setCurrentRating] = useState(rating);

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const handleStarClick = (starRating: number) => {
    if (readonly || !interactive) return;

    const newRating = starRating === currentRating ? 0 : starRating;
    setCurrentRating(newRating);
    onRatingChange?.(newRating);
  };

  const handleMouseEnter = (starRating: number) => {
    if (readonly || !interactive) return;
    setHoverRating(starRating);
  };

  const handleMouseLeave = () => {
    if (readonly || !interactive) return;
    setHoverRating(0);
  };

  const displayRating = hoverRating || currentRating;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex items-center">
        {Array.from({ length: totalStars }, (_, index) => {
          const starNumber = index + 1;
          const isFilled = starNumber <= displayRating;
          const isHalfFilled = false; // Could implement half stars if needed

          return (
            <div
              key={index}
              role="button"
              tabIndex={interactive && !readonly ? 0 : -1}
              aria-label={`Rate ${starNumber} star${starNumber !== 1 ? 's' : ''}`}
              className={cn(
                'inline-flex items-center justify-center transition-colors duration-200',
                'cursor-pointer',
                {
                  'cursor-not-allowed opacity-50': readonly || !interactive,
                  'hover:scale-110': interactive && !readonly,
                  'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500': interactive && !readonly,
                }
              )}
              onClick={() => handleStarClick(starNumber)}
              onMouseEnter={() => handleMouseEnter(starNumber)}
              onMouseLeave={handleMouseLeave}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && interactive && !readonly) {
                  e.preventDefault();
                  handleStarClick(starNumber);
                }
              }}
            >
              <Star
                className={cn(
                  sizeClasses[size],
                  'transition-colors duration-200',
                  {
                    'text-yellow-400 fill-yellow-400': isFilled && !readonly,
                    'text-yellow-500 fill-yellow-500': isFilled && readonly,
                    'text-gray-300': !isFilled,
                    'hover:text-yellow-400 hover:fill-yellow-400': interactive && !readonly && !isFilled,
                    'pointer-events-none': true, // Prevent SVG from interfering with div clicks
                  }
                )}
              />
            </div>
          );
        })}
      </div>

      {showValue && (
        <span className="text-sm text-muted-foreground ml-2">
          {currentRating > 0 ? `${currentRating.toFixed(1)}/5` : 'Chưa có đánh giá'}
        </span>
      )}
    </div>
  );
}