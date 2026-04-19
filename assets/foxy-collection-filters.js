class FoxyCollectionFilters extends HTMLElement {
  constructor() {
    super();
    this.form = this.querySelector('#FoxyFacetFiltersForm');
    this.sortSelect = document.querySelector('#FoxySortBy');
    
    this.bindEvents();
    this.renderPaginationButtons();
  }

  bindEvents() {
    if (this.form) {
      this.form.addEventListener('change', this.handleFilterChange.bind(this));
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFilterChange();
      });
    }

    if (this.sortSelect) {
      this.sortSelect.addEventListener('change', this.handleFilterChange.bind(this));
    }
  }

  async handleFilterChange() {
    // Show loading state
    const gridWrapper = document.querySelector('.foxy-grid-wrapper');
    if (gridWrapper) gridWrapper.classList.add('loading');

    const formData = new FormData(this.form);
    
    // Add sort_by to formData manually if it's not in the main form
    if (this.sortSelect) {
      formData.append('sort_by', this.sortSelect.value);
    }
    
    const searchParams = new URLSearchParams(formData);

    // Remove empty params to keep URL clean
    for(const [key, value] of Array.from(searchParams.entries())) {
      if (!value) {
        searchParams.delete(key);
      }
    }

    const url = `${window.location.pathname}?${searchParams.toString()}`;
    
    // Update history without reloading
    window.history.pushState({ path: url }, '', url);

    try {
      // Use Section Rendering API
      // Fetch only the product grid and filters section
      const sectionId = document.querySelector('.foxy-collection-main-section').id.replace('shopify-section-', '');
      
      const response = await fetch(`${url}&section_id=${sectionId}`);
      if (!response.ok) throw new Error('Network response was not ok');
      const htmlText = await response.text();
      
      const parser = new DOMParser();
      const newDoc = parser.parseFromString(htmlText, 'text/html');
      
      // Replace the grid container
      const newGridContainer = newDoc.querySelector('#FoxyProductGridContainer');
      const oldGridContainer = document.querySelector('#FoxyProductGridContainer');
      
      if (newGridContainer && oldGridContainer) {
        oldGridContainer.innerHTML = newGridContainer.innerHTML;
      }
      
      this.renderPaginationButtons();
      
      if (gridWrapper) gridWrapper.classList.remove('loading');
      
    } catch (error) {
      console.error('Error fetching filtered products:', error);
      if (gridWrapper) gridWrapper.classList.remove('loading');
    }
  }

  renderPaginationButtons() {
    // Find the pagination data script
    const paginationDataEl = document.querySelector('#FoxyPaginationData');
    const paginationContainer = document.querySelector('.foxy-pagination-wrapper');
    
    if (!paginationContainer) return;

    let previousUrl = null;
    let nextUrl = null;

    if (paginationDataEl) {
      try {
        const data = JSON.parse(paginationDataEl.textContent);
        previousUrl = data.previousUrl;
        nextUrl = data.nextUrl;
      } catch(e) {
        console.error('Error parsing pagination JSON', e);
      }
    }

    let html = `<div class="foxy-pagination-inner">`;
    
    if (previousUrl) {
       html += `<button type="button" class="foxy-paginate-btn" data-url="${previousUrl}">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  PREVIOUS
                </button>`;
    } else {
       html += `<button type="button" class="foxy-paginate-btn" disabled style="opacity: 0.5; cursor: not-allowed; border-color: rgba(255,255,255,0.1);">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  PREVIOUS
                </button>`;
    }
    
    if (nextUrl) {
       html += `<button type="button" class="foxy-paginate-btn" data-url="${nextUrl}">
                  NEXT
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>`;
    } else {
       html += `<button type="button" class="foxy-paginate-btn" disabled style="opacity: 0.5; cursor: not-allowed; border-color: rgba(255,255,255,0.1);">
                  NEXT
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>`;
    }
    html += `</div>`;
    
    paginationContainer.innerHTML = html;
    
    // Bind pagination clicks via History API
    paginationContainer.querySelectorAll('.foxy-paginate-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const url = e.currentTarget.getAttribute('data-url');
        if(url) {
          window.history.pushState({path: url}, '', url);
          
          const gridWrapper = document.querySelector('.foxy-grid-wrapper');
          if (gridWrapper) gridWrapper.classList.add('loading');
          
          const sectionId = document.querySelector('.foxy-collection-main-section').id.replace('shopify-section-', '');
          const fetchUrl = url + (url.includes('?') ? '&' : '?') + `section_id=${sectionId}`;
          
          const res = await fetch(fetchUrl);
          const content = await res.text();
          const parser = new DOMParser();
          const newHtml = parser.parseFromString(content, 'text/html');
          
          const newGrid = newHtml.querySelector('#FoxyProductGridContainer');
          if(newGrid) {
            document.querySelector('#FoxyProductGridContainer').innerHTML = newGrid.innerHTML;
          }
          
          const newPagination = newHtml.querySelector('#FoxyPaginationData');
          if(newPagination) {
            document.querySelector('#FoxyPaginationData')?.remove();
            document.body.appendChild(newPagination.cloneNode(true));
          } else {
            document.querySelector('#FoxyPaginationData')?.remove();
          }
          this.renderPaginationButtons();
          
          if(gridWrapper) gridWrapper.classList.remove('loading');
          
          // Scroll to top of grid
          const gridTarget = document.getElementById('FoxyProductGridContainer');
          if (gridTarget) {
            gridTarget.scrollIntoView({ behavior: 'smooth' });
          } else {
            const rightPanel = document.querySelector('.foxy-custom-scrollbar');
            if (rightPanel) rightPanel.scrollTo({top: 0, behavior: 'smooth'});
          }
        }
      });
    });
  }
}

customElements.define('foxy-collection-filters', FoxyCollectionFilters);
