API_ENDPOINT_SECTIONS = [
    {
        "title": "Authentication",
        "summary": "Token, session, and user bootstrap endpoints.",
        "endpoints": [
            {
                "method": "POST",
                "class": "post",
                "path": "/v1/users/token/",
                "description": "Obtain JWT access and refresh tokens.",
            },
            {
                "method": "POST",
                "class": "post",
                "path": "/v1/users/token/refresh/",
                "description": "Refresh an access token.",
            },
            {
                "method": "POST",
                "class": "post",
                "path": "/v1/users/demo-login/",
                "description": "Log in with demo credentials when demo mode is enabled.",
            },
            {
                "method": "POST",
                "class": "post",
                "path": "/v1/users/register/",
                "description": "Register a new user.",
            },
            {
                "method": "GET",
                "class": "get",
                "path": "/v1/users/me/",
                "description": "Return the current user, organization membership, and facility context.",
            },
        ],
    },
    {
        "title": "Organizations",
        "summary": "Organization profile and people administration.",
        "endpoints": [
            {
                "method": "GET",
                "class": "get",
                "path": "/v1/organizations/",
                "description": "Return the current organization for the authenticated user.",
            },
            {
                "method": "GET",
                "class": "get",
                "path": "/v1/organizations/<id>/",
                "description": "Retrieve organization overview details, members, and summary data.",
            },
            {
                "method": "PATCH",
                "class": "patch",
                "path": "/v1/organizations/<id>/",
                "description": "Update organization contact and overview fields.",
            },
            {
                "method": "GET",
                "class": "get",
                "path": "/v1/organizations/people/",
                "description": "List organization people and roles.",
            },
            {
                "method": "POST",
                "class": "post",
                "path": "/v1/organizations/people/",
                "description": "Create a new organization-level user and membership.",
            },
            {
                "method": "PATCH",
                "class": "patch",
                "path": "/v1/organizations/people/<id>/",
                "description": "Update organization person details and membership role.",
            },
            {
                "method": "GET",
                "class": "get",
                "path": "/v1/organizations/pharmacies/",
                "description": "List organization pharmacy preferences linked to the global directory.",
            },
            {
                "method": "POST",
                "class": "post",
                "path": "/v1/organizations/pharmacies/",
                "description": "Link an existing pharmacy or import a custom pharmacy for the organization.",
            },
            {
                "method": "PATCH",
                "class": "patch",
                "path": "/v1/organizations/pharmacies/<id>/",
                "description": "Update organization pharmacy preference details.",
            },
        ],
    },
    {
        "title": "Facilities",
        "summary": "Facility profile, staff, and configuration dictionaries.",
        "endpoints": [
            {
                "method": "GET",
                "class": "get",
                "path": "/v1/facilities/",
                "description": "List facilities for the current organization.",
            },
            {
                "method": "PATCH",
                "class": "patch",
                "path": "/v1/facilities/<id>/",
                "description": "Update facility profile and operational details.",
            },
            {
                "method": "GET",
                "class": "get",
                "path": "/v1/facilities/staff/?facility_id=<id>",
                "description": "List facility staff assignments.",
            },
            {
                "method": "GET",
                "class": "get",
                "path": "/v1/facilities/appointment-statuses/?facility_id=<id>",
                "description": "List appointment statuses for a facility.",
            },
            {
                "method": "GET",
                "class": "get",
                "path": "/v1/facilities/appointment-types/?facility_id=<id>",
                "description": "List appointment types and scheduling defaults.",
            },
            {
                "method": "GET",
                "class": "get",
                "path": "/v1/facilities/staff-roles/?facility_id=<id>",
                "description": "List configurable staff roles.",
            },
            {
                "method": "GET",
                "class": "get",
                "path": "/v1/facilities/staff-titles/?facility_id=<id>",
                "description": "List staff titles.",
            },
            {
                "method": "GET",
                "class": "get",
                "path": "/v1/facilities/patient-genders/?facility_id=<id>",
                "description": "List patient gender options.",
            },
        ],
    },
    {
        "title": "Patients",
        "summary": "Patient records plus supporting clinical-contact data.",
        "endpoints": [
            {
                "method": "GET",
                "class": "get",
                "path": "/v1/patients/?facility_id=<id>&search=smith",
                "description": 'Quick patient lookup by last name or "Last, First".',
            },
            {
                "method": "POST",
                "class": "post",
                "path": "/v1/patients/?facility_id=<id>",
                "description": "Create a patient record in the selected facility.",
            },
            {
                "method": "PATCH",
                "class": "patch",
                "path": "/v1/patients/<id>/?facility_id=<id>",
                "description": "Update patient demographics, care team, and pharmacy details.",
            },
            {
                "method": "GET",
                "class": "get",
                "path": "/v1/patients/pharmacies/?facility_id=<id>",
                "description": "List facility-effective pharmacies from organization pharmacy settings and facility overrides.",
            },
            {
                "method": "GET",
                "class": "get",
                "path": "/v1/patients/providers/?facility_id=<id>",
                "description": "List PCP and referring provider records for the selected facility.",
            },
        ],
    },
    {
        "title": "Insurance",
        "summary": "Insurance carrier dictionary and patient coverage records.",
        "endpoints": [
            {
                "method": "GET",
                "class": "get",
                "path": "/v1/insurance/carriers/?facility_id=<id>",
                "description": "List facility-effective insurance carriers from organization payer settings and facility overrides.",
            },
            {
                "method": "GET",
                "class": "get",
                "path": "/v1/insurance/policies/?facility_id=<id>&patient_id=<id>",
                "description": "List patient insurance policies within the selected facility.",
            },
            {
                "method": "POST",
                "class": "post",
                "path": "/v1/insurance/policies/?facility_id=<id>",
                "description": "Create a patient insurance policy.",
            },
            {
                "method": "PATCH",
                "class": "patch",
                "path": "/v1/insurance/policies/<id>/?facility_id=<id>",
                "description": "Update patient insurance policy details.",
            },
        ],
    },
    {
        "title": "Appointments",
        "summary": "Scheduling, visit logistics, and appointment notes.",
        "endpoints": [
            {
                "method": "GET",
                "class": "get",
                "path": "/v1/appointments/?facility_id=<id>&date=2026-04-21",
                "description": "List appointments for a selected date.",
            },
            {
                "method": "POST",
                "class": "post",
                "path": "/v1/appointments/?facility_id=<id>",
                "description": "Create an appointment with visit mode, room, and instructions.",
            },
            {
                "method": "PATCH",
                "class": "patch",
                "path": "/v1/appointments/<id>/?facility_id=<id>",
                "description": "Update appointment schedule, status, and operational notes.",
            },
        ],
    },
    {
        "title": "Clinical",
        "summary": "Facility-scoped encounters and progress note charting.",
        "endpoints": [
            {
                "method": "GET",
                "class": "get",
                "path": "/v1/clinical/encounters/?facility_id=<id>&patient_id=<id>",
                "description": "List patient encounters and nested progress notes.",
            },
            {
                "method": "POST",
                "class": "post",
                "path": "/v1/clinical/encounters/?facility_id=<id>",
                "description": "Start a clinical encounter with an optional draft progress note.",
            },
            {
                "method": "PATCH",
                "class": "patch",
                "path": "/v1/clinical/progress-notes/<id>/?facility_id=<id>",
                "description": "Update a draft progress note.",
            },
            {
                "method": "POST",
                "class": "post",
                "path": "/v1/clinical/progress-notes/<id>/sign/?facility_id=<id>",
                "description": "Sign a progress note and lock it from further edits.",
            },
        ],
    },
    {
        "title": "Medications",
        "summary": "Facility-scoped patient medication records.",
        "endpoints": [
            {
                "method": "GET",
                "class": "get",
                "path": "/v1/medications/?facility_id=<id>&patient_id=<id>",
                "description": "List medication records for a patient.",
            },
            {
                "method": "POST",
                "class": "post",
                "path": "/v1/medications/?facility_id=<id>",
                "description": "Create a patient medication record.",
            },
            {
                "method": "PATCH",
                "class": "patch",
                "path": "/v1/medications/<id>/?facility_id=<id>",
                "description": "Update medication details, status, dates, and notes.",
            },
            {
                "method": "DELETE",
                "class": "delete",
                "path": "/v1/medications/<id>/?facility_id=<id>",
                "description": "Mark a medication as discontinued.",
            },
        ],
    },
    {
        "title": "Allergies",
        "summary": "Facility-scoped patient allergy and adverse reaction records.",
        "endpoints": [
            {
                "method": "GET",
                "class": "get",
                "path": "/v1/allergies/patient-allergies/?facility_id=<id>&patient_id=<id>",
                "description": "List allergy and adverse reaction records for a patient.",
            },
            {
                "method": "POST",
                "class": "post",
                "path": "/v1/allergies/patient-allergies/?facility_id=<id>",
                "description": "Create a patient allergy or adverse reaction record.",
            },
            {
                "method": "PATCH",
                "class": "patch",
                "path": "/v1/allergies/patient-allergies/<id>/?facility_id=<id>",
                "description": "Update allergy reaction, severity, status, onset, and notes.",
            },
            {
                "method": "DELETE",
                "class": "delete",
                "path": "/v1/allergies/patient-allergies/<id>/?facility_id=<id>",
                "description": "Mark an allergy record as entered in error.",
            },
        ],
    },
    {
        "title": "Billing",
        "summary": "Encounter-linked superbills and charge capture.",
        "endpoints": [
            {
                "method": "GET",
                "class": "get",
                "path": "/v1/billing/encounter-billing-records/?facility_id=<id>&patient_id=<id>",
                "description": "List patient superbills and charge-capture records.",
            },
            {
                "method": "POST",
                "class": "post",
                "path": "/v1/billing/encounter-billing-records/?facility_id=<id>",
                "description": "Create a billing record for a signed encounter.",
            },
            {
                "method": "PATCH",
                "class": "patch",
                "path": "/v1/billing/encounter-billing-records/<id>/?facility_id=<id>",
                "description": "Update diagnosis codes, charge lines, and billing status.",
            },
            {
                "method": "GET",
                "class": "get",
                "path": "/v1/billing/fee-schedule-items/?facility_id=<id>",
                "description": "List facility-effective fee schedule items merged from organization defaults and facility overrides.",
            },
            {
                "method": "GET",
                "class": "get",
                "path": "/v1/billing/cpt-catalog/",
                "description": "List predefined CPT codes with descriptions and suggested fees.",
            },
            {
                "method": "POST",
                "class": "post",
                "path": "/v1/billing/organization-fee-schedules/<id>/populate/",
                "description": "Populate a fee schedule sheet with all predefined CPT codes that are not already present.",
            },
        ],
    },
    {
        "title": "Audit",
        "summary": "Read-only audit trail for organization admins and facility-scoped facility admins.",
        "endpoints": [
            {
                "method": "GET",
                "class": "get",
                "path": "/v1/audit/events/",
                "description": "List audit events. Organization admins can use scope=organization for org-only activity; facility admins must filter to a facility they manage. Filterable by action, app_label, facility, patient, and scope.",
            },
            {
                "method": "GET",
                "class": "get",
                "path": "/v1/audit/events/<id>/",
                "description": "Retrieve a single audit event.",
            },
        ],
    },
    {
        "title": "System",
        "summary": "Health and operational entrypoints.",
        "endpoints": [
            {
                "method": "GET",
                "class": "get",
                "path": "/health/",
                "description": "Basic health check endpoint.",
            },
            {
                "method": "GET",
                "class": "get",
                "path": "/admin/",
                "description": "Django admin console.",
            },
        ],
    },
]
