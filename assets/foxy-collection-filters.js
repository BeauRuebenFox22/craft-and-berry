class FoxyCollectionFilters extends HTMLElement {
  constructor() {
    super();
    this.searchForm = this.querySelector('#FoxySearchForm');
    this.filtersForm = this.querySelector('#FoxyFacetFiltersForm');
    this.sortSelect = document.querySelector('#FoxySortBy');
    
    this.bindEvents();
    this.renderPaginationButtons();
    
    // Check if we need to trigger search/filter on page load
    this.checkQueryOnLoad();
  }

  checkQueryOnLoad() {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    const searchInput = this.searchForm ? this.searchForm.querySelector('.foxy-search-bar') : null;
    
    if (query && searchInput) {
      searchInput.value = query;
      this.executeSearch(query);
    }
  }

  bindEvents() {
    if (this.searchForm) {
      const searchInput = this.searchForm.querySelector('.foxy-search-bar');
      const searchIcon = this.searchForm.querySelector('.search-icon');

      if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.handleSearchSubmit();
          }
        });
      }

      if (searchIcon) {
        searchIcon.style.cursor = 'pointer';
        searchIcon.addEventListener('click', () => {
          this.handleSearchSubmit();
        });
      }

      this.searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSearchSubmit();
      });
    }

    if (this.filtersForm) {
      this.filtersForm.addEventListener('change', (e) => {
        this.handleFilterChange();
      });
    }

    if (this.sortSelect) {
      this.sortSelect.addEventListener('change', this.handleFilterChange.bind(this));
    }
  }

  handleSearchSubmit() {
    const searchInput = this.searchForm ? this.searchForm.querySelector('.foxy-search-bar') : null;
    const query = searchInput ? searchInput.value.trim() : '';

    if (query !== '') {
      // Reset filters visually and in DOM so they don't skew/interfere
      if (this.filtersForm) {
        this.filtersForm.reset();
        
        // Reset price slider labels and values visually
        const priceInputs = this.filtersForm.querySelectorAll('.foxy-price-inputs span');
        const priceSliders = this.filtersForm.querySelectorAll('.foxy-price-slider input');
        if (priceSliders.length === 2 && priceInputs.length === 2) {
          const maxVal = priceSliders[1].getAttribute('max');
          priceSliders[0].value = 0;
          priceSliders[1].value = maxVal;
          priceInputs[0].textContent = priceInputs[0].textContent.substring(0, 1) + '0';
          priceInputs[1].textContent = priceInputs[1].textContent.substring(0, 1) + maxVal;
        }
      }

      // Update browser URL to show only the search query
      const url = `${window.location.pathname}?q=${encodeURIComponent(query)}`;
      window.history.pushState({ path: url }, '', url);

      this.executeSearch(query);
    } else {
      // Clear search and run filter change to restore normal view
      const url = window.location.pathname;
      window.history.pushState({ path: url }, '', url);
      this.handleFilterChange();
    }
  }

  async executeSearch(query) {
    const gridWrapper = document.querySelector('.foxy-grid-wrapper');
    if (gridWrapper) gridWrapper.classList.add('loading');

    const collectionHandle = this.getAttribute('data-collection-handle') || '';
    const fetchUrl = `/search?q=${encodeURIComponent(query)}&filter.p.collection=${collectionHandle}&resources[type]=product`;

    try {
      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error('Search request failed');
      const htmlText = await response.text();

      const parser = new DOMParser();
      const newDoc = parser.parseFromString(htmlText, 'text/html');

      const oldGridContainer = document.querySelector('#FoxyProductGridContainer');
      const paginationContainer = document.querySelector('.foxy-pagination-wrapper');

      const searchGrid = newDoc.querySelector('.foxy-search-results-grid');
      const oldGrid = document.querySelector('#FoxyProductGrid');

      if (oldGrid) {
        if (searchGrid && !searchGrid.classList.contains('foxy-search-empty')) {
          const searchCards = searchGrid.querySelectorAll('.foxy-product-card');
          oldGrid.innerHTML = '';
          searchCards.forEach(card => {
            oldGrid.appendChild(card.cloneNode(true));
          });
        } else {
          oldGrid.innerHTML = `<p class="foxy-no-products">No products found matching "${query}" in this collection.</p>`;
        }
      }

      if (paginationContainer) paginationContainer.style.display = 'none';
      if (gridWrapper) gridWrapper.classList.remove('loading');
    } catch (e) {
      console.error('Error executing collection search:', e);
      if (gridWrapper) gridWrapper.classList.remove('loading');
    }
  }

  async handleFilterChange() {
    // Clear search input text since we are returning to normal filters mode
    if (this.searchForm) {
      const searchInput = this.searchForm.querySelector('.foxy-search-bar');
      if (searchInput) searchInput.value = '';
    }

    // Show loading state
    const gridWrapper = document.querySelector('.foxy-grid-wrapper');
    if (gridWrapper) gridWrapper.classList.add('loading');

    const formData = this.filtersForm ? new FormData(this.filtersForm) : new FormData();
    
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

    const sectionId = document.querySelector('.foxy-collection-main-section').id.replace('shopify-section-', '');
    const fetchUrl = `${window.location.pathname}?${searchParams.toString()}&section_id=${sectionId}`;

    try {
      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      const htmlText = await response.text();
      
      const parser = new DOMParser();
      const newDoc = parser.parseFromString(htmlText, 'text/html');
      
      const oldGridContainer = document.querySelector('#FoxyProductGridContainer');
      const paginationContainer = document.querySelector('.foxy-pagination-wrapper');
      
      const newGridContainer = newDoc.querySelector('#FoxyProductGridContainer');
      if (newGridContainer && oldGridContainer) {
        oldGridContainer.innerHTML = newGridContainer.innerHTML;
      }
      
      if (paginationContainer) paginationContainer.style.display = '';
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
          
          this.renderPaginationButtons();
          
          if(gridWrapper) gridWrapper.classList.remove('loading');
          
          // Scroll to top of grid
          const gridTarget = document.getElementById('FoxyProductGridContainer');
          if (gridTarget) {
            gridTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          
          const rightPanel = document.querySelector('.foxy-custom-scrollbar');
          if (rightPanel) {
            rightPanel.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }
      });
    });
  }
}

customElements.define('foxy-collection-filters', FoxyCollectionFilters);
