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
                "path": "/v1/facilities/manage/",
                "description": "List facilities for the current organization.",
            },
            {
                "method": "PATCH",
                "class": "patch",
                "path": "/v1/facilities/manage/<id>/",
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
                "description": "List organization-enabled pharmacies for the selected facility.",
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
                "path": "/v1/insurance/carriers/",
                "description": "List active insurance carriers.",
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
