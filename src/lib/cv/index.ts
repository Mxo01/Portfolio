/**
 * The CV, read at runtime from `public/cv/`. The PDF is the only content input:
 * `loadCv` fetches it, caches the parsed sections by validator, and `parseCv` is
 * the layout contract that turns the document into sections. Nothing here is
 * generated, nothing is committed, and updating the site means replacing the PDF.
 */
export { CvParseError, parseCv } from "./parse";
export type { CvInput, CvSection, LinkAnnotation, TextItem } from "./parse";
export { loadCv } from "./load";
export type { CvLoadRequest, CvLoadResult } from "./load";
