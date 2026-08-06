import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

const alertVariants = cva('flex items-start gap-2 rounded-md border px-3 py-2 text-sm', {
  variants: {
    variant: {
      danger: 'border-danger/30 bg-danger/10 text-danger',
      success: 'border-success/30 bg-success/10 text-success',
    },
  },
  defaultVariants: { variant: 'danger' },
});

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {}

function Alert({ className, variant, children, ...props }: AlertProps) {
  const Icon = variant === 'success' ? CheckCircle2 : AlertCircle;
  return (
    <div role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export { Alert };
