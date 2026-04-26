from audit.models import AuditEvent


def get_actor_display_name(user):
    if not user:
        return "Unknown user"
    return user.get_full_name() or user.get_username() or "Unknown user"


def record_audit_event(
    *,
    actor,
    action,
    app_label,
    summary,
    facility=None,
    patient=None,
    model_name="",
    object_pk="",
    metadata=None,
):
    event_metadata = {
        "actor_name": get_actor_display_name(actor),
        **(metadata or {}),
    }
    return AuditEvent.objects.create(
        actor=actor,
        facility=facility,
        patient=patient,
        action=action,
        app_label=app_label,
        model_name=model_name,
        object_pk=str(object_pk or ""),
        summary=summary,
        metadata=event_metadata,
    )
