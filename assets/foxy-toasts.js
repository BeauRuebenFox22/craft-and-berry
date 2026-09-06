/**
 * Foxy Toast Web Components & Global Interceptors
 */

class FoxyToast extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
    this.startTimeOut();
  }

  render() {
    const message = this.getAttribute('message');
    const status = this.getAttribute('status') || 'info';
    const dismissable = this.getAttribute('dismissable') !== 'false';

    this.className = `foxy-toast foxy-toast--${status}`;
    this.innerHTML = `
      <div class="foxy-toast__content">${message}</div>
      ${dismissable ? `<button class="foxy-toast__close" aria-label="Close">&times;</button>` : ''}
    `;

    if (dismissable) {
      const closeBtn = this.querySelector('.foxy-toast__close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.dismiss());
      }
    }
  }

  startTimeOut() {
    const duration = parseInt(this.getAttribute('duration')) || 4000;
    setTimeout(() => this.dismiss(), duration);
  }

  dismiss() {
    if (this.isDismissing) return;
    this.isDismissing = true;
    this.classList.add('foxy-toast--dismissing');
    this.addEventListener('animationend', () => {
      this.remove();
    }, { once: true });
    setTimeout(() => {
      if (this.parentNode) this.remove();
    }, 400);
  }
}

class FoxyToastContainer extends HTMLElement {
  constructor() {
    super();
    window.foxyToast = this;
  }

  show({ message, status = 'info', stackable = true, dismissable = true, duration = 4000 }) {
    if (!stackable) {
      this.innerHTML = '';
    }

    const toast = document.createElement('foxy-toast');
    toast.setAttribute('message', message);
    toast.setAttribute('status', status);
    toast.setAttribute('dismissable', dismissable);
    toast.setAttribute('duration', duration);
    
    this.appendChild(toast);
  }
}

if (!customElements.get('foxy-toast')) {
  customElements.define('foxy-toast', FoxyToast);
}
if (!customElements.get('foxy-toast-container')) {
  customElements.define('foxy-toast-container', FoxyToastContainer);
}

// Immediately-invoked global interceptors & event listeners
(function() {
  window.showFoxyToast = function(message, status = 'success', duration = 4000) {
    if (window._foxyToastDebounce) return;
    window._foxyToastDebounce = true;
    setTimeout(() => { window._foxyToastDebounce = false; }, 400);

    let container = document.querySelector('foxy-toast-container');
    if (!container) {
      container = document.createElement('foxy-toast-container');
      document.body.appendChild(container);
    }
    if (container.show) {
      container.show({ message, status, duration });
    }
  };

  // 1. Event listener: foxy:cart:updated
  document.addEventListener('foxy:cart:updated', function(e) {
    console.log('[Foxy Toast] Event foxy:cart:updated received:', e.detail);
    const title = e.detail?.title || e.detail?.product_title;
    const msg = title ? `Added "${title}" to your cart!` : 'Successfully added product to cart!';
    window.showFoxyToast(msg, 'success');
  });

  // 2. Event listener: foxy:wishlist:add & remove
  document.addEventListener('foxy:wishlist:add', function(e) {
    console.log('[Foxy Toast] Event foxy:wishlist:add received:', e.detail);
    const title = e.detail?.title;
    const msg = title ? `Added "${title}" to your wishlist!` : 'Added item to your wishlist!';
    window.showFoxyToast(msg, 'success');
  });

  document.addEventListener('foxy:wishlist:remove', function(e) {
    console.log('[Foxy Toast] Event foxy:wishlist:remove received:', e.detail);
    const title = e.detail?.title;
    const msg = title ? `Removed "${title}" from your wishlist.` : 'Removed item from your wishlist.';
    window.showFoxyToast(msg, 'info');
  });

  // 3. Fetch Interceptor for /cart/add
  if (!window._foxyFetchIntercepted && window.fetch) {
    window._foxyFetchIntercepted = true;
    const origFetch = window.fetch;
    window.fetch = async function(...args) {
      const response = await origFetch.apply(this, args);
      try {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
        if (url && (url.includes('/cart/add') || url.includes('/cart/add.js'))) {
          if (response.ok) {
            const clone = response.clone();
            clone.json().then(data => {
              console.log('[Foxy Toast] Intercepted /cart/add fetch response:', data);
              const title = data.title || data.product_title || (data.items && data.items[0] && data.items[0].title);
              const msg = title ? `Added "${title}" to your cart!` : 'Successfully added product to cart!';
              window.showFoxyToast(msg, 'success');
            }).catch(() => {
              window.showFoxyToast('Successfully added product to cart!', 'success');
            });
          }
        }
      } catch (err) {
        console.error('[Foxy Toast] Fetch interceptor error:', err);
      }
      return response;
    };
  }

  // 4. XMLHttpRequest Interceptor for /cart/add
  if (!window._foxyXHRIntercepted && window.XMLHttpRequest) {
    window._foxyXHRIntercepted = true;
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      this._foxyUrl = url;
      return origOpen.call(this, method, url, ...rest);
    };

    XMLHttpRequest.prototype.send = function(...args) {
      this.addEventListener('load', function() {
        if (this._foxyUrl && (this._foxyUrl.includes('/cart/add') || this._foxyUrl.includes('/cart/add.js')) && this.status >= 200 && this.status < 300) {
          try {
            const data = JSON.parse(this.responseText);
            console.log('[Foxy Toast] Intercepted /cart/add XHR response:', data);
            const title = data.title || data.product_title || (data.items && data.items[0] && data.items[0].title);
            const msg = title ? `Added "${title}" to your cart!` : 'Successfully added product to cart!';
            window.showFoxyToast(msg, 'success');
          } catch(e) {
            window.showFoxyToast('Successfully added product to cart!', 'success');
          }
        }
      });
      return origSend.apply(this, args);
    };
  }
})();
