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

type FitMode = "height" | "width";
type ZoomDirection = "in" | "out";

type PdfLayer = {
  file: string;
  filename?: string;
  key: number;
  pageHeight: number | null;
  pageWidth: number | null;
};

type PdfViewSettings = {
  fitMode: FitMode;
  zoom: number;
};

type PdfPreviewViewerProps = {
  file: string;
  filename?: string;
  showDocumentHeader?: boolean;
  flush?: boolean;
};

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const MIN_ZOOM = 0.75;
const MAX_ZOOM = 1.75;
const ZOOM_STEP = 0.15;
const PDF_VIEWER_VERTICAL_GUTTER = 0;
const PDF_VIEWER_WIDTH_SETTLE_MS = 180;
let lastPdfViewSettings: PdfViewSettings = {
  fitMode: "height",
  zoom: 1,
};

export default function PdfPreviewViewer({
  file,
  filename,
  showDocumentHeader = true,
  flush = false,
}: PdfPreviewViewerProps) {
  const layerKeyRef = useRef(0);
  const [activeLayer, setActiveLayer] = useState(() =>
    createPdfLayer({
      file,
      filename,
      key: layerKeyRef.current,
      pageHeight: null,
      pageWidth: null,
    })
  );
  const [pendingLayer, setPendingLayer] = useState<PdfLayer | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pendingNumPages, setPendingNumPages] = useState(0);
  const [pendingRenderedPages, setPendingRenderedPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [fitMode, setFitMode] = useState<FitMode>(
    () => lastPdfViewSettings.fitMode
  );
  const [zoom, setZoom] = useState(() => lastPdfViewSettings.zoom);
  const [viewerHeight, setViewerHeight] = useState(0);
  const [viewerWidth, setViewerWidth] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const widthSettleTimerRef = useRef<number | null>(null);
  const pendingViewerWidthRef = useRef(0);
  const hasMeasuredWidthRef = useRef(false);
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

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return undefined;

    const observer = new ResizeObserver(([entry]) => {
      const nextHeight = Math.round(entry.contentRect.height);
      const nextWidth = Math.round(entry.contentRect.width);
      setViewerHeight(nextHeight);

      pendingViewerWidthRef.current = nextWidth;
      if (!hasMeasuredWidthRef.current) {
        hasMeasuredWidthRef.current = true;
        setViewerWidth(nextWidth);
        return;
      }

      if (widthSettleTimerRef.current) {
        window.clearTimeout(widthSettleTimerRef.current);
      }
      // Sidebar expand/collapse animates width; wait for it to settle before
      // asking react-pdf to repaint the filled-width canvas.
      widthSettleTimerRef.current = window.setTimeout(() => {
        setViewerWidth(pendingViewerWidthRef.current);
        widthSettleTimerRef.current = null;
      }, PDF_VIEWER_WIDTH_SETTLE_MS);
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      if (widthSettleTimerRef.current) {
        window.clearTimeout(widthSettleTimerRef.current);
        widthSettleTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const activeLayerMatches =
      file === activeLayer.file &&
      filename === activeLayer.filename &&
      pageHeight === activeLayer.pageHeight &&
      pageWidth === activeLayer.pageWidth;
    const pendingLayerMatches =
      file === pendingLayer?.file &&
      filename === pendingLayer?.filename &&
      pageHeight === pendingLayer?.pageHeight &&
      pageWidth === pendingLayer?.pageWidth;

    if (activeLayerMatches) {
      if (pendingLayer && !pendingLayerMatches) {
        setPendingLayer(null);
        setPendingNumPages(0);
        setPendingRenderedPages(0);
      }
      return;
    }
    if (pendingLayerMatches) return;

    layerKeyRef.current += 1;
    setPendingLayer(
      createPdfLayer({
        file,
        filename,
        key: layerKeyRef.current,
        pageHeight,
        pageWidth,
      })
    );
    setPendingNumPages(0);
    setPendingRenderedPages(0);
  }, [
    activeLayer.file,
    activeLayer.filename,
    activeLayer.pageHeight,
    activeLayer.pageWidth,
    file,
    filename,
    pageHeight,
    pageWidth,
    pendingLayer,
    pendingLayer?.file,
    pendingLayer?.filename,
    pendingLayer?.pageHeight,
    pendingLayer?.pageWidth,
  ]);

  useEffect(() => {
    pageRefs.current = [];
  }, [activeLayer.key]);

  useEffect(() => {
    lastPdfViewSettings = { fitMode, zoom };
  }, [fitMode, zoom]);

  useEffect(() => {
    setPageNumber(1);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
      scrollRef.current.scrollLeft = 0;
    }
  }, [activeLayer.file]);

  useEffect(() => {
    if (!pendingLayer || pendingNumPages === 0) return;
    if (pendingRenderedPages < pendingNumPages) return;

    setActiveLayer(pendingLayer);
    setNumPages(pendingNumPages);
    setPendingLayer(null);
    setPendingNumPages(0);
    setPendingRenderedPages(0);
  }, [pendingLayer, pendingNumPages, pendingRenderedPages]);

  const goToPage = (nextPage: number) => {
    const safePage = Math.min(Math.max(nextPage, 1), numPages || 1);
    setPageNumber(safePage);
    pageRefs.current[safePage - 1]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const changeZoom = (direction: ZoomDirection) => {
    setZoom((current) => {
      const next =
        direction === "in" ? current + ZOOM_STEP : current - ZOOM_STEP;
      return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(next.toFixed(2))));
    });
  };

  const applyFitMode = (nextMode: FitMode) => {
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
          "flex shrink-0 flex-col border-b border-cf-border bg-cf-surface px-3 py-2",
          showDocumentHeader ? "gap-2" : "items-end",
        ].join(" ")}
      >
        {showDocumentHeader ? (
          <p className="w-full min-w-0 truncate text-sm font-semibold text-cf-text">
            {activeLayer.filename || "PDF preview"}
          </p>
        ) : null}

        <div className="flex w-full flex-wrap items-center justify-start gap-1.5">
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
            {numPages ? `${pageNumber} / ${numPages}` : "- / -"}
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
        {[activeLayer, pendingLayer]
          .filter((layer): layer is PdfLayer => Boolean(layer))
          .map((layer) => {
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
                  pageHeight={layer.pageHeight}
                  pageRefs={isActive ? pageRefs : null}
                  pageWidth={layer.pageWidth}
                  onLoadSuccess={({
                    numPages: loadedPages,
                  }: {
                    numPages: number;
                  }) => {
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

function createPdfLayer({
  file,
  filename,
  key,
  pageHeight,
  pageWidth,
}: PdfLayer): PdfLayer {
  return {
    file,
    filename,
    key,
    pageHeight,
    pageWidth,
  };
}
