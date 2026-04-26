import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { AlertCircle, FileText, Loader2 } from "lucide-react";

import { Button } from "../../../shared/components/ui";
import { getErrorMessage } from "../../../shared/utils/errors";
import { getPatientDocumentPreview } from "../api/documents";

const PdfPreviewViewer = lazy(() => import("./PdfPreviewViewer"));

function getExtension(filename = "") {
  const match = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] || "";
}

function getPreviewKind({ contentType = "", filename = "" }) {
  const normalizedType = contentType.split(";")[0].trim().toLowerCase();
  const extension = getExtension(filename);

  if (normalizedType === "application/pdf" || extension === "pdf") return "pdf";
  if (
    [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/gif",
      "image/webp",
    ].includes(normalizedType) ||
    ["png", "jpg", "jpeg", "gif", "webp"].includes(extension)
  ) {
    return "image";
  }
  if (normalizedType === "image/tiff" || ["tif", "tiff"].includes(extension)) {
    return "unsupported-tiff";
  }

  return "unsupported";
}

export default function DocumentPreviewPane({
  document,
  facilityId,
  onDownload,
}) {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    let isCancelled = false;
    let objectUrl = "";

    setPreview(null);
    setError("");

    if (!document) {
      setStatus("idle");
      return undefined;
    }

    if (!facilityId && !document.url) {
      setStatus("error");
      setError("Select a facility before previewing this document.");
      return undefined;
    }

    async function loadPreview() {
      setStatus("loading");

      try {
        const result = await getPatientDocumentPreview({
          facilityId,
          document,
        });
        if (isCancelled) return;

        objectUrl = result.blob ? URL.createObjectURL(result.blob) : "";
        setPreview({
          contentType: result.contentType || "",
          filename: result.filename || document.name,
          isExternal: result.isExternal,
          url: objectUrl || result.url,
        });
        setStatus("ready");
      } catch (loadError) {
        if (isCancelled) return;
        setError(
          getErrorMessage(loadError, "Failed to load document preview.")
        );
        setStatus("error");
      }
    }

    loadPreview();

    return () => {
      isCancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [document, facilityId]);

  const previewKind = useMemo(
    () =>
      preview
        ? getPreviewKind({
            contentType: preview.contentType,
            filename: preview.filename,
          })
        : "unsupported",
    [preview]
  );

  if (!document) {
    return <NoDocumentPreview />;
  }

  if (status === "loading") {
    return (
      <PreviewShell>
        <EmptyPreview
          icon={<Loader2 className="h-6 w-6 animate-spin" />}
          title="Loading preview"
          message={document.name}
        />
      </PreviewShell>
    );
  }

  if (status === "error") {
    return (
      <PreviewShell>
        <EmptyPreview
          icon={<AlertCircle className="h-6 w-6" />}
          title="Preview unavailable"
          message={error}
        />
      </PreviewShell>
    );
  }

  if (!preview?.url) {
    return (
      <PreviewShell>
        <EmptyPreview
          icon={<FileText className="h-6 w-6" />}
          title="Preview unavailable"
          message="This document could not be loaded for inline viewing."
        />
      </PreviewShell>
    );
  }

  if (previewKind === "pdf") {
    return (
      <Suspense
        fallback={
          <PreviewShell>
            <EmptyPreview
              icon={<Loader2 className="h-6 w-6 animate-spin" />}
              title="Loading PDF viewer"
              message={preview.filename || document.name}
            />
          </PreviewShell>
        }
      >
        <PdfPreviewViewer file={preview.url} filename={preview.filename} />
      </Suspense>
    );
  }

  if (previewKind === "image") {
    return (
      <PreviewShell>
        <img
          alt={`Preview of ${document.name}`}
          className="h-full w-full rounded-[1.15rem] object-contain"
          src={preview.url}
        />
      </PreviewShell>
    );
  }

  return (
    <PreviewShell>
      <EmptyPreview
        icon={<FileText className="h-6 w-6" />}
        title={
          previewKind === "unsupported-tiff"
            ? "TIFF preview needs conversion"
            : "Preview not supported"
        }
        message="Download the file to view this format outside CareFlow."
      >
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button size="sm" onClick={() => onDownload?.(document)}>
            Download
          </Button>
        </div>
      </EmptyPreview>
    </PreviewShell>
  );
}

function PreviewShell({ children }) {
  return (
    <div className="flex min-h-0 flex-1 rounded-[1.35rem] border border-cf-border bg-gradient-to-b from-cf-surface-soft to-cf-surface p-3 shadow-[var(--shadow-panel)]">
      <div className="min-h-[600px] flex-1 overflow-hidden rounded-[1.2rem] border border-cf-border bg-cf-surface shadow-inner">
        {children}
      </div>
    </div>
  );
}

function NoDocumentPreview() {
  return (
    <div className="flex min-h-[600px] flex-1 flex-col overflow-hidden rounded-[1.2rem] border border-cf-border bg-cf-surface shadow-[var(--shadow-panel)]">
      <div className="flex shrink-0 items-center justify-between border-b border-cf-border bg-cf-surface px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-cf-text">
            No document selected
          </p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
            CareFlow viewer
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center bg-[color-mix(in_srgb,var(--color-cf-surface-muted)_76%,var(--color-cf-surface))] px-5 text-center">
        <div>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cf-border bg-cf-surface text-cf-text-subtle">
            <FileText className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm font-semibold text-cf-text">
            No document selected
          </p>
          <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-cf-text-muted">
            Choose a document to preview it here.
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyPreview({ icon, title, message, children }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-5 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cf-border bg-cf-surface-soft text-cf-text-subtle">
        {icon}
      </div>
      <p className="mt-3 text-sm font-semibold text-cf-text">{title}</p>
      <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-cf-text-muted">
        {message}
      </p>
      {children}
    </div>
  );
}
