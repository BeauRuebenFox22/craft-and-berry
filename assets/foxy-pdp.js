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
    this.thumbnails = document.querySelectorAll('.foxy-lightbox__thumbnail');

    // Pan state
    this.scale = 1;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.initDeckSwipe();
    this.initLightbox();
    this.initVariantHandling();
  }

  initDeckSwipe() {
    if (this.slides.length <= 1) return;

    this.currentIndex = 0;
    this.deckIndicators = document.querySelectorAll('.foxy-pdp__deck-indicator');
    
    // Initialize deck layout on load
    this.updateDeck();

    // Re-evaluate on resize
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 900) {
        this.slides.forEach(s => { s.style = ''; }); // clear inline styles on desktop
      } else {
        this.updateDeck();
      }
    });

    // Touch event listeners for mobile swiping
    this.carousel.addEventListener('touchstart', (e) => {
      if (window.innerWidth >= 900) return;
      this.startX = e.touches[0].clientX;
      this.startY = e.touches[0].clientY;
      this.isSwiping = true;
      // Disable transition for snappy following of the finger
      this.slides[this.currentIndex].style.transition = 'none';
    }, {passive: true});

    this.carousel.addEventListener('touchmove', (e) => {
      if (window.innerWidth >= 900 || !this.isSwiping) return;
      const x = e.touches[0].clientX;
      const diffX = x - this.startX;
      // Pan and slightly rotate the active top card
      this.slides[this.currentIndex].style.transform = `translateX(${diffX}px) rotate(${diffX * 0.05}deg)`;
    }, {passive: true});

    this.carousel.addEventListener('touchend', (e) => {
      if (window.innerWidth >= 900 || !this.isSwiping) return;
      this.isSwiping = false;
      const diffX = e.changedTouches[0].clientX - this.startX;
      
      // Re-enable smooth transition for releasing action
      this.slides[this.currentIndex].style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.4s ease';

      if (Math.abs(diffX) > 80) { // Threshold met
        const direction = diffX > 0 ? 1 : -1;
        // Fly it off screen
        this.slides[this.currentIndex].style.transform = `translateX(${direction * 150}%) rotate(${direction * 15}deg)`;
        this.slides[this.currentIndex].style.opacity = '0';
        
        // Wait for flyoff, then rotate the index and update the deck underlying stack
        setTimeout(() => {
          this.currentIndex = (this.currentIndex + 1) % this.slides.length;
          this.updateDeck();
        }, 300);
      } else {
        // Snap back if threshold not met
        this.updateDeck();
      }
    });
  }

  updateDeck() {
    if (window.innerWidth >= 900) return;
    
    // Segmented Purple Bar update
    if (this.deckIndicators) {
      this.deckIndicators.forEach((ind, i) => {
        ind.classList.toggle('active', i === this.currentIndex);
      });
    }

    // Update cards stacking and opacity based on relative distance from current top
    this.slides.forEach((slide, i) => {
      slide.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.4s ease';
      
      let relativeIndex = i - this.currentIndex;
      if (relativeIndex < 0) relativeIndex += this.slides.length;
      
      slide.style.zIndex = this.slides.length - relativeIndex;
      
      if (relativeIndex === 0) {
        // Active top card
        slide.style.transform = 'translateY(0) scale(1)';
        slide.style.opacity = '1';
      } else if (relativeIndex === 1 || (this.slides.length === 2 && relativeIndex === 1)) {
        // Second card down
        slide.style.transform = 'translateY(15px) scale(0.95)';
        slide.style.opacity = '0.8';
      } else if (relativeIndex === 2) {
        // Third card down
        slide.style.transform = 'translateY(30px) scale(0.9)';
        slide.style.opacity = '0.6';
      } else {
        // Hidden underneath
        slide.style.opacity = '0';
        slide.style.transform = 'translateY(45px) scale(0.85)';
      }
    });
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

    // Thumbnails
    if (this.thumbnails) {
      this.thumbnails.forEach(thumb => {
        thumb.addEventListener('click', () => {
          const newSrc = thumb.getAttribute('data-full-src');
          this.lightboxImg.src = newSrc;
          this.thumbnails.forEach(t => t.classList.remove('active'));
          thumb.classList.add('active');
          // Reset pan/zoom state
          this.scale = 1;
          this.panX = 0;
          this.panY = 0;
          this.lightboxSlider.value = 1;
          this.applyTransform();
        });
      });
    }
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

    // Set active thumbnail if matching
    if (this.thumbnails) {
      this.thumbnails.forEach(t => {
        t.classList.remove('active');
        if (t.getAttribute('data-full-src') === src || t.src === src) {
          t.classList.add('active');
        }
      });
    }
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
    const giftCardChips = document.querySelectorAll('.foxy-chip--gift-card');

    if (!variantSelect && giftCardChips.length === 0) return;

    const updateVariantState = (variantId, price, available, slideIndex, targetChip) => {
      // 1. Update chip active states & ARIA
      if (giftCardChips.length > 0) {
        giftCardChips.forEach(chip => {
          const isSelected = targetChip ? (chip === targetChip) : (chip.dataset.variantId === String(variantId));
          chip.classList.toggle('active', isSelected);
          chip.setAttribute('aria-checked', isSelected ? 'true' : 'false');
        });
      }

      // 2. Update select element if present
      if (variantSelect && variantSelect.value !== String(variantId)) {
        variantSelect.value = variantId;
      }

      // 3. Update hidden form input(s)
      const formInputs = document.querySelectorAll('form[data-type="add-to-cart-form"] input[name="id"], input[name="id"]');
      formInputs.forEach(input => {
        input.value = variantId;
      });

      // 4. Update Price display
      const priceElement = document.querySelector('.foxy-pdp__price');
      if (priceElement && price) {
        const priceItem = priceElement.querySelector('.price-item') || priceElement;
        priceItem.innerHTML = price;
      }

      // 5. Update Wishlist button
      const wishlistBtn = document.querySelector('foxy-wishlist-button');
      if (wishlistBtn) {
        wishlistBtn.setAttribute('data-variant-id', variantId);
        if (price) wishlistBtn.setAttribute('data-price', price);
        if (wishlistBtn.productData) {
          wishlistBtn.productData.variant_id = String(variantId);
          if (price) wishlistBtn.productData.price = price;
        }
      }

      // 6. Update Add to Cart Button state
      const addBtn = document.querySelector('.foxy-pdp__btn--add');
      if (addBtn) {
        const isAvailable = available === true || available === 'true' || available === undefined;
        const labelText = isAvailable 
          ? ((window.variantStrings && window.variantStrings.addToCart) || 'Add to Cart')
          : ((window.variantStrings && window.variantStrings.soldOut) || 'Sold Out');

        if (isAvailable) {
          addBtn.removeAttribute('disabled');
          addBtn.removeAttribute('aria-disabled');
        } else {
          addBtn.setAttribute('disabled', 'disabled');
          addBtn.setAttribute('aria-disabled', 'true');
        }

        const btnSpan = addBtn.querySelector('span');
        if (btnSpan) {
          btnSpan.textContent = labelText;
        } else {
          addBtn.textContent = labelText;
        }
      }

      // 7. Update URL search param without reload
      if (history.replaceState) {
        const url = new URL(window.location);
        url.searchParams.set('variant', variantId);
        window.history.replaceState({}, '', url.toString());
      }

      // 8. Update slide / image if variant has featured media
      if (slideIndex !== undefined && slideIndex !== null && slideIndex !== '') {
        const idx = parseInt(slideIndex, 10);
        if (!isNaN(idx) && this.slides && this.slides[idx]) {
          this.currentIndex = idx;
          if (window.innerWidth >= 900) {
            const slideWidth = this.slides[0].clientWidth;
            if (this.carousel) {
              this.carousel.scrollTo({
                left: slideWidth * idx,
                behavior: 'smooth'
              });
            }
          } else {
            this.updateDeck();
          }
        }
      }
    };

    // Attach click listeners to chips
    if (giftCardChips.length > 0) {
      giftCardChips.forEach(chip => {
        chip.addEventListener('click', (e) => {
          e.preventDefault();
          if (chip.classList.contains('disabled') || chip.hasAttribute('disabled')) return;
          const variantId = chip.dataset.variantId;
          const price = chip.dataset.price;
          const available = chip.dataset.available;
          const slideIndex = chip.dataset.slideIndex;
          updateVariantState(variantId, price, available, slideIndex, chip);
        });
      });
    }

    // Attach change listener to select dropdown
    if (variantSelect) {
      variantSelect.addEventListener('change', (e) => {
        const variantId = e.target.value;
        const option = e.target.options[e.target.selectedIndex];
        const price = option.dataset.price;
        const available = !option.disabled;
        const slideIndex = option.dataset.slideIndex;
        updateVariantState(variantId, price, available, slideIndex, null);
      });
    }

    // On load: check URL parameter ?variant=
    const urlParams = new URLSearchParams(window.location.search);
    const urlVariantId = urlParams.get('variant');
    if (urlVariantId) {
      const activeChip = Array.from(giftCardChips).find(c => c.dataset.variantId === urlVariantId);
      if (activeChip) {
        activeChip.click();
      } else if (variantSelect) {
        variantSelect.value = urlVariantId;
        variantSelect.dispatchEvent(new Event('change'));
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
    new FoxyPDP();
});

// For Shopify theme editor context load
document.addEventListener('shopify:section:load', () => {
    new FoxyPDP();
});
