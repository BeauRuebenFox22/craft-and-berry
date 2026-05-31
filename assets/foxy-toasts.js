/**
 * Foxy Toast Web Components
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
      this.querySelector('.foxy-toast__close').addEventListener('click', () => this.dismiss());
    }
  }

  startTimeOut() {
    const duration = parseInt(this.getAttribute('duration')) || 15000;
    setTimeout(() => this.dismiss(), duration);
  }

  dismiss() {
    this.classList.add('foxy-toast--dismissing');
    this.addEventListener('animationend', () => {
      this.remove();
      // Trigger event for container if needed
    }, { once: true });
  }
}

class FoxyToastContainer extends HTMLElement {
  constructor() {
    super();
    window.foxyToast = this;
    this.initCartInterceptor();
  }

  initCartInterceptor() {
    if (window.foxyCartInterceptorInitialized) return;
    window.foxyCartInterceptorInitialized = true;

    // Listen for custom add to cart events dispatched by our components instead of overriding fetch
    document.addEventListener('foxy:cart:updated', () => {
      this.show({
        message: 'Successfully added product to cart!',
        status: 'success'
      });
    });
  }

  show({ message, status = 'info', stackable = true, dismissable = true, duration = 15000 }) {
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

customElements.define('foxy-toast', FoxyToast);
customElements.define('foxy-toast-container', FoxyToastContainer);
