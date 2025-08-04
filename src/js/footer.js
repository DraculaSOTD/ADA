class CopyrightFooter extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          text-align: center;
          padding: 20px;
          background-color: #f1f1f1;
          position: fixed;
          bottom: 0;
          width: 100%;
        }
      </style>
      <p>Copyright  2024 Your Company. All rights reserved.</p>
    `;
  }
}

customElements.define('copyright-footer', CopyrightFooter);
