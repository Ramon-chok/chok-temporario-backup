'use client'
import { useState } from 'react'

interface Column<T> {
  header: string
  accessor: keyof T
  format?: (value: unknown, row?: T) => string | React.ReactNode
}

interface DataTableProps<T> {
  title?: string
  columns: Column<T>[]
  data: T[]
  isLoading?: boolean
  pageSize?: number
  totalRow?: T | null
  showPercentBars?: boolean
}

export function DataTable<T extends Record<string, unknown>>({
  title,
  columns,
  data,
  isLoading,
  pageSize = 20,
  totalRow = null,
  showPercentBars = true,
}: DataTableProps<T> & { pageSize?: number }) {

  const [page, setPage] = useState(1)
  const totalPages = Math.ceil(data.length / pageSize)
  const paginatedData = data.slice((page - 1) * pageSize, page * pageSize)

  const isPercentColumn = (column: Column<T>) =>
    (String(column.header).includes('%') || String(column.accessor).toLowerCase().includes('percent')) &&
    String(column.header).toLowerCase() !== '% margem'

  if (isLoading) {
    return (
      <div className="saas-section-card">
        <div className="saas-table-shell p-4 md:p-6">
          {title && <h3 className="saas-section-title mb-4">{title}</h3>}
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-11 animate-pulse rounded-xl bg-[var(--panel-muted)]/80" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="saas-section-card">
      <div className="saas-table-shell overflow-hidden">
        {title && (
          <div className="border-b border-[var(--table-border)] px-4 py-4 md:px-6 md:py-5">
            <h3 className="saas-section-title">{title}</h3>
          </div>
        )}

        {/* Desktop Table */}
        <div className="saas-table-scroll hidden md:block">
        <table className="saas-table w-full min-w-max text-sm">
          <thead>
            <tr>
              {columns.map((col, columnIndex) => (
                <th
                  key={String(col.accessor)}
                  className={`saas-table-head ${columnIndex === 0 ? 'saas-table-sticky-col' : ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, idx) => (
              <tr
                key={idx}
                className="saas-table-row"
              >
                {columns.map((col, columnIndex) => {
                  const value = row[col.accessor]
                  // Barra de progresso/badge para coluna de porcentagem, exceto % Margem
                  if (showPercentBars && isPercentColumn(col)) {
                    const percent = typeof value === 'number' ? value : parseFloat(String(value))
                    let toneClass = 'saas-percent-positive'
                    if (percent < 100) toneClass = 'saas-percent-warning'
                    if (percent < 80) toneClass = 'saas-percent-negative'
                    const sign = Number.isFinite(percent) && percent >= 100 ? '↑' : percent < 80 ? '↓' : '→'

                    return (
                      <td
                        key={String(col.accessor)}
                        className={`saas-table-cell whitespace-nowrap ${columnIndex === 0 ? 'saas-table-sticky-col' : ''}`}
                      >
                        <div className="flex min-w-[170px] items-center gap-2">
                          <div className="saas-progress-track">
                            <div className="saas-progress-fill" style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }} />
                          </div>
                          <span className={`saas-percent-chip ${toneClass}`}>{`${sign} ${percent.toFixed(1)}%`}</span>
                        </div>
                      </td>
                    )
                  }
                  // % Margem: apenas percentual, sem barra nem cor
                  if (String(col.header).toLowerCase() === '% margem') {
                    const percent = typeof value === 'number' ? value : parseFloat(String(value))
                    return (
                      <td
                        key={String(col.accessor)}
                        className={`saas-table-cell whitespace-nowrap ${columnIndex === 0 ? 'saas-table-sticky-col' : ''}`}
                      >
                        {percent.toFixed(1)}%
                      </td>
                    )
                  }
                  const formatted = col.format ? col.format(value, row) : String(value)
                  return (
                    <td
                      key={String(col.accessor)}
                      className={`saas-table-cell whitespace-nowrap ${columnIndex === 0 ? 'saas-table-sticky-col saas-table-cell-primary' : 'saas-table-cell-secondary'}`}
                    >
                      {formatted}
                    </td>
                  )
                })}
              </tr>
            ))}
            {totalRow && (
              <tr className="saas-table-total-row">
                {columns.map((col, columnIndex) => {
                  const value = totalRow[col.accessor]
                  if (columnIndex === 0) {
                    return (
                      <td
                        key={String(col.accessor)}
                        className="saas-table-cell saas-table-sticky-col whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.12em]"
                      >
                        TOTAL
                      </td>
                    )
                  }
                  if (columnIndex === 1) {
                    return (
                      <td key={String(col.accessor)} className="saas-table-cell whitespace-nowrap font-semibold">
                        {col.format ? col.format(value, totalRow) : String(value)}
                      </td>
                    )
                  }

                  if (isPercentColumn(col)) {
                    const percent = typeof value === 'number' ? value : parseFloat(String(value))
                    return (
                      <td key={String(col.accessor)} className="saas-table-cell whitespace-nowrap">
                        {Number.isFinite(percent) ? `${percent >= 0 ? '↑' : '↓'} ${percent.toFixed(1)}%` : '-'}
                      </td>
                    )
                  }

                  const formatted = col.format ? col.format(value, totalRow) : String(value)
                  return (
                    <td key={String(col.accessor)} className="saas-table-cell whitespace-nowrap">
                      {formatted}
                    </td>
                  )
                })}
              </tr>
            )}
          </tbody>
        </table>
        </div>

        {/* Mobile Card List */}
        <div className="md:hidden">
        {/* Mobile Table Header */}
        <div className="saas-table-scroll">
          <table className="saas-table w-full min-w-max">
            <thead>
              <tr>
                {columns.map((col, columnIndex) => (
                  <th
                    key={String(col.accessor)}
                    className={`saas-table-head ${columnIndex === 0 ? 'saas-table-sticky-col' : ''}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, idx) => (
                <tr
                  key={idx}
                  className="saas-table-row"
                >
                  {columns.map((col, columnIndex) => {
                    const value = row[col.accessor]
                    const formatted = col.format ? col.format(value, row) : String(value)
                    return (
                      <td
                        key={String(col.accessor)}
                        className={`saas-table-cell whitespace-nowrap ${columnIndex === 0 ? 'saas-table-sticky-col saas-table-cell-primary' : 'saas-table-cell-secondary'}`}
                      >
                        {formatted}
                      </td>
                    )
                  })}
                </tr>
              ))}
              {totalRow && (
                <tr className="saas-table-total-row">
                  {columns.map((col, columnIndex) => {
                    const value = totalRow[col.accessor]

                    if (columnIndex === 0) {
                      return (
                        <td
                          key={String(col.accessor)}
                          className="saas-table-cell saas-table-sticky-col whitespace-nowrap text-[11px] uppercase tracking-[0.12em]"
                        >
                          TOTAL
                        </td>
                      )
                    }

                    if (columnIndex === 1) {
                      return (
                        <td
                          key={String(col.accessor)}
                          className="saas-table-cell whitespace-nowrap font-semibold"
                        >
                          {col.format ? col.format(value, totalRow) : String(value)}
                        </td>
                      )
                    }

                    const formatted = col.format ? col.format(value, totalRow) : String(value)
                    return (
                      <td
                        key={String(col.accessor)}
                        className="saas-table-cell whitespace-nowrap"
                      >
                        {formatted}
                      </td>
                    )
                  })}
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 border-t border-[var(--table-border)] px-4 py-4">
          <button
            className="rounded-lg border border-[var(--table-border)] bg-[var(--table-head-bg)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--table-row-hover)] disabled:opacity-50"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Anterior
          </button>
          <span className="text-sm text-[var(--text-muted)]">Página {page} de {totalPages}</span>
          <button
            className="rounded-lg border border-[var(--table-border)] bg-[var(--table-head-bg)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--table-row-hover)] disabled:opacity-50"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
          >
            Próxima
          </button>
          </div>
        )}
      </div>
    </div>
  )
}
