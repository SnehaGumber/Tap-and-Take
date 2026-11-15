  import { useMemo } from 'react'
  import { Link } from 'react-router-dom'
  import ProductGrid from '../../components/product/ProductGrid.jsx'
  import ErrorState from '../../components/common/ErrorState.jsx'
  import SkeletonLoader from '../../components/common/SkeletonLoader.jsx'
  import useAsync from '../../hooks/useAsync.js'
  import useDocumentTitle from '../../hooks/useDocumentTitle.js'
  import { fetchCategories, fetchProducts } from '../../services/productService.js'
  import { getRecentlyViewed } from '../../utils/recent.js'
  import { CATEGORY_ICONS, TRUST_ITEMS } from '../../utils/constants.js'
  import { formatCurrency } from '../../utils/format.js'
  import { PLACEHOLDER_IMAGE } from '../../utils/constants.js'

  function Section({ title, subtitle, to, state, skeletonCount = 4 }) {
    return (
      <section className="container section home-shelf">
        <div className="section__head">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p className="muted">{subtitle}</p> : null}
          </div>
          {to ? (
            <Link className="link-btn" to={to}>
              View all
            </Link>
          ) : null}
        </div>
        {state.error ? (
          <ErrorState
            title="Unable to load products"
            message={`${state.error} Please try again.`}
            onRetry={state.refetch}
          />
        ) : (
          <ProductGrid
            products={state.data?.products || []}
            loading={state.loading}
            skeletonCount={skeletonCount}
          />
        )}
      </section>
    )
  }

  export default function Home() {
    useDocumentTitle('Shop the latest')

    const recentlyViewed = useMemo(() => getRecentlyViewed(), [])
    const recommendCategory = recentlyViewed[0]?.category || ''

    const categories = useAsync(() => fetchCategories(), [])
    const trending = useAsync(() => fetchProducts({ sort: 'popular', limit: 12 }), [])
    const deals = useAsync(() => fetchProducts({ sort: 'discount', minDiscount: 10, limit: 10 }), [])
    const bestSellers = useAsync(() => fetchProducts({ sort: 'popular', page: 2, limit: 10 }), [])
    const topRated = useAsync(() => fetchProducts({ sort: 'rating', rating: 4, limit: 10 }), [])
    const newest = useAsync(() => fetchProducts({ sort: 'newest', limit: 10 }), [])
    const recommended = useAsync(
      () =>
        fetchProducts({
          sort: 'rating',
          limit: 10,
          inStock: 'true',
          ...(recommendCategory ? { category: recommendCategory } : {}),
        }),
      [recommendCategory],
    )

    const categoryList = categories.data?.categories || []

    return (
      <>
        <section className="hero">
          <div className="container hero__inner">
            <div className="hero__copy">
              <span className="hero__eyebrow">Multi-vendor marketplace</span>
              <h1>
                Everything you love,
                <br /> from sellers you can trust.
              </h1>
              <p>
                Discover everyday essentials, standout tech and fresh styles from independent stores.
                Browse confidently with verified sellers, clear pricing and secure checkout.
              </p>
              <div className="hero__actions">
                <Link className="btn btn--primary btn--lg" to="/products">
                  Start shopping
                </Link>
                <Link className="btn btn--ghost btn--lg" to="/products?sort=discount&minDiscount=25">
                  See today&apos;s deals
                </Link>
              </div>
              <ul className="hero__points">
                <li>Verified sellers only</li>
                <li>Secure Stripe checkout</li>
                <li>7 day easy returns</li>
              </ul>
            </div>

            <div className="hero__panel">
              {trending.data?.products?.length ? (
                <div className="hero__showcase" aria-label="Featured products">
                  {trending.data.products.slice(0, 3).map((product, index) => (
                    <Link
                      key={product._id}
                      to={`/products/${product.slug || product._id}`}
                      className={`hero__product hero__product--${index + 1}`}
                    >
                      <img
                        src={product.images?.[0]?.url || product.image || PLACEHOLDER_IMAGE}
                        alt={product.title}
                        onError={(event) => { event.currentTarget.src = PLACEHOLDER_IMAGE }}
                      />
                      <span className="hero__product-caption">
                        <small>{index === 0 ? 'TRENDING PICK' : product.brand || 'TRENDORA FIND'}</small>
                        <strong>{product.title}</strong>
                      </span>
                    </Link>
                  ))}
                  <span className="hero__showcase-orbit hero__showcase-orbit--one" />
                  <span className="hero__showcase-orbit hero__showcase-orbit--two" />
                </div>
              ) : (
                <div className="hero__showcase hero__showcase--fallback">
                  <span className="hero__fallback-icon">✦</span>
                  <strong>Find your next favourite</strong>
                  <span>Explore the latest picks across Trendora</span>
                  <Link className="btn btn--primary" to="/products">Explore products</Link>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="container section home-categories">
          <div className="section__head">
            <div>
              <h2>Shop by category</h2>
              <p className="muted">Curated departments across the Trendora catalogue.</p>
            </div>
            <Link className="link-btn" to="/products">
              Browse all
            </Link>
          </div>
          {categories.loading ? (
            <SkeletonLoader variant="row" count={3} />
          ) : categories.error ? (
            <ErrorState
              title="Unable to load categories"
              message={`${categories.error} Please try again.`}
              onRetry={categories.refetch}
            />
          ) : (
            <div className="category-cards category-cards--home">
              {categoryList.map((category) => (
                <Link
                  key={category._id}
                  to={`/products?category=${category._id}`}
                  className="category-card"
                >
                  <span className="category-card__icon" aria-hidden="true">
                    {CATEGORY_ICONS[category.slug] || '\u{1F6CD}'}
                  </span>
                  <strong>{category.name}</strong>
                  {category.description ? <small>{category.description}</small> : null}
                </Link>
              ))}
            </div>
          )}
        </section>

        <Section
          title="Trending now"
          subtitle="The products customers are buying most this month."
          to="/products?sort=popular"
          state={trending}
          skeletonCount={8}
        />

        <Section
          title="Today's deals"
          subtitle="Everything here is discounted by at least 10%."
          to="/products?sort=discount&minDiscount=10"
          state={deals}
        />

        <Section
          title="Best sellers"
          subtitle="More of what sells fastest across Trendora stores."
          to="/products?sort=popular"
          state={bestSellers}
        />

        <Section
          title="Top rated"
          subtitle="Rated 4 stars and above by verified buyers."
          to="/products?sort=rating&rating=4"
          state={topRated}
        />

        <Section
          title="New arrivals"
          subtitle="The latest listings from our sellers."
          to="/products?sort=newest"
          state={newest}
        />

        <Section
          title="Recommended for you"
          subtitle={
            recommendCategory
              ? 'Highly rated products from the category you browsed last.'
              : 'Highly rated products that are in stock right now.'
          }
          to={recommendCategory ? `/products?category=${recommendCategory}&sort=rating` : '/products?sort=rating'}
          state={recommended}
        />

        {recentlyViewed.length ? (
          <section className="container section">
            <div className="section__head">
              <div>
                <h2>Recently viewed</h2>
                <p className="muted">Pick up where you left off.</p>
              </div>
            </div>
            <div className="recent-row">
              {recentlyViewed.map((item) => (
                <Link key={item._id} to={`/products/${item.slug || item._id}`} className="recent-card">
                  <img
                    src={item.image || PLACEHOLDER_IMAGE}
                    alt={item.title}
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.src = PLACEHOLDER_IMAGE
                    }}
                  />
                  <span className="recent-card__title">{item.title}</span>
                  <strong>{formatCurrency(item.finalPrice ?? item.price)}</strong>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="trust">
          <div className="container">
            <div className="section__head">
              <div>
                <h2>Why shop on Trendora</h2>
                <p className="muted">Marketplace safeguards that apply to every order.</p>
              </div>
            </div>
            <div className="trust__grid">
              {TRUST_ITEMS.map((item) => (
                <article className="trust__card" key={item.title}>
                  <span className="trust__icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </>
    )
  }
