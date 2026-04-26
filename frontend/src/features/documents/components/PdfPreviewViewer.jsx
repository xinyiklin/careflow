import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import { Button } from "../../../shared/components/ui";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const MIN_ZOOM = 0.75;
const MAX_ZOOM = 1.75;
const ZOOM_STEP = 0.15;

export default function PdfPreviewViewer({ file, filename }) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [fitMode, setFitMode] = useState("comfortable");
  const [zoom, setZoom] = useState(1);
  const [viewerWidth, setViewerWidth] = useState(0);
  const scrollRef = useRef(null);
  const pageRefs = useRef([]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return undefined;

    const observer = new ResizeObserver(([entry]) => {
      setViewerWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setNumPages(0);
    setPageNumber(1);
    setFitMode("comfortable");
    setZoom(1);
    pageRefs.current = [];
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
      scrollRef.current.scrollLeft = 0;
    }
  }, [file]);

  const isFitToWidth = fitMode === "width";
  const availablePageWidth = Math.max(
    320,
    viewerWidth - (isFitToWidth ? 24 : 48)
  );
  const basePageWidth = isFitToWidth
    ? availablePageWidth
    : Math.min(availablePageWidth, 820);
  const pageWidth = Math.round(basePageWidth * zoom);

  const goToPage = (nextPage) => {
    const safePage = Math.min(Math.max(nextPage, 1), numPages || 1);
    setPageNumber(safePage);
    pageRefs.current[safePage - 1]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const changeZoom = (direction) => {
    setZoom((current) => {
      const next =
        direction === "in" ? current + ZOOM_STEP : current - ZOOM_STEP;
      return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(next.toFixed(2))));
    });
  };

  const toggleFitMode = () => {
    setFitMode((current) => (current === "width" ? "comfortable" : "width"));
    setZoom(1);
  };

  return (
    <div className="flex min-h-[600px] flex-1 flex-col overflow-hidden rounded-[1.2rem] border border-cf-border bg-cf-surface shadow-[var(--shadow-panel)]">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-cf-border bg-cf-surface px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-cf-text">
            {filename || "PDF preview"}
          </p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
            CareFlow PDF viewer
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            onClick={() => goToPage(pageNumber - 1)}
            disabled={pageNumber <= 1}
            aria-label="Previous PDF page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="rounded-full border border-cf-border bg-cf-surface-muted px-2.5 py-1 text-xs font-semibold text-cf-text-muted">
            {numPages ? `${pageNumber} / ${numPages}` : "Loading"}
          </span>
          <Button
            type="button"
            size="sm"
            onClick={() => goToPage(pageNumber + 1)}
            disabled={!numPages || pageNumber >= numPages}
            aria-label="Next PDF page"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <span className="mx-1 h-5 w-px bg-cf-border" />
          <Button
            type="button"
            size="sm"
            onClick={() => changeZoom("out")}
            disabled={zoom <= MIN_ZOOM}
            aria-label="Zoom PDF out"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="min-w-12 text-center text-xs font-semibold text-cf-text-muted">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            type="button"
            size="sm"
            onClick={() => changeZoom("in")}
            disabled={zoom >= MAX_ZOOM}
            aria-label="Zoom PDF in"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant={isFitToWidth ? "primary" : "default"}
            size="sm"
            shape="pill"
            onClick={toggleFitMode}
            aria-label={
              isFitToWidth
                ? "Return PDF to comfortable width"
                : "Expand PDF to viewer width"
            }
            title={
              isFitToWidth
                ? "Return to comfortable width"
                : "Expand to viewer width"
            }
          >
            {isFitToWidth ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
            <span className="hidden text-xs font-semibold xl:inline">
              {isFitToWidth ? "Comfort" : "Fill width"}
            </span>
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-auto bg-[color-mix(in_srgb,var(--color-cf-surface-muted)_76%,var(--color-cf-surface))] px-3 py-4"
      >
        <Document
          className="mx-auto flex w-max max-w-full flex-col items-center gap-5"
          file={file}
          loading={<PdfMessage>Rendering PDF...</PdfMessage>}
          error={<PdfMessage>Unable to render this PDF.</PdfMessage>}
          onLoadSuccess={({ numPages: loadedPages }) => {
            setNumPages(loadedPages);
            setPageNumber(1);
          }}
        >
          {Array.from(new Array(numPages), (_item, index) => (
            <div
              key={`page-${index + 1}`}
              ref={(node) => {
                pageRefs.current[index] = node;
              }}
              className="bg-white shadow-[0_18px_45px_rgba(15,23,42,0.14)]"
            >
              <Page
                pageNumber={index + 1}
                width={pageWidth}
                loading={<PdfMessage>Loading page {index + 1}...</PdfMessage>}
              />
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
}

function PdfMessage({ children }) {
  return (
    <div className="flex min-h-72 min-w-72 items-center justify-center rounded-xl border border-dashed border-cf-border bg-cf-surface text-sm font-semibold text-cf-text-muted">
      {children}
    </div>
  );
}
