export const resetStyleContent = `
  p {
    margin: 0;
    padding: 0;
    word-wrap: break-word; /* Required for Firefox */
    /* a text may have several spaces, we need to preserve them */
    white-space: pre-wrap;
  }

  /* Reset default list styles and setup counters */
  ul, ol {
    list-style: none; /* Remove default markers */
    padding-inline-start: 0; /* Reset padding */
    margin: 0;
    display: block; /* Use block instead of inline-block for better text wrapping */
    width: 100%;
    text-decoration: inherit;
    counter-reset: ol-counter; /* Initialize counter for ol */
  }

  li {
    position: relative; /* Needed for absolute positioning of ::before */
    padding-inline-start: 2.1em; /* Space for the marker (start side) */
    margin: 0; /* Reset default li margins */
    word-wrap: break-word; /* Required for Firefox text wrapping */
    white-space: pre-wrap; /* Preserve spaces and allow wrapping */
  }

  li::before {
    content: ''; /* Base content */
    position: absolute;
    /* Use logical properties for positioning */
    inset-inline-start: 0; /* Position marker at the start edge (left in LTR, right in RTL) */
    top: 0; /* Adjust vertical alignment */
    /* Prevent letter-spacing from affecting the marker */
    letter-spacing: normal;
    /* Define width to ensure consistent spacing and alignment */
    display: inline-block;
    width: 2em; /* Width for the marker container */
    /* Align multi-digit numbers to the end (right in LTR, left in RTL) */
    text-align: end;
    /* Space between marker and text (using logical property) */
    margin-inline-end: 0.8em; /* Pushes text away from marker (2.5em total = 1.7em width + 0.8em margin)*/
    /* Prevent marker style from inheriting list item styles */
    font-weight: normal;
    font-style: normal;
  }

  /* Style for bullet points */
  ul > li::before {
    content: '•'; /* Literal bullet character */
    /* Center the bullet within its allocated width */
    text-align: center; /* Override text-align: end for bullets */
    font-size: 1.2em;
    top: 0em; /* Re-adjust vertical alignment for bullet */
    /* Bullets don't need number alignment, width can be tighter */
    width: 2em;
    /* Adjust margin to maintain overall padding */
    margin-inline-end: 1.5em; /* 2.5em total padding = 1em width + 1.5em margin */
  }

  /* Style for numbers using counter */
  ol > li {
    counter-increment: ol-counter; /* Increment counter for each li in ol */
  }

  ol > li::before {
    content: counter(ol-counter) "."; /* Display counter value + dot */
  }

  .ql-indent-1 {
    margin-inline-start: 0.5em;
  }
  .ql-indent-2 {
    margin-inline-start: 1em;
  }
  .ql-indent-3 {
    margin-inline-start: 1.5em;
  }
`;

export const resetStyle = `
<style>
  html, body {
    padding: 0;
    margin: 0;
  }
  ${resetStyleContent}
</style>
`;
