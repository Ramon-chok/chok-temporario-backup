export interface BulkPdfSeller {
  codigo: string
  nome: string
}

export interface BulkPdfJob {
  status: 'running'
  currentIndex: number
  currentPage: 'dashboard' | 'top-clientes'
  sellers: BulkPdfSeller[]
  startedAt: number
}

export const BULK_PDF_JOB_KEY = 'blueflow_bulk_pdf_job'

export function getBulkPdfJob(): BulkPdfJob | null {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.sessionStorage.getItem(BULK_PDF_JOB_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as BulkPdfJob
    if (
      parsed &&
      parsed.status === 'running' &&
      Array.isArray(parsed.sellers) &&
      typeof parsed.currentIndex === 'number' &&
      (parsed.currentPage === 'dashboard' || parsed.currentPage === 'top-clientes')
    ) {
      return parsed
    }
  } catch {
    // Ignore malformed payload.
  }

  return null
}

export function saveBulkPdfJob(job: BulkPdfJob) {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(BULK_PDF_JOB_KEY, JSON.stringify(job))
}

export function clearBulkPdfJob() {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.removeItem(BULK_PDF_JOB_KEY)
}

export function getCurrentBulkPdfSeller(job: BulkPdfJob): BulkPdfSeller | null {
  if (job.currentIndex < 0 || job.currentIndex >= job.sellers.length) {
    return null
  }

  return job.sellers[job.currentIndex] ?? null
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

export function buildBulkPdfFileName(pageName: 'dashboard' | 'top-20-clientes', seller: BulkPdfSeller) {
  const now = new Date()
  const date = now.toLocaleDateString('pt-BR').replace(/\//g, '-')
  const time = now
    .toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .replace(/:/g, '-')

  const sellerSlug = slugify(`${seller.codigo}-${seller.nome}`) || String(seller.codigo)
  return `${pageName}-${sellerSlug}-${date}_${time}.pdf`
}
