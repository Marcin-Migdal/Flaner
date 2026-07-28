import React from 'react';
import { cn } from '@flaner-v2/shared';
import { useUiTranslations } from '../hooks/useUiTranslations';

export type LoadingFallbackProps = React.HTMLAttributes<HTMLDivElement> & {
  text?: React.ReactNode | boolean;
}

export function LoadingFallback({ className, text, ...props }: LoadingFallbackProps) {
  const { t } = useUiTranslations();

  // Fall back to translated loading message when no text is explicitly provided
  const renderedText = text === undefined ? t('loading') : text;

  return (
    <div
      className={cn(
        "flex-1 min-h-[60vh] flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300",
        className
      )}
      {...props}
    >
      <div className="relative flex items-center justify-center size-12">
        {/* Glowing outer pulsing ring */}
        <div className="absolute inset-0 rounded-full border-2 border-brand/20 animate-ping duration-1000" />
        {/* Spinner ring */}
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-transparent border-t-brand border-r-brand" />
      </div>
      {renderedText !== false && (
        <p className="text-sm text-muted-foreground animate-pulse font-medium">
          {renderedText}
        </p>
      )}
    </div>
  );
}

export default LoadingFallback;
