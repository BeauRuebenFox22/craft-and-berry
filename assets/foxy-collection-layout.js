class FoxyCollectionLayout extends HTMLElement {
  constructor() {
    super();
    this.mobileToggle = this.querySelector('.foxy-mobile-filter-toggle');
    this.leftPanel = this.querySelector('.foxy-layout-left');
    this.closeBtn = this.querySelector('.foxy-mobile-filter-close');
    this.gridContainer = this.querySelector('foxy-collection-grid');
    this.layoutBtns = this.querySelectorAll('.grid-layout-btn');
    
    this.bindEvents();
  }

  bindEvents() {
    if (this.mobileToggle && this.leftPanel) {
      this.mobileToggle.addEventListener('click', () => {
        this.leftPanel.classList.add('mobile-open');
      });
    }

    if (this.closeBtn && this.leftPanel) {
      this.closeBtn.addEventListener('click', () => {
        this.leftPanel.classList.remove('mobile-open');
      });
    }

    this.layoutBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const cols = e.currentTarget.getAttribute('data-cols');
        
        this.layoutBtns.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        
        if (this.gridContainer) {
          this.gridContainer.setAttribute('data-cols', cols);
        }
      });
    });
  }
}

customElements.define('foxy-collection-layout', FoxyCollectionLayout);
