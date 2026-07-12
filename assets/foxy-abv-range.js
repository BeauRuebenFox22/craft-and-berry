class FoxyAbvRange extends HTMLElement {
  constructor() {
    super();
    this.checkboxes = Array.from(this.querySelectorAll('input[type="checkbox"]'));
    this.rangeInput = this.querySelector('.foxy-abv-range-input');
    this.minLabel = this.querySelector('.foxy-abv-min-label');
    this.maxLabel = this.querySelector('.foxy-abv-max-label');
    this.form = this.closest('form');
    
    this.options = [];
    this.initOptions();
    this.bindEvents();
  }

  initOptions() {
    // Extract numeric values from checkboxes and sort them
    this.checkboxes.forEach(cb => {
      const val = parseFloat(cb.dataset.numericValue);
      if (!isNaN(val)) {
        this.options.push({ value: val, checkbox: cb });
      }
    });

    this.options.sort((a, b) => a.value - b.value);

    if (this.options.length > 0) {
      this.rangeInput.max = this.options.length - 1;
      
      // Determine currently selected max value from checked boxes
      let maxCheckedIndex = -1;
      this.options.forEach((opt, index) => {
        if (opt.checkbox.checked) {
          maxCheckedIndex = Math.max(maxCheckedIndex, index);
        }
      });

      if (maxCheckedIndex >= 0) {
        this.rangeInput.value = maxCheckedIndex;
      } else {
        // If nothing is checked, assume max range by default
        this.rangeInput.value = this.options.length - 1;
      }
      
      this.updateLabels();
    }
  }

  updateLabels() {
    const minVal = this.options[0]?.value || 0;
    const currentIndex = parseInt(this.rangeInput.value, 10);
    const currentMaxVal = this.options[currentIndex]?.value || 0;

    this.minLabel.textContent = `${minVal}%`;
    this.maxLabel.textContent = `Up to ${currentMaxVal}%`;
  }

  bindEvents() {
    if (!this.rangeInput) return;

    this.rangeInput.addEventListener('input', () => {
      this.updateLabels();
    });

    this.rangeInput.addEventListener('change', () => {
      const selectedIndex = parseInt(this.rangeInput.value, 10);
      
      // Uncheck all first
      this.options.forEach(opt => opt.checkbox.checked = false);

      // Check all up to the selected index
      for (let i = 0; i <= selectedIndex; i++) {
        this.options[i].checkbox.checked = true;
      }

      // Dispatch a change event on the form to trigger the standard filter update
      if (this.form) {
        this.form.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }
}

customElements.define('foxy-abv-range', FoxyAbvRange);
