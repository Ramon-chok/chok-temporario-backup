'use client'

type Html2PdfFactory = () => {
  set: (options: Record<string, unknown>) => {
    from: (element: HTMLElement) => {
      save: () => Promise<void>
    }
  }
}

interface ExportPdfOptions {
  fileName?: string
  reportTitle?: string
}

function buildFileName(reportTitle: string) {
  const now = new Date()
  const date = now.toLocaleDateString('pt-BR').replace(/\//g, '-')
  const time = now
    .toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .replace(/:/g, '-')
  const slug = reportTitle
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()

  return `${slug || 'relatorio'}-${date}_${time}.pdf`
}

function resolveReportTitle(main: HTMLElement) {
  const h1 = main.querySelector('h1')?.textContent?.trim()
  if (h1) return h1

  const h2 = main.querySelector('h2')?.textContent?.trim()
  if (h2) return h2

  const title = document.title?.trim()
  if (title) return title

  return 'Relatorio'
}

function buildPrintRoot(main: HTMLElement, reportTitle: string) {
  const reportDate = new Date()
  const dateStr = reportDate.toLocaleDateString('pt-BR')
  const timeStr = reportDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const root = document.createElement('div')
  root.id = 'pdf-export-root'
  root.style.position = 'fixed'
  root.style.left = '-10000px'
  root.style.top = '0'
  root.style.width = '1200px'
  root.style.background = '#fff'
  root.style.zIndex = '-1'

  const wrapper = document.createElement('div')
  wrapper.className = 'pdf-wrapper'

  const header = document.createElement('header')
  header.className = 'pdf-header'
  header.innerHTML = `
    <h1>${reportTitle}</h1>
    <p>Exportado em ${dateStr} as ${timeStr}</p>
  `

  const content = main.cloneNode(true) as HTMLElement
  content.classList.add('pdf-content')

  // Remove elementos interativos e decorativos que não agregam no relatório.
  content.querySelectorAll('button, svg, [role="button"], .no-print').forEach((node) => node.remove())

  // Mantém apenas a versão desktop das tabelas para evitar duplicidade no PDF.
  content.querySelectorAll('.md\\:hidden').forEach((node) => node.remove())

  // Em cards de tabela, preserva só o primeiro bloco de scroll/tabela.
  content.querySelectorAll('.saas-table-shell').forEach((shell) => {
    const tableScrollBlocks = Array.from(shell.querySelectorAll(':scope > .saas-table-scroll'))
    if (tableScrollBlocks.length > 1) {
      tableScrollBlocks.slice(1).forEach((node) => node.remove())
    }
  })

  const style = document.createElement('style')
  style.innerHTML = `
    .pdf-wrapper,
    .pdf-wrapper * {
      box-sizing: border-box;
      font-family: Arial, Helvetica, sans-serif;
      color: #111 !important;
    }

    .pdf-wrapper {
      width: 100%;
      background: #fff;
      padding: 14mm;
    }

    .pdf-header {
      border: 1px solid #d0d0d0;
      padding: 10px 12px;
      margin-bottom: 12px;
    }

    .pdf-header h1 {
      margin: 0;
      font-size: 20px;
      line-height: 1.2;
    }

    .pdf-header p {
      margin: 6px 0 0;
      font-size: 11px;
      color: #555 !important;
    }

    .pdf-content {
      background: #fff !important;
    }

    .pdf-content table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      page-break-inside: auto;
    }

    .pdf-content th,
    .pdf-content td {
      border: 1px solid #d8d8d8 !important;
      padding: 6px !important;
      background: #fff !important;
      color: #111 !important;
    }

    .pdf-content th {
      background: #f2f2f2 !important;
      font-weight: 700;
    }

    .pdf-content tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }

    .pdf-content [class*="shadow"],
    .pdf-content [class*="backdrop"],
    .pdf-content [class*="gradient"] {
      box-shadow: none !important;
      background-image: none !important;
    }
  `

  wrapper.appendChild(header)
  wrapper.appendChild(content)
  wrapper.appendChild(style)
  root.appendChild(wrapper)
  document.body.appendChild(root)

  return { root, content: wrapper }
}

async function fallbackToPrint(content: HTMLElement, reportTitle: string, preferredFileName?: string) {
  const printDocTitle = (preferredFileName || reportTitle).replace(/\.pdf$/i, '')

  const printHtml = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${printDocTitle}</title>
        <style>
          @page { size: A4; margin: 8mm; }
          html, body { margin: 0; padding: 0; background: #fff; }
        </style>
      </head>
      <body>${content.innerHTML}</body>
    </html>
  `

  // No mobile, impressao via iframe pode capturar a pagina atual em vez do conteudo clonado.
  // Abrir um documento isolado deixa o layout igual ao desktop.
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)

  if (isMobile) {
    const popup = window.open('', '_blank')
    if (popup) {
      popup.document.open()
      popup.document.write(printHtml)
      popup.document.close()
      popup.document.title = printDocTitle

      await new Promise<void>((resolve) => window.setTimeout(() => resolve(), 450))

      popup.focus()
      popup.print()
      return
    }
  }

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.setAttribute('aria-hidden', 'true')

  document.body.appendChild(iframe)

  try {
    const printDoc = iframe.contentDocument
    const printWindow = iframe.contentWindow

    if (!printDoc || !printWindow) {
      throw new Error('Nao foi possivel inicializar a impressao em PDF')
    }

    printDoc.open()
    printDoc.write(printHtml)
    printDoc.close()
    printDoc.title = printDocTitle
    const previousTitle = document.title
    document.title = printDocTitle

    await new Promise<void>((resolve) => {
      iframe.onload = () => resolve()
      window.setTimeout(() => resolve(), 500)
    })

    printWindow.focus()
    printWindow.print()
    window.setTimeout(() => {
      document.title = previousTitle
    }, 0)
  } finally {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe)
    }
  }
}

export async function exportDashboardToPDF(options: ExportPdfOptions = {}) {
  let printRoot: HTMLElement | null = null

  try {
    const main = document.querySelector('main') as HTMLElement | null
    if (!main) {
      throw new Error('Elemento principal nao encontrado para exportacao')
    }

    const reportTitle = options.reportTitle || resolveReportTitle(main)
    const fileName = options.fileName || buildFileName(reportTitle)
    const { root, content } = buildPrintRoot(main, reportTitle)
    printRoot = root

    const html2pdfModule = await import('html2pdf.js')
    const html2pdfFactory = (html2pdfModule.default || html2pdfModule) as unknown as Html2PdfFactory

    if (typeof html2pdfFactory !== 'function') {
      throw new Error('Biblioteca de exportacao PDF indisponivel')
    }

    const pdfOptions = {
      margin: [8, 8, 8, 8],
      filename: fileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      },
      jsPDF: {
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      },
      pagebreak: {
        mode: ['css', 'legacy'],
      },
    }

    await html2pdfFactory().set(pdfOptions as Record<string, unknown>).from(content).save()
  } catch (err) {
    console.error('Erro ao exportar PDF via html2pdf, tentando fallback de impressao:', err)

    const main = document.querySelector('main') as HTMLElement | null
    if (!main) {
      throw err
    }

    const reportTitle = options.reportTitle || resolveReportTitle(main)
    const { content } = buildPrintRoot(main, reportTitle)
    await fallbackToPrint(content, reportTitle, options.fileName)
  } finally {
    if (printRoot && printRoot.parentNode) {
      printRoot.parentNode.removeChild(printRoot)
    }
    const staleRoot = document.getElementById('pdf-export-root')
    if (staleRoot && staleRoot.parentNode) {
      staleRoot.parentNode.removeChild(staleRoot)
    }
  }
}
