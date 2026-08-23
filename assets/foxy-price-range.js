class FoxyPriceRange extends HTMLElement {
  connectedCallback() {
    this.inputs = this.querySelectorAll('input[type="range"]');
    this.spans = this.querySelectorAll('.foxy-price-inputs span');
    
    if (this.inputs.length >= 2 && this.spans.length >= 2) {
      // Extract currency symbol dynamically (e.g. £)
      const firstSpanText = this.spans[0].textContent;
      this.currencySymbol = firstSpanText.replace(/[0-9.,\s]/g, '') || '£';
      this.bindEvents();
    }
  }

  updateLabels() {
    const val1 = parseFloat(this.inputs[0].value);
    const val2 = parseFloat(this.inputs[1].value);
    const minVal = Math.min(val1, val2);
    const maxVal = Math.max(val1, val2);
    
    this.spans[0].textContent = `${this.currencySymbol}${minVal.toFixed(0)}`;
    this.spans[1].textContent = `${this.currencySymbol}${maxVal.toFixed(0)}`;
  }

  bindEvents() {
    this.inputs[0].addEventListener('input', () => {
      const val1 = parseFloat(this.inputs[0].value);
      const val2 = parseFloat(this.inputs[1].value);
      if (val1 > val2) {
        this.inputs[0].value = val2;
      }
      this.updateLabels();
    });

    this.inputs[1].addEventListener('input', () => {
      const val1 = parseFloat(this.inputs[0].value);
      const val2 = parseFloat(this.inputs[1].value);
      if (val2 < val1) {
        this.inputs[1].value = val1;
      }
      this.updateLabels();
    });
  }
}

customElements.define('foxy-price-range', FoxyPriceRange);
