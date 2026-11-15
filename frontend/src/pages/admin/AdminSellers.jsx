import { useSearchParams } from 'react-router-dom'
import Pagination from '../../components/common/Pagination.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import SkeletonLoader from '../../components/common/SkeletonLoader.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import useAsync from '../../hooks/useAsync.js'
import useDocumentTitle from '../../hooks/useDocumentTitle.js'
import { useToast } from '../../context/ToastContext.jsx'
import { fetchUsers, setSellerStatus, setUserActive } from '../../services/adminService.js'
import { formatDate } from '../../utils/format.js'

export default function AdminSellers() {
  useDocumentTitle('Sellers')
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = Object.fromEntries(searchParams.entries())
  const sellers = useAsync(
    () => fetchUsers({ role: 'seller', limit: 15, ...query }),
    [searchParams.toString()],
  )

  const update = (patch) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(patch).forEach(([key, value]) => {
      if (!value) next.delete(key)
      else next.set(key, String(value))
    })
    setSearchParams(next)
  }

  const act = async (seller, status) => {
    try {
      await setSellerStatus(seller._id, status)
      toast.success(`Store ${status}`)
      await sellers.refetch()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const toggleActive = async (seller) => {
    try {
      await setUserActive(seller._id, !seller.isActive)
      toast.success(seller.isActive ? 'Seller deactivated' : 'Seller activated')
      await sellers.refetch()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const list = sellers.data?.users || []

  return (
    <div className="dash-page">
      <header className="dash-page__head">
        <div>
          <h1>Sellers</h1>
          <p className="muted">Approve new stores and control marketplace access.</p>
        </div>
        <select
          value={query.storeStatus || ''}
          onChange={(event) => update({ storeStatus: event.target.value, page: 1 })}
        >
          <option value="">All store statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </header>

      {sellers.loading ? (
        <SkeletonLoader variant="row" count={6} />
      ) : sellers.error ? (
        <ErrorState message={sellers.error} onRetry={sellers.refetch} />
      ) : list.length === 0 ? (
        <EmptyState icon={'\u{1F3EA}'} title="No sellers found" message="Sellers appear here once they register a store." />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Store</th>
                  <th>Owner</th>
                  <th>Contact</th>
                  <th>Registered</th>
                  <th>Store status</th>
                  <th>Account</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((seller) => (
                  <tr key={seller._id}>
                    <td>
                      <strong>{seller.store?.name || 'Unnamed store'}</strong>
                      <small className="muted">{seller.store?.description || 'No description'}</small>
                    </td>
                    <td>
                      {seller.name}
                      <small className="muted">{seller.email}</small>
                    </td>
                    <td>
                      {seller.store?.contactEmail || seller.email}
                      <small className="muted">{seller.store?.contactPhone || seller.phone || '-'}</small>
                    </td>
                    <td>{formatDate(seller.createdAt)}</td>
                    <td>
                      <StatusBadge status={seller.store?.status || 'pending'} />
                    </td>
                    <td>
                      <StatusBadge status={seller.isActive ? 'active' : 'inactive'} />
                    </td>
                    <td>
                      <div className="row-actions">
                        {seller.store?.status !== 'approved' ? (
                          <button type="button" className="link-btn" onClick={() => act(seller, 'approved')}>
                            Approve
                          </button>
                        ) : null}
                        {seller.store?.status !== 'rejected' ? (
                          <button type="button" className="link-btn is-danger" onClick={() => act(seller, 'rejected')}>
                            Reject
                          </button>
                        ) : null}
                        <button type="button" className="link-btn" onClick={() => toggleActive(seller)}>
                          {seller.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={sellers.data?.meta} onChange={(page) => update({ page })} />
        </>
      )}
    </div>
  )
}
