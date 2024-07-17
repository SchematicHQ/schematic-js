import { createGlobalStyle, css } from "styled-components";

export const GlobalStyle = createGlobalStyle<{ fonts?: string[] }>`
  ${({ fonts = [] }) => {
    return (
      fonts.length > 0 &&
      css`
        @import url("https://fonts.googleapis.com/css2?${fonts
          .map((font) => `family=${font}:wght@200..800&display=swap`)
          .join("&")}");
      `
    );
  }}
`;
