'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ 
  size = 'md', 
  message = 'Loading...', 
  fullScreen = false 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const container = fullScreen 
    ? 'min-h-screen flex items-center justify-center'
    : 'flex items-center justify-center p-8';

  return (
    <div className={container}>
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center space-y-4 p-6">
          <Loader2 className={`animate-spin text-primary ${sizeClasses[size]}`} />
          {message && (
            <p className="text-sm text-muted-foreground text-center">
              {message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default LoadingSpinner;
