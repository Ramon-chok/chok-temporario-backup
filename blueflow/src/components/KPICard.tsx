'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface KPICardProps {
  title: string
  value: string | number
  change?: number
  icon: ReactNode
  color: 'purple' | 'purple-light' | 'blue' | 'pink'
  isLoading?: boolean
  meta?: string | number
  realizado?: string | number
  percentage?: number
}

const colorMap = {
  purple: {
    bg: 'bg-gradient-to-br from-[#b480ff]/15 to-[#b480ff]/5',
    border: 'border-[#b480ff]/30',
    icon: 'text-[#b480ff]',
    percentage: 'text-[#b480ff]',
    progressFrom: 'from-[#b480ff]',
    progressTo: 'to-[#D19BDE]',
  },
  'purple-light': {
    bg: 'bg-gradient-to-br from-[#D19BDE]/15 to-[#D19BDE]/5',
    border: 'border-[#D19BDE]/30',
    icon: 'text-[#D19BDE]',
    percentage: 'text-[#D19BDE]',
    progressFrom: 'from-[#D19BDE]',
    progressTo: 'to-[#b480ff]',
  },
  blue: {
    bg: 'bg-gradient-to-br from-blue-500/15 to-blue-500/5',
    border: 'border-blue-500/30',
    icon: 'text-blue-500',
    percentage: 'text-blue-500',
    progressFrom: 'from-blue-500',
    progressTo: 'to-blue-400',
  },
  pink: {
    bg: 'bg-gradient-to-br from-pink-500/15 to-pink-500/5',
    border: 'border-pink-500/30',
    icon: 'text-pink-500',
    percentage: 'text-pink-500',
    progressFrom: 'from-pink-500',
    progressTo: 'to-pink-400',
  },
}

export function KPICard({
  title,
  value,
  change,
  icon,
  color,
  isLoading,
  meta,
  realizado,
  percentage,
}: KPICardProps) {
  const scheme = colorMap[color]
  const isPositive = change !== undefined && change >= 0
  const hasMetrics = meta !== undefined && realizado !== undefined && percentage !== undefined

  if (hasMetrics) {
    // Compact layout for Faturamento and Cobertura with meta
    return (
      <div className={`rounded-xl border ${scheme.bg} ${scheme.border} p-4 md:p-5 backdrop-blur-sm hover:shadow-lg transition-shadow relative`}>
        {/* Title and Icon */}
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs md:text-sm font-medium text-gray-400 uppercase tracking-wide">{title}</p>
          <motion.div 
            className={`${scheme.icon} flex-shrink-0 text-xl md:text-2xl opacity-80`}
            whileHover={{ scale: 1.1 }}
          >
            {icon}
          </motion.div>
        </div>

        {/* Realizado Value */}
        <motion.p 
          className="text-2xl md:text-3xl font-bold text-[var(--foreground)] mb-3"
          key={String(realizado)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {isLoading ? (
            <span className="h-8 w-32 animate-pulse rounded bg-[var(--panel-muted)]" />
          ) : (
            realizado
          )}
        </motion.p>

        {/* Separator */}
        <div className="h-px bg-gray-300 mb-3" />

        {/* Meta and percentage inline */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-gray-400">
            <span>Meta: </span>
            <span className="font-semibold text-[var(--foreground)]">{meta}</span>
          </p>
          <p className={`text-sm font-bold ${scheme.percentage}`}>{percentage.toFixed(1)}%</p>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className={`h-full bg-gradient-to-r ${scheme.progressFrom} ${scheme.progressTo}`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(percentage || 0, 100)}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    )
  }

  // Original layout for other cards
  return (
    <div className={`rounded-xl border ${scheme.bg} ${scheme.border} p-4 md:p-6 backdrop-blur-sm hover:shadow-lg transition-shadow`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-xs md:text-sm font-medium text-gray-400 uppercase tracking-wide">{title}</p>
        </div>
        <motion.div 
          className={`${scheme.icon} flex-shrink-0 text-2xl md:text-3xl opacity-80`}
          whileHover={{ scale: 1.1 }}
        >
          {icon}
        </motion.div>
      </div>

      <motion.p 
        className="text-3xl md:text-4xl font-bold text-[var(--foreground)] mb-3"
        key={String(value)}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {isLoading ? (
          <span className="h-10 w-32 animate-pulse rounded bg-[var(--panel-muted)]" />
        ) : (
          value
        )}
      </motion.p>

      {change !== undefined && (
        <div className="flex items-center gap-1">
          {isPositive ? (
            <TrendingUp size={16} className="text-green-500" />
          ) : (
            <TrendingDown size={16} className="text-red-500" />
          )}
          <p
            className={`text-xs md:text-sm font-semibold ${
              isPositive ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {isPositive ? '+' : ''}{change}% vs mês anterior
          </p>
        </div>
      )}
    </div>
  )
}
