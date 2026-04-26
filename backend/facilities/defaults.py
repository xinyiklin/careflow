DEFAULT_APPOINTMENT_STATUSES = [
    {"code": "pending", "name": "Pending", "color": "#fbbf24"},
    {"code": "check_in", "name": "Check In", "color": "#60a5fa"},
    {"code": "check_out", "name": "Check Out", "color": "#34d399"},
    {"code": "cancelled", "name": "Cancelled", "color": "#fb7185"},
    {"code": "no_show", "name": "No Show", "color": "#94a3b8"},
]

DEFAULT_APPOINTMENT_TYPES = [
    {"code": "new_patient", "name": "New Patient", "color": "#818cf8", "duration": 30},
    {"code": "follow_up", "name": "Follow Up", "color": "#93c5fd", "duration": 15},
    {"code": "annual", "name": "Annual", "color": "#86efac", "duration": 30},
    {"code": "consult", "name": "Consult", "color": "#7dd3fc", "duration": 20},
    {"code": "procedure", "name": "Procedure", "color": "#c084fc", "duration": 60},
    {"code": "urgent", "name": "Urgent", "color": "#fda4af", "duration": 10},
]

DEFAULT_ROLES = [
    {"code": "admin", "name": "Admin", "is_system_role": True},
    {"code": "physician", "name": "Physician", "is_system_role": True},
    {"code": "nurse", "name": "Nurse", "is_system_role": False},
    {"code": "staff", "name": "Staff", "is_system_role": False},
    {"code": "biller", "name": "Biller", "is_system_role": False},
]

DEFAULT_TITLES = [
    ("md", "MD"),
    ("do", "DO"),
    ("np", "NP"),
    ("pa", "PA"),
    ("rn", "RN"),
]

DEFAULT_PATIENT_GENDERS = [
    {"code": "male", "name": "Male", "sort_order": 1},
    {"code": "female", "name": "Female", "sort_order": 2},
    {"code": "other", "name": "Other", "sort_order": 3},
    {"code": "unknown", "name": "Unknown", "sort_order": 4},
]
