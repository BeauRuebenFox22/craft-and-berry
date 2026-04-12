class FoxyCollectionHero extends HTMLElement {
  constructor() {
    super();
    this.hotspots = this.querySelectorAll('.foxy-hero-hotspot');
    this.bindEvents();
  }

  bindEvents() {
    this.hotspots.forEach(hotspot => {
      hotspot.addEventListener('click', (e) => this.handleHotspotClick(e, hotspot));
    });

    // Close modals on clicking outside
    document.addEventListener('click', (e) => {
      if (e.target.closest('.foxy-hero-hotspot')) return;
      if (e.target.closest('.foxy-hotspot-modal')) return;
      this.closeAllModals();
    });
  }

  handleHotspotClick(event, hotspot) {
    event.stopPropagation();
    
    const handle = hotspot.getAttribute('data-product-handle');
    const existingModal = this.querySelector(`.foxy-hotspot-modal[data-modal-handle="${handle}"]`);
    
    this.closeAllModals();

    if (existingModal) {
      existingModal.classList.add('active');
    } else {
      // Clone from template
      const template = this.querySelector(`#hotspot-modal-${handle}`);
      if (template) {
        const clone = template.content.cloneNode(true);
        const modalEl = clone.querySelector('.foxy-hotspot-modal');
        modalEl.setAttribute('data-modal-handle', handle);
        
        // Position it relative to the hotspot
        const top = hotspot.style.top;
        const left = hotspot.style.left;
        
        modalEl.style.top = `calc(${top} + 24px)`;
        modalEl.style.left = `calc(${left} + 24px)`;
        
        this.querySelector('.foxy-hero-wrapper').appendChild(modalEl);
        
        // Need a slight delay for CSS transition to trigger if adding class
        requestAnimationFrame(() => {
          modalEl.classList.add('active');
        });

        // Bind add to cart form inside the modal
        const form = modalEl.querySelector('form');
        if (form) {
          form.addEventListener('submit', this.handleAddToCart.bind(this));
        }
      }
    }
  }

  closeAllModals() {
    this.querySelectorAll('.foxy-hotspot-modal').forEach(modal => {
      modal.classList.remove('active');
    });
  }

  async handleAddToCart(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Adding...';
    }

    try {
      const formData = new FormData(form);
      const response = await fetch(`${window.Shopify.routes.root}cart/add.js`, {
        method: 'POST',
        body: formData,
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      const cart = await response.json();
      
      // Dispatch a global event so a toast or cart wrapper can update
      document.dispatchEvent(new CustomEvent('foxy:cart:updated', { detail: cart }));
      
      if (submitBtn) {
        submitBtn.textContent = 'Added to Cart!';
        setTimeout(() => {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Add to Cart';
          this.closeAllModals();
        }, 2000);
      }
      
    } catch (error) {
      console.error('Error adding to cart', error);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add to Cart';
      }
    }
  }
}

customElements.define('foxy-collection-hero', FoxyCollectionHero);
