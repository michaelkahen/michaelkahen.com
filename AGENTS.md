# Repository instructions

This is a static portfolio site. Edit the HTML, CSS, and JavaScript directly;
there is no build step.

## Resume updates

The public resume is `assets/documents/Michael_Kahen_Resume.pdf`. Browsers and
mobile PDF viewers can reopen an older copy when this file is replaced at the
same URL.

Whenever the PDF changes, update its `?v=` query parameter in `index.html` in
the same change. Use the resume update date as `YYYYMMDD`; append a revision
such as `-2` for another update on the same date. Never reuse a version value
for different PDF contents.

Keep all resume URLs consistent: the document card, View and Download links,
the structured-data `DigitalDocument.url`, and the displayed TARGET path.
Keep the actual PDF filename and the `download` attribute as
`Michael_Kahen_Resume.pdf`.

## Verification

Run `node --test tests/*.test.js` after site changes. For resume updates, also
check that every resume URL uses the new version and resolves to the PDF.
When verifying a deployed update, compare the live PDF with the local file;
an existing phone tab or PDF preview may still show an older copy.
