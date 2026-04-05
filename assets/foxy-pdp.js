/** 
 * Foxy PDP JS Scripts
 * Handles Carousel navigation, Image Lightbox, and Pannable Zoom functionality.
 */

class FoxyPDP {
  constructor() {
    this.carousel = document.querySelector('.foxy-pdp__carousel');
    if (!this.carousel) return;

    this.slides = document.querySelectorAll('.foxy-pdp__slide');
    this.dots = document.querySelectorAll('.foxy-pdp__dot');
    this.btnPrev = document.querySelector('.foxy-pdp__nav-btn--prev');
    this.btnNext = document.querySelector('.foxy-pdp__nav-btn--next');
    
    // Lightbox Elements
    this.lightbox = document.querySelector('.foxy-lightbox');
    this.lightboxImg = document.querySelector('.foxy-lightbox__img');
    this.lightboxClose = document.querySelector('.foxy-lightbox__close');
    this.lightboxSlider = document.querySelector('.foxy-lightbox__slider');
    this.lightboxContent = document.querySelector('.foxy-lightbox__content');

    // Pan state
    this.scale = 1;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;

    this.initCarousel();
    this.initLightbox();
    this.initVariantHandling();
  }

  initCarousel() {
    if (this.slides.length <= 1) return;

    // Dot clicks
    this.dots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        const slideWidth = this.slides[0].clientWidth;
        this.carousel.scrollTo({
          left: slideWidth * index,
          behavior: 'smooth'
        });
      });
    });

    // Arrow clicks
    if (this.btnPrev && this.btnNext) {
      this.btnPrev.addEventListener('click', () => {
        const slideWidth = this.slides[0].clientWidth;
        this.carousel.scrollBy({ left: -slideWidth, behavior: 'smooth' });
      });

      this.btnNext.addEventListener('click', () => {
        const slideWidth = this.slides[0].clientWidth;
        this.carousel.scrollBy({ left: slideWidth, behavior: 'smooth' });
      });
    }

    // Update dots on scroll
    this.carousel.addEventListener('scroll', () => {
      const scrollPos = this.carousel.scrollLeft;
      const slideWidth = this.slides[0].clientWidth;
      const index = Math.round(scrollPos / slideWidth);

      this.dots.forEach(d => d.classList.remove('active'));
      if (this.dots[index]) this.dots[index].classList.add('active');
    }, { passive: true });
  }

  initLightbox() {
    if (!this.lightbox) return;

    // Open lightbox
    this.slides.forEach(slide => {
      const img = slide.querySelector('img');
      if (!img) return;
      
      img.addEventListener('click', () => {
        this.openLightbox(img.src);
      });
    });

    // Close lightbox
    this.lightboxClose.addEventListener('click', () => this.closeLightbox());
    // Also close on hitting Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.lightbox.classList.contains('active')) {
        this.closeLightbox();
      }
    });

    // Zoom Slider
    this.lightboxSlider.addEventListener('input', (e) => {
      this.scale = parseFloat(e.target.value);
      this.applyTransform();
    });

    // Pannable events
    this.lightboxContent.addEventListener('mousedown', (e) => this.startDrag(e));
    window.addEventListener('mousemove', (e) => this.drag(e));
    window.addEventListener('mouseup', () => this.endDrag());

    // Touch support for panning
    this.lightboxContent.addEventListener('touchstart', (e) => this.startDrag(e.touches[0]), {passive: false});
    window.addEventListener('touchmove', (e) => {
      if(this.isDragging) e.preventDefault(); // Prevent page scrolling
      this.drag(e.touches[0]);
    }, {passive: false});
    window.addEventListener('touchend', () => this.endDrag());
  }

  openLightbox(src) {
    this.lightboxImg.src = src;
    this.lightbox.classList.add('active');
    
    // Reset pan/zoom state
    this.scale = 1;
    this.panX = 0;
    this.panY = 0;
    this.lightboxSlider.value = 1;
    this.applyTransform();
  }

  closeLightbox() {
    this.lightbox.classList.remove('active');
  }

  startDrag(e) {
    if(this.scale <= 1) return; // Only drag when zoomed
    this.isDragging = true;
    this.startX = e.clientX - this.panX;
    this.startY = e.clientY - this.panY;
  }

  drag(e) {
    if (!this.isDragging) return;
    this.panX = e.clientX - this.startX;
    this.panY = e.clientY - this.startY;
    
    // Optional: add bounds checking here so they can't drag image completely out of view.
    // For now, simple free panning.
    
    this.applyTransform();
  }

  endDrag() {
    this.isDragging = false;
  }

  applyTransform() {
    this.lightboxImg.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
  }

  initVariantHandling() {
    const variantSelect = document.querySelector('.foxy-pdp__variant-select');
    if (!variantSelect) return;

    variantSelect.addEventListener('change', (e) => {
      const variantId = e.target.value;
      const option = e.target.options[e.target.selectedIndex];
      
      // Update Price if embedded in option datasets
      const priceElement = document.querySelector('.foxy-pdp__price');
      if (priceElement && option.dataset.price) {
        priceElement.innerHTML = option.dataset.price;
      }
      
      // Update hidden input
      const hiddenInput = document.querySelector('input[name="id"]');
      if (hiddenInput) {
        hiddenInput.value = variantId;
      }

      // Update URL without reload
      if (history.replaceState) {
        const url = new URL(window.location);
        url.searchParams.set('variant', variantId);
        window.history.replaceState({}, '', url.toString());
      }

      // Find matching image to slide to
      const slideIndex = parseInt(option.dataset.slideIndex);
      if (!isNaN(slideIndex) && this.slides[slideIndex]) {
        const slideWidth = this.slides[0].clientWidth;
        this.carousel.scrollTo({
          left: slideWidth * slideIndex,
          behavior: 'smooth'
        });
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
    new FoxyPDP();
});

// For Shopify theme editor context load
document.addEventListener('shopify:section:load', () => {
    new FoxyPDP();
});
