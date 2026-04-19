class FoxyCollectionGrid extends HTMLElement {
  constructor() {
    super();
    // Use event delegation to handle clicks inside the grid so it works after AJAX reloads too
    this.addEventListener('submit', this.handleFormSubmit.bind(this));
  }

  async handleFormSubmit(event) {
    const form = event.target;
    if (!form.hasAttribute('data-product-form')) return;
    
    event.preventDefault();
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
      
      document.dispatchEvent(new CustomEvent('foxy:cart:updated', { detail: cart }));
      
      if (submitBtn) {
        submitBtn.textContent = 'Added to Cart!';
        submitBtn.classList.add('success');
        
        let msg = form.querySelector('.foxy-form-message');
        if (!msg) {
          msg = document.createElement('div');
          msg.className = 'foxy-form-message';
          msg.style.color = 'var(--foxy-highlight)';
          msg.style.fontSize = '13px';
          msg.style.marginTop = '10px';
          msg.style.fontWeight = 'bold';
          form.appendChild(msg);
        }
        msg.textContent = 'Successfully added to cart!';
        
        setTimeout(() => {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Add to Cart';
          submitBtn.classList.remove('success');
          if (msg) msg.remove();
        }, 3000);
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

customElements.define('foxy-collection-grid', FoxyCollectionGrid);
