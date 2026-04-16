'use client';

// Theme tokens are injected via globals.css in the host app (Next.js).
// Use glob() here for global CSS overrides that must ship with the editor.
import { glob } from './goober';

glob`
  .bp5-popover {
    overflow: visible !important;
  }
`;
