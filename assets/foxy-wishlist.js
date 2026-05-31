class FoxyWishlistButton extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.btn = this.querySelector('button');
    if (this.btn) {
      this.btn.addEventListener('click', this.toggleWishlist.bind(this));
    }
    
    this.productData = {
      id: this.getAttribute('data-product-id'),
      handle: this.getAttribute('data-product-handle'),
      title: this.getAttribute('data-title'),
      price: this.getAttribute('data-price'),
      image: this.getAttribute('data-image'),
      url: this.getAttribute('data-url'),
      variant_id: this.getAttribute('data-variant-id')
    };

    this._checkStatusHandler = this.checkStatus.bind(this);
    document.addEventListener(window.foxy.events.WISHLIST_UPDATED, this._checkStatusHandler);
    this.checkStatus();
  }

  disconnectedCallback() {
    if (this._checkStatusHandler) {
      document.removeEventListener(window.foxy.events.WISHLIST_UPDATED, this._checkStatusHandler);
    }
  }

  getWishlist() {
    return JSON.parse(localStorage.getItem('foxy_wishlist') || '[]');
  }

  setWishlist(list) {
    localStorage.setItem('foxy_wishlist', JSON.stringify(list));
    document.dispatchEvent(new CustomEvent(window.foxy.events.WISHLIST_UPDATED, { detail: list }));
  }

  checkStatus() {
    const list = this.getWishlist();
    const exists = list.some(item => item.id === this.productData.id);
    if (exists) {
      this.classList.add('in-wishlist');
    } else {
      this.classList.remove('in-wishlist');
    }
  }

  toggleWishlist() {
    event.preventDefault();
    event.stopPropagation();
    
    const list = this.getWishlist();
    const index = list.findIndex(item => item.id === this.productData.id);
    
    if (index > -1) {
      list.splice(index, 1);
      document.dispatchEvent(new CustomEvent(window.foxy.events.WISHLIST_REMOVE, { detail: this.productData }));
    } else {
      list.push(this.productData);
      document.dispatchEvent(new CustomEvent(window.foxy.events.WISHLIST_ADD, { detail: this.productData }));
    }
    
    this.setWishlist(list);
  }
}

customElements.define('foxy-wishlist-button', FoxyWishlistButton);


class FoxyWishlistWidget extends HTMLElement {
  constructor() {
    super();
    this.innerHTML = `
      <div class="foxy-wishlist-widget-btn">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
        </svg>
        <span class="wishlist-count">0</span>
      </div>
      <div class="foxy-wishlist-drawer">
        <div class="foxy-wishlist-drawer-header">
          <h3>Your Wishlist</h3>
          <button class="foxy-wishlist-drawer-close">&times;</button>
        </div>
        <div class="foxy-wishlist-drawer-items"></div>
      </div>
      <div class="foxy-wishlist-overlay"></div>
    `;

    this.btn = this.querySelector('.foxy-wishlist-widget-btn');
    this.count = this.querySelector('.wishlist-count');
    this.drawer = this.querySelector('.foxy-wishlist-drawer');
    this.closeBtn = this.querySelector('.foxy-wishlist-drawer-close');
    this.overlay = this.querySelector('.foxy-wishlist-overlay');
    this.itemsContainer = this.querySelector('.foxy-wishlist-drawer-items');

    this.btn.addEventListener('click', () => this.open());
    this.closeBtn.addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', () => this.close());

    document.addEventListener(window.foxy.events.WISHLIST_UPDATED, this.render.bind(this));
    
    // Initial Render
    this.render();
  }

  getWishlist() {
    return JSON.parse(localStorage.getItem('foxy_wishlist') || '[]');
  }

  removeFromWishlist(id) {
    const list = this.getWishlist();
    const updated = list.filter(item => item.id !== id);
    localStorage.setItem('foxy_wishlist', JSON.stringify(updated));
    document.dispatchEvent(new CustomEvent(window.foxy.events.WISHLIST_UPDATED, { detail: updated }));
  }

  addToCart(item, btnElement) {
    btnElement.disabled = true;
    btnElement.textContent = 'Adding...';

    const formData = new FormData();
    formData.append('id', item.variant_id);
    formData.append('quantity', 1);

    fetch(window.Shopify.routes.root + 'cart/add.js', {
      method: 'POST',
      body: formData,
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
    .then(response => response.json())
    .then(cart => {
      document.dispatchEvent(new CustomEvent('foxy:cart:updated', { detail: cart }));
      btnElement.textContent = 'Added!';
      setTimeout(() => {
        btnElement.disabled = false;
        btnElement.textContent = 'Add to Cart';
      }, 2000);
    })
    .catch(err => {
      console.error(err);
      btnElement.disabled = false;
      btnElement.textContent = 'Add to Cart';
    });
  }

  open() {
    this.classList.add('open');
  }

  close() {
    this.classList.remove('open');
  }

  render() {
    const list = this.getWishlist();
    this.count.textContent = list.length;
    
    if (list.length === 0) {
      this.itemsContainer.innerHTML = '<div class="wishlist-empty">Your wishlist is empty.</div>';
      return;
    }

    this.itemsContainer.innerHTML = '';
    list.forEach(item => {
      const el = document.createElement('div');
      el.className = 'foxy-wishlist-item';
      
      const imgHtml = item.image ? `<img src="${item.image}" alt="${item.title}">` : '<div class="no-img"></div>';
      const priceStr = item.price; // Storing formatted string

      el.innerHTML = `
        <div class="wishlist-item-img">
          <a href="${item.url}">${imgHtml}</a>
        </div>
        <div class="wishlist-item-info">
          <a href="${item.url}" class="wishlist-item-title">${item.title}</a>
          <div class="wishlist-item-price">${priceStr}</div>
          <div class="wishlist-item-actions">
             <button class="cyber-button wishlist-atc">Add to Cart</button>
             <button class="wishlist-remove">Remove</button>
          </div>
        </div>
      `;

      el.querySelector('.wishlist-remove').addEventListener('click', () => this.removeFromWishlist(item.id));
      el.querySelector('.wishlist-atc').addEventListener('click', (e) => this.addToCart(item, e.target));
      this.itemsContainer.appendChild(el);
    });
  }
}

customElements.define('foxy-wishlist-widget', FoxyWishlistWidget);
