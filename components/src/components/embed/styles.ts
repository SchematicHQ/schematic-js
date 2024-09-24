import styled from "styled-components";

customElements.define(
  "host-container",
  class extends HTMLElement {
    constructor() {
      super();
    }

    connectedCallback() {
      this.attachShadow({ mode: "open" });
    }
  },
);

export const HostContainer = styled.div.attrs({ is: "host-container" })`
  :host {
    all: initial;
  }

  :host * {
    all: initial;
  }
`;
