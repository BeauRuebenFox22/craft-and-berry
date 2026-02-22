class FoxyDiscountApplier extends HTMLElement {
  constructor() {
    super();
    this.selectors = {};
    this._submitting = false;
    this._onSubmit = this._onSubmit.bind(this);
  }

  connectedCallback() {
    this.initialize();
  }

  disconnectedCallback() {
    this.deinitialize();
  }

  setSelectors = (context = document, selectors = {}) => {
    const elements = {};
    Object.keys(selectors).forEach((key) => {
      const el = context.querySelector(selectors[key]);
      if (el) elements[key] = el;
    });
    return elements;
  };

  initialize() {
    this.selectors = this.setSelectors(this, {
      form: '#apply-voucher-form',
      input: '#discount-input',
      feedback: '#discount-feedback',
    });

    if (this.selectors.form) this.selectors.form.addEventListener('submit', this._onSubmit);
  }

  deinitialize() {
    if (this.selectors && this.selectors.form) this.selectors.form.removeEventListener('submit', this._onSubmit);
    if (this.selectors && this.selectors.clearBtn)
      this.selectors.clearBtn.removeEventListener('click', this._onClearClick);
  }

  _showFeedback(message, type = 'info') {
    const feedback = this.selectors.feedback;
    if (feedback) {
      feedback.textContent = message;
      feedback.classList.remove('hidden');
      feedback.classList.remove('text-green-600', 'text-red-600');
      if (type === 'success') feedback.classList.add('text-green-600');
      else if (type === 'error') feedback.classList.add('text-red-600');
      feedback.setAttribute('aria-live', 'polite');
    }
  }

  async _onSubmit(event) {
    event.preventDefault();
    if (this._submitting) return;
    const input = this.selectors.input;
    const code = input && typeof input.value === 'string' ? input.value.trim() : '';
    if (!code) {
      this._showFeedback('Please enter a discount code.', 'error');
      return;
    }
    this._submitting = true;
    if (input) input.setAttribute('disabled', 'disabled');
    try {
      // If this code is already applied, avoid redundant requests and give clearer feedback
      try {
        const preCart = await fetch(window.Shopify.routes.root + 'cart.js').then((r) => r.json());
        const preApps = Array.isArray(preCart.cart_level_discount_applications)
          ? preCart.cart_level_discount_applications
          : [];
        const alreadyApplied = preApps.some((d) => {
          const title = d && d.title ? String(d.title).toLowerCase() : '';
          return title.includes(code.toLowerCase());
        });
        if (alreadyApplied) {
          this._showFeedback('This discount is already applied.', 'info');
          return;
        }
      } catch (_) {
        // If pre-check fails, continue with best-effort apply
      }

      const response = await fetch(window.Shopify.routes.root + 'cart/update.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discount: code }),
      });

      if (!response.ok) {
        this._showFeedback('Unable to apply discount code.', 'error');
        return;
      }

      const cart = await fetch(window.Shopify.routes.root + 'cart.js').then((r) => r.json());
      const applications = Array.isArray(cart.cart_level_discount_applications)
        ? cart.cart_level_discount_applications
        : [];
      const isApplied = applications.some((d) => {
        const title = d && d.title ? String(d.title).toLowerCase() : '';
        return title.includes(code.toLowerCase());
      });
      if (isApplied || applications.length > 0) {
        this._showFeedback('Discount applied!', 'success');
        // Reload so the applied discount is visible to the user
        window.location.reload();
      } else {
        this._showFeedback('Invalid or ineligible code.', 'error');
      }
    } catch (error) {
      if (U.devMode) console.error('Discount error:', error);
      this._showFeedback('Unable to apply discount code.', 'error');
    } finally {
      this._submitting = false;
      if (input) input.removeAttribute('disabled');
    }
  }
}

if (!customElements.get('foxy-discount-applier')) customElements.define('foxy-discount-applier', FoxyDiscountApplier);
