import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import useAsync from '../../hooks/useAsync.js'
import useDocumentTitle from '../../hooks/useDocumentTitle.js'
import { useToast } from '../../context/ToastContext.jsx'
import { useCart } from '../../context/CartContext.jsx'
import { createOrder, fetchCheckoutSummary, runTestPayment } from '../../services/orderService.js'
import { formatCurrency } from '../../utils/format.js'

/**
 * Checkout only sends an address id and a payment method. Every amount is
 * recalculated on the server, so the client can never change what is charged.
 */
export default function Checkout() {
  useDocumentTitle('Checkout')
  const toast = useToast()
  const navigate = useNavigate()
  const { reload } = useCart()
  const summary = useAsync(() => fetchCheckoutSummary(), [])
  const [addressId, setAddressId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [outcome, setOutcome] = useState('success')
  const [placing, setPlacing] = useState(false)

  const addresses = summary.data?.addresses || []
  const cart = summary.data?.cart

  useEffect(() => {
    if (!addressId && addresses.length) {
      const preferred = addresses.find((address) => address.isDefault) || addresses[0]
      setAddressId(preferred._id)
    }
  }, [addresses, addressId])

  if (summary.loading) return <LoadingSpinner label="Preparing checkout" />
  if (summary.error) {
    return (
      <div className="container section">
        <ErrorState message={summary.error} onRetry={summary.refetch} />
      </div>
    )
  }
  if (!cart?.items?.length) {
    return (
      <div className="container section">
        <EmptyState
          icon={'\u{1F6D2}'}
          title="Nothing to check out"
          message="Add products to your cart before checking out."
          actionLabel="Browse products"
          actionTo="/products"
        />
      </div>
    )
  }

  const totals = cart.totals
  const stripeEnabled = summary.data?.payment?.stripeEnabled

  const placeOrder = async () => {
    if (!addressId) {
      toast.error('Please select a delivery address.')
      return
    }
    setPlacing(true)
    let createdOrder = null
    try {
      const created = await createOrder({ addressId, paymentMethod })
      createdOrder = created.order

      if (paymentMethod === 'cod') {
        await reload()
        toast.success('Order placed - pay on delivery')
        navigate(`/payment-result?status=success&orderId=${created.order._id}`, { replace: true })
        return
      }

      // Card payments are confirmed server side against Stripe test mode.
      const result = await runTestPayment({ orderId: created.order._id, outcome })
      await reload()
      toast.success('Payment successful')
      navigate(`/payment-result?status=success&orderId=${result.order._id}`, { replace: true })
    } catch (error) {
      toast.error(error.message)
      if (createdOrder) {
        navigate(
          `/payment-result?status=failed&orderId=${createdOrder._id}&reason=${encodeURIComponent(error.message)}`,
          { replace: true },
        )
      }
    } finally {
      setPlacing(false)
    }
  }

  return (
    <div className="container section">
      <h1>Checkout</h1>
      <p className="muted">Review your delivery details and complete payment securely.</p>

      <div className="checkout">
        <div className="checkout__main">
          <section className="card">
            <div className="card__head">
              <h2>1. Delivery address</h2>
              <Link className="link-btn" to="/addresses">
                Manage addresses
              </Link>
            </div>
            {addresses.length === 0 ? (
              <EmptyState
                icon={'\u{1F4CD}'}
                title="No saved address"
                message="Add a delivery address to place your order."
                actionLabel="Add address"
                actionTo="/addresses"
              />
            ) : (
              <div className="address-options">
                {addresses.map((address) => (
                  <label key={address._id} className={`address-option ${addressId === address._id ? 'is-active' : ''}`}>
                    <input
                      type="radio"
                      name="address"
                      checked={addressId === address._id}
                      onChange={() => setAddressId(address._id)}
                    />
                    <span>
                      <strong>
                        {address.label} &middot; {address.fullName}
                      </strong>
                      <br />
                      {address.line1}
                      {address.line2 ? `, ${address.line2}` : ''}
                      <br />
                      {address.city}, {address.state} {address.postalCode}, {address.country}
                      <br />
                      {address.phone}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <h2>2. Payment method</h2>
            <div className="pay-options">
              <label className={`pay-option ${paymentMethod === 'card' ? 'is-active' : ''}`}>
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                />
                <span>
                  <strong>Card payment (Stripe test mode)</strong>
                  <small>
                    {stripeEnabled
                      ? 'Confirmed with official Stripe test cards - no real money moves.'
                      : 'Stripe keys are not configured, so payments are simulated safely.'}
                  </small>
                </span>
              </label>
              <label className={`pay-option ${paymentMethod === 'cod' ? 'is-active' : ''}`}>
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                />
                <span>
                  <strong>Cash on delivery</strong>
                  <small>Pay the courier when your parcel arrives.</small>
                </span>
              </label>
            </div>

            {paymentMethod === 'card' ? (
              <div className="pay-outcome">
                <span className="muted">Test outcome</span>
                <label>
                  <input
                    type="radio"
                    name="outcome"
                    checked={outcome === 'success'}
                    onChange={() => setOutcome('success')}
                  />
                  Successful payment
                </label>
                <label>
                  <input
                    type="radio"
                    name="outcome"
                    checked={outcome === 'failure'}
                    onChange={() => setOutcome('failure')}
                  />
                  Declined card
                </label>
              </div>
            ) : null}
          </section>

          <section className="card">
            <h2>3. Review items</h2>
            <ul className="checkout__items">
              {cart.items.map((item) => (
                <li key={item.product._id}>
                  <span>
                    {item.product.title} &times; {item.quantity}
                  </span>
                  <strong>{formatCurrency(item.lineTotal, totals.currency)}</strong>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="summary">
          <h2>Order total</h2>
          <dl>
            <div>
              <dt>Subtotal</dt>
              <dd>{formatCurrency(totals.subtotal, totals.currency)}</dd>
            </div>
            <div>
              <dt>Discount</dt>
              <dd className="is-positive">-{formatCurrency(totals.discount, totals.currency)}</dd>
            </div>
            <div>
              <dt>Tax ({Math.round((summary.data?.settings?.taxRate || 0) * 100)}%)</dt>
              <dd>{formatCurrency(totals.tax, totals.currency)}</dd>
            </div>
            <div>
              <dt>Shipping</dt>
              <dd>{totals.shipping === 0 ? 'Free' : formatCurrency(totals.shipping, totals.currency)}</dd>
            </div>
          </dl>
          <div className="summary__total">
            <span>Amount payable</span>
            <strong>{formatCurrency(totals.total, totals.currency)}</strong>
          </div>
          <button
            type="button"
            className="btn btn--primary btn--block btn--lg"
            onClick={placeOrder}
            disabled={placing || !addressId}
          >
            {placing ? 'Processing\u2026' : paymentMethod === 'cod' ? 'Place order' : 'Pay and place order'}
          </button>
          <p className="muted summary__note">
            Totals are recalculated on the server from live database prices before payment.
          </p>
        </aside>
      </div>
    </div>
  )
}
