import { Card } from '@/components/ui/card'
import { ArrowUp, ArrowDown, LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'

interface MetricCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  variant?: 'default' | 'primary' | 'secondary' | 'accent'
  size?: 'sm' | 'md' | 'lg'
  children?: ReactNode
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  trend,
  variant = 'default',
  size = 'md',
}: MetricCardProps) {
  const bgTone = {
    default: 'bg-slate-100 dark:bg-slate-800',
    primary: 'bg-primary/10 dark:bg-primary/20',
    secondary: 'bg-secondary/10 dark:bg-secondary/20',
    accent: 'bg-accent/10 dark:bg-accent/20',
  }

  const sizeClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }

  const iconBg = {
    default: 'bg-slate-200 dark:bg-slate-700',
    primary: 'bg-primary/20 dark:bg-primary/30',
    secondary: 'bg-secondary/20 dark:bg-secondary/30',
    accent: 'bg-accent/20 dark:bg-accent/30',
  }

  const iconColor = {
    default: 'text-slate-600 dark:text-slate-300',
    primary: 'text-primary',
    secondary: 'text-secondary',
    accent: 'text-accent',
  }

  const trendBgColor = trend?.isPositive
    ? 'bg-green-100 dark:bg-green-900/30'
    : 'bg-red-100 dark:bg-red-900/30'
  const trendTextColor = trend?.isPositive
    ? 'text-green-700 dark:text-green-400'
    : 'text-red-700 dark:text-red-400'

  return (
    <Card className={`border-0 shadow-sm hover:shadow-md transition-all ${bgTone[variant]} ${sizeClasses[size]}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wide mb-2">
            {label}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground tabular-nums whitespace-nowrap">
              {value}
            </h3>
            {trend && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold ${trendBgColor} ${trendTextColor}`}>
                {trend.isPositive ? (
                  <ArrowUp className="w-3 h-3" />
                ) : (
                  <ArrowDown className="w-3 h-3" />
                )}
                <span>{Math.abs(trend.value)}%</span>
              </div>
            )}
          </div>
        </div>
        {Icon && (
          <div className={`p-3 rounded-lg shrink-0 ${iconBg[variant]} ${iconColor[variant]}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </Card>
  )
}
