if(!customElements.get('foxy-header')) {
  customElements.define('foxy-header', class extends HTMLElement {
    constructor() {
      super();
      this.burger = this.querySelector('.foxy-header__burger');
      this.isTransparent = this.dataset.transparent === 'true';
      
      if(this.burger) {
        this.burger.addEventListener('click', () => {
          const menuDrawer = document.querySelector('foxy-menu-drawer');
          if(menuDrawer) {
            menuDrawer.toggle();
          }
        });
      }

      if(this.isTransparent) {
        window.addEventListener('scroll', () => {
          if(window.scrollY > 50) {
            this.classList.add('is-scrolled');
          } else {
            this.classList.remove('is-scrolled');
          }
        });
      }
    }
  });
}