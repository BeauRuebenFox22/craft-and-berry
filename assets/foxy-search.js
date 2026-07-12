class FoxyMainSearch extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector('.foxy-search-input');
    this.cellarView = this.querySelector('.foxy-cellar-view');
    this.resultsView = this.querySelector('.foxy-search-results-view');
    this.productGridContainer = this.querySelector('#ProductGridContainer');
    this.shareBtnWrapper = this.querySelector('.foxy-search-share-wrapper');
    this.shareBtn = this.querySelector('.foxy-search-share-btn');
    this.sectionId = this.dataset.sectionId;

    this.debounceTimeout = null;

    if (this.input) {
      this.input.addEventListener('input', this.onInput.bind(this));
    }

    if (this.shareBtn) {
      this.shareBtn.addEventListener('click', this.onShare.bind(this));
    }

    this.initBestSellers();
  }

  onInput(event) {
    clearTimeout(this.debounceTimeout);
    const query = event.target.value.trim();

    if (query.length >= 2) {
      this.debounceTimeout = setTimeout(() => {
        this.performSearch(query);
      }, 400);
    } else if (query.length === 0) {
      this.clearSearch();
    }
  }

  async performSearch(query) {
    this.updateURL(query);
    this.shareBtnWrapper.classList.remove('hidden');

    try {
      const searchUrl = `${window.Shopify.routes.root}search?q=${encodeURIComponent(query)}&options%5Bprefix%5D=last&section_id=${this.sectionId}`;
      const response = await fetch(searchUrl);
      if (!response.ok) throw new Error('Search failed');
      const htmlText = await response.text();
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');
      
      const newGridContainer = doc.querySelector('#ProductGridContainer');
      
      if (newGridContainer) {
        this.productGridContainer.innerHTML = newGridContainer.innerHTML;
        
        // Transition
        this.cellarView.classList.add('foxy-fade-out');
        setTimeout(() => {
          this.cellarView.classList.add('hidden');
          this.resultsView.classList.remove('hidden');
          // small delay for display block to apply before animating opacity
          requestAnimationFrame(() => {
            this.resultsView.classList.add('foxy-fade-in');
          });
        }, 400); // matches css transition duration
      }
    } catch (err) {
      console.error(err);
    }
  }

  clearSearch() {
    this.updateURL('');
    this.shareBtnWrapper.classList.add('hidden');
    
    this.resultsView.classList.remove('foxy-fade-in');
    setTimeout(() => {
      this.resultsView.classList.add('hidden');
      this.cellarView.classList.remove('hidden');
      requestAnimationFrame(() => {
        this.cellarView.classList.remove('foxy-fade-out');
      });
    }, 400);
  }

  updateURL(query) {
    if (query) {
      const url = new URL(window.location.href);
      url.searchParams.set('q', query);
      url.searchParams.set('options[prefix]', 'last');
      window.history.pushState({}, '', url.toString());
    } else {
      const url = new URL(window.location.href);
      url.searchParams.delete('q');
      url.searchParams.delete('options[prefix]');
      window.history.pushState({}, '', url.toString());
    }
  }

  onShare() {
    navigator.clipboard.writeText(window.location.href)
      .then(() => {
        const originalText = this.shareBtn.innerText;
        this.shareBtn.innerText = 'Copied!';
        setTimeout(() => {
          this.shareBtn.innerText = originalText;
        }, 2000);
      });
  }

  async initBestSellers() {
    const bestSellersContainer = this.querySelector('.foxy-bestsellers-container');
    if (!bestSellersContainer) return;

    const htmlElement = document.documentElement;
    const token = htmlElement.getAttribute('store-token');
    const shopDomain = htmlElement.getAttribute('store-url') || window.location.hostname;
    const grid = bestSellersContainer.querySelector('.foxy-bestsellers-grid');
    const loadingGif = bestSellersContainer.querySelector('.foxy-loading-gif');

    if (!token) {
      grid.innerHTML = '<p>Please configure Storefront API Token in the HTML element.</p>';
      return;
    }

    loadingGif.classList.remove('hidden');

    const cacheKey = `foxy_best_sellers_v2_${shopDomain}`;
    const cachedData = sessionStorage.getItem(cacheKey);

    if (cachedData) {
      this.renderBestSellers(JSON.parse(cachedData), grid);
      loadingGif.classList.add('hidden');
      return;
    }

    const query = `
      query {
        products(first: 4, sortKey: BEST_SELLING) {
          edges {
            node {
              id
              handle
              title
              availableForSale
              featuredImage {
                url
                altText
              }
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              variants(first: 1) {
                edges {
                  node {
                    id
                  }
                }
              }
            }
          }
        }
      }
    `;

    try {
      const response = await fetch(`https://${shopDomain}/api/2024-01/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': token
        },
        body: JSON.stringify({ query })
      });

      const { data } = await response.json();
      
      if (data && data.products) {
        sessionStorage.setItem(cacheKey, JSON.stringify(data.products.edges));
        this.renderBestSellers(data.products.edges, grid);
      }
    } catch (err) {
      console.error('Failed to fetch best sellers:', err);
      grid.innerHTML = '<p>Failed to load best sellers.</p>';
    } finally {
      loadingGif.classList.add('hidden');
    }
  }

  renderBestSellers(products, gridElement) {
    gridElement.innerHTML = '';
    products.forEach(({ node }) => {
      const priceStr = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: node.priceRange.minVariantPrice.currencyCode
      }).format(node.priceRange.minVariantPrice.amount);

      const imageUrl = node.featuredImage ? node.featuredImage.url : '';
      const variantGid = node.variants.edges.length > 0 ? node.variants.edges[0].node.id : '';
      const rawVariantId = variantGid.split('/').pop();
      const rawProductId = node.id.split('/').pop();
      
      const cardHTML = `
        <div class="foxy-product-card glass-panel text-center" style="position:relative;">
          <div class="foxy-simple-badge" style="position: absolute; top: 1rem; left: 1rem; background: rgba(0,0,0,0.8); color: #fff; font-size: 1rem; padding: 0.3rem 0.8rem; border-radius: 4px; z-index: 1; text-transform: uppercase;">Best Seller</div>
          <a href="/products/${node.handle}" class="foxy-card-image-wrapper">
            <img src="${imageUrl}" style="width:100%; aspect-ratio:1; object-fit:contain; margin-bottom:1rem;" alt="${node.title}" loading="lazy" width="300" height="300" />
          </a>
          <div class="foxy-card-details" style="display:flex; flex-direction:column; gap:0.5rem; text-align:left;">
            <h3 class="foxy-card-title" style="font-size:1.4rem; margin:0;"><a href="/products/${node.handle}" style="color:#fff; text-decoration:none;">${node.title}</a></h3>
            <p class="foxy-card-price" style="font-size:1.2rem; color:rgba(255,255,255,0.7); margin-bottom:1.5rem;">${priceStr}</p>
            <div style="display: flex; gap: 8px; margin-top:auto;">
              <form method="post" action="/cart/add" data-product-form class="foxy-add-to-cart-form" style="flex:1;">
                <input type="hidden" name="id" value="${rawVariantId}">
                <button type="submit" class="cyber-button w-full foxy-ajax-btn" ${!node.availableForSale ? 'disabled style="background: #555; color: #fff; border: none; border-radius: 4px; padding: 0.8rem; cursor: not-allowed; width:100%; opacity:0.5;"' : 'style="background: #a855f7; color: #fff; border: none; border-radius: 4px; padding: 0.8rem; cursor: pointer; width:100%;"'} >${node.availableForSale ? 'Add to Cart' : 'Out of Stock'}</button>
              </form>
              <foxy-wishlist-button 
                data-product-id="${rawProductId}"
                data-product-handle="${node.handle}"
                data-title="${node.title}"
                data-price="${priceStr}"
                data-image="${imageUrl}"
                data-url="/products/${node.handle}"
                data-variant-id="${rawVariantId}">
                <button aria-label="Add to wishlist" class="foxy-pdp__btn foxy-pdp__wishlist-icon-btn" style="padding:0; width:40px; height:40px; background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius:50%; min-width:auto; display:flex; align-items:center; justify-content:center; cursor:pointer;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#fff;"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                </button>
              </foxy-wishlist-button>
            </div>
          </div>
        </div>
      `;
      gridElement.insertAdjacentHTML('beforeend', cardHTML);
    });
  }
}

customElements.define('foxy-main-search', FoxyMainSearch);
