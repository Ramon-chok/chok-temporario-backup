const ALLOWED_TAGS = new Set(['BR', 'P', 'DIV', 'SPAN', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI', 'IMG'])

function escapeHtml(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function sanitizeImageSrc(src: string) {
  const normalized = src.trim()
  if (
    normalized.startsWith('data:image/') ||
    normalized.startsWith('https://') ||
    normalized.startsWith('http://')
  ) {
    return normalized
  }

  return ''
}

function sanitizeNode(node: Node, doc: Document): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return doc.createTextNode(node.textContent || '')
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null
  }

  const element = node as HTMLElement
  const tagName = element.tagName.toUpperCase()

  if (!ALLOWED_TAGS.has(tagName)) {
    const fragment = doc.createDocumentFragment()
    Array.from(element.childNodes).forEach((child) => {
      const sanitizedChild = sanitizeNode(child, doc)
      if (sanitizedChild) {
        fragment.appendChild(sanitizedChild)
      }
    })
    return fragment
  }

  if (tagName === 'BR') {
    return doc.createElement('br')
  }

  if (tagName === 'IMG') {
    const image = doc.createElement('img')
    const src = sanitizeImageSrc(element.getAttribute('src') || '')
    if (!src) {
      return null
    }

    image.setAttribute('src', src)
    image.setAttribute('alt', element.getAttribute('alt') || 'Imagem da notificação')
    image.setAttribute('loading', 'lazy')
    const title = element.getAttribute('title')
    if (title) {
      image.setAttribute('title', title)
    }
    return image
  }

  const cleanElement = doc.createElement(tagName.toLowerCase())
  Array.from(element.childNodes).forEach((child) => {
    const sanitizedChild = sanitizeNode(child, doc)
    if (sanitizedChild) {
      cleanElement.appendChild(sanitizedChild)
    }
  })

  return cleanElement
}

export function sanitizeNotificationHtml(content: string) {
  const trimmed = content.trim()
  if (!trimmed) {
    return ''
  }

  if (typeof window === 'undefined') {
    return escapeHtml(trimmed)
  }

  const parser = new DOMParser()
  const parsed = parser.parseFromString(trimmed, 'text/html')
  const container = document.createElement('div')

  Array.from(parsed.body.childNodes).forEach((child) => {
    const sanitizedChild = sanitizeNode(child, document)
    if (sanitizedChild) {
      container.appendChild(sanitizedChild)
    }
  })

  return container.innerHTML.trim()
}

export function notificationHasRichContent(content: string) {
  return /<(img|br|p|div|ul|ol|li|strong|b|em|i|u|span)\b/i.test(content)
}

export function normalizeNotificationMessageInput(content: string) {
  const sanitized = sanitizeNotificationHtml(content)
  if (!sanitized) {
    return ''
  }

  if (typeof window === 'undefined') {
    return sanitized
  }

  const container = document.createElement('div')
  container.innerHTML = sanitized
  const textOnly = (container.textContent || '').replace(/\u00a0/g, ' ').trim()

  if (!notificationHasRichContent(sanitized)) {
    return textOnly
  }

  if (!textOnly && !sanitized.includes('<img')) {
    return ''
  }

  return sanitized
}