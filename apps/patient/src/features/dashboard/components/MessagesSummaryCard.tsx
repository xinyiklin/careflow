import { useNavigate } from "react-router-dom";
import { ArrowRight, MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button, Card, Skeleton } from "../../../shared/ui";

type MessagesSummaryCardProps = {
  unreadCount: number;
  loading?: boolean;
};

/**
 * Shared min-height so the loading / read / unread states all keep the
 * same outer card dimensions. Pairs visually with the medications card
 * in the dashboard's two-up grid.
 */
const SUMMARY_MIN_HEIGHT = "min-h-[168px]";

export function MessagesSummaryCard({
  unreadCount,
  loading = false,
}: MessagesSummaryCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const hasUnread = unreadCount > 0;

  if (loading) {
    return (
      <Card
        aria-busy="true"
        aria-live="polite"
        className={`${SUMMARY_MIN_HEIGHT} flex flex-col justify-between`}
      >
        <div className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-8 w-32 rounded-md" />
      </Card>
    );
  }

  return (
    <Card
      aria-labelledby="dashboard-messages-heading"
      className={`${SUMMARY_MIN_HEIGHT} flex flex-col justify-between`}
    >
      <div>
        <p
          id="dashboard-messages-heading"
          className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted"
        >
          <MessageSquare size={13} aria-hidden="true" />
          {t("dashboard.messagesHeading")}
        </p>
        <p
          className={`mt-3 text-2xl font-semibold tracking-tight ${
            hasUnread ? "text-accent" : "text-text"
          }`}
        >
          {hasUnread
            ? t("dashboard.messagesUnread", { count: unreadCount })
            : t("dashboard.messagesAllCaughtUp")}
        </p>
        {hasUnread ? (
          <p className="mt-1 text-sm text-text-muted">
            {t("dashboard.messagesUnreadHelp")}
          </p>
        ) : null}
      </div>

      <div className="mt-5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/messages")}
          trailingIcon={<ArrowRight size={14} aria-hidden="true" />}
        >
          {t("dashboard.openMessages")}
        </Button>
      </div>
    </Card>
  );
}
