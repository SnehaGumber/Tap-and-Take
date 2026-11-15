import { useEffect } from 'react'

export default function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | Tap & Take` : 'Tap & Take | Modern Marketplace'
  }, [title])
}
