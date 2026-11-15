import { useSearchParams } from 'react-router-dom'
import Products from './Products.jsx'

export default function SearchResults() {
  const [searchParams] = useSearchParams()
  const term = searchParams.get('q')
  return <Products title={term ? `Results for "${term}"` : 'Search results'} />
}
