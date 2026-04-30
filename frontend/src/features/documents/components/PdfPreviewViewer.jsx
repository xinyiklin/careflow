import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
} from "lucide-react";
import { pdfjs } from "react-pdf";

import { Button } from "../../../shared/components/ui";
import PdfPreviewDocument from "./PdfPreviewDocument";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const MIN_ZOOM = 0.75;
const MAX_ZOOM = 1.75;
const ZOOM_STEP = 0.15;
const PDF_VIEWER_VERTICAL_GUTTER = 0;

export default function PdfPreviewViewer({
  file,
  filename,
  showDocumentHeader = true,
  flush = false,
}) {
  const layerKeyRef = useRef(0);
  const [activeLayer, setActiveLayer] = useState(() =>
    createPdfLayer({ file, filename, key: layerKeyRef.current })
  );
  const [pendingLayer, setPendingLayer] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [pendingNumPages, setPendingNumPages] = useState(0);
  const [pendingRenderedPages, setPendingRenderedPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [fitMode, setFitMode] = useState("height");
  const [zoom, setZoom] = useState(1);
  const [viewerHeight, setViewerHeight] = useState(0);
  const [viewerWidth, setViewerWidth] = useState(0);
  const scrollRef = useRef(null);
  const pageRefs = useRef([]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return undefined;

    const observer = new ResizeObserver(([entry]) => {
      setViewerHeight(entry.contentRect.height);
      setViewerWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (file === activeLayer.file || file === pendingLayer?.file) return;

    layerKeyRef.current += 1;
    setPendingLayer(
      createPdfLayer({ file, filename, key: layerKeyRef.current })
    );
    setPendingNumPages(0);
    setPendingRenderedPages(0);
  }, [activeLayer.file, file, filename, pendingLayer?.file]);

  useEffect(() => {
    setPageNumber(1);
    setFitMode("height");
    setZoom(1);
    pageRefs.current = [];
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
      scrollRef.current.scrollLeft = 0;
    }
  }, [activeLayer.key]);

  useEffect(() => {
    if (!pendingLayer || pendingNumPages === 0) return;
    if (pendingRenderedPages < pendingNumPages) return;

    setActiveLayer(pendingLayer);
    setNumPages(pendingNumPages);
    setPendingLayer(null);
    setPendingNumPages(0);
    setPendingRenderedPages(0);
  }, [pendingLayer, pendingNumPages, pendingRenderedPages]);

  const isFitToWidth = fitMode === "width";
  const isFitToHeight = fitMode === "height";
  const availablePageWidth = Math.max(
    320,
    viewerWidth - (isFitToWidth ? 24 : 48)
  );
  const availablePageHeight = Math.max(
    320,
    viewerHeight - PDF_VIEWER_VERTICAL_GUTTER
  );
  const basePageWidth = isFitToWidth
    ? availablePageWidth
    : Math.min(availablePageWidth, 820);
  const pageHeight =
    isFitToHeight && viewerHeight > 0
      ? Math.round(availablePageHeight * zoom)
      : null;
  const pageWidth = pageHeight ? null : Math.round(basePageWidth * zoom);

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

  const applyFitMode = (nextMode) => {
    setFitMode(nextMode);
    setZoom(1);
  };

  return (
    <div
      className={[
        "flex h-full min-h-[420px] flex-1 flex-col overflow-hidden bg-cf-surface",
        flush
          ? ""
          : "rounded-2xl border border-cf-border shadow-[var(--shadow-panel)]",
      ].join(" ")}
    >
      <div
        className={[
          "flex shrink-0 flex-wrap items-center gap-2 border-b border-cf-border bg-cf-surface px-3 py-2",
          showDocumentHeader ? "justify-between" : "justify-end",
        ].join(" ")}
      >
        {showDocumentHeader ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-cf-text">
              {activeLayer.filename || "PDF preview"}
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
              CareFlow PDF viewer
            </p>
          </div>
        ) : null}

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
            {numPages ? `${pageNumber} / ${numPages}` : "— / —"}
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
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant={isFitToHeight ? "primary" : "default"}
              size="sm"
              shape="pill"
              className="w-9 xl:w-28"
              onClick={() => applyFitMode("height")}
              aria-pressed={isFitToHeight}
              aria-label="Fit PDF to viewer height"
              title="Fit PDF to viewer height"
            >
              <Minimize2 className="h-3.5 w-3.5" />
              <span className="hidden text-xs font-semibold xl:inline">
                Fit height
              </span>
            </Button>
            <Button
              type="button"
              variant={isFitToWidth ? "primary" : "default"}
              size="sm"
              shape="pill"
              className="w-9 xl:w-28"
              onClick={() => applyFitMode("width")}
              aria-pressed={isFitToWidth}
              aria-label="Fill PDF to viewer width"
              title="Fill PDF to viewer width"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="hidden text-xs font-semibold xl:inline">
                Fill width
              </span>
            </Button>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="relative min-h-0 flex-1 overflow-auto bg-[color-mix(in_srgb,var(--color-cf-surface-muted)_76%,var(--color-cf-surface))] px-3 py-4"
      >
        {[activeLayer, pendingLayer].filter(Boolean).map((layer) => {
          const isActive = layer.key === activeLayer.key;
          const layerNumPages = isActive ? numPages : pendingNumPages;

          return (
            <div
              key={layer.key}
              className={
                isActive
                  ? ""
                  : "pointer-events-none absolute top-4 left-3 opacity-0"
              }
              aria-hidden={!isActive}
            >
              <PdfPreviewDocument
                file={layer.file}
                numPages={layerNumPages}
                pageHeight={pageHeight}
                pageRefs={isActive ? pageRefs : null}
                pageWidth={pageWidth}
                onLoadSuccess={({ numPages: loadedPages }) => {
                  if (isActive) {
                    setNumPages(loadedPages);
                    setPageNumber(1);
                    return;
                  }

                  setPendingNumPages(loadedPages);
                  setPendingRenderedPages(0);
                }}
                onPageRenderSuccess={
                  isActive
                    ? undefined
                    : () => {
                        setPendingRenderedPages((current) => current + 1);
                      }
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function createPdfLayer({ file, filename, key }) {
  return {
    file,
    filename,
    key,
  };
}
