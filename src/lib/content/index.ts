// Every string the terminal prints comes from `public/cv/mario-dimodica-cv.pdf`: the PDF is
// the only content input, fetched and parsed in the browser by `src/lib/cv`. This module
// projects those sections into the shell's files, and nothing else.
export { buildContent } from "./tree";
