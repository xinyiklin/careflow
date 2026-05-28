import { RotateCw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge, Button } from "../../../shared/ui";

type RefillRequestButtonProps = {
  hasPendingRequest: boolean;
  onClick: () => void;
};

export function RefillRequestButton({
  hasPendingRequest,
  onClick,
}: RefillRequestButtonProps) {
  const { t } = useTranslation();

  if (hasPendingRequest) {
    return (
      <Badge tone="warning">
        <RotateCw size={11} aria-hidden="true" className="mr-1" />
        {t("medications.refillRequested")}
      </Badge>
    );
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={onClick}
      leadingIcon={<RotateCw size={14} aria-hidden="true" />}
    >
      {t("medications.requestRefill")}
    </Button>
  );
}
