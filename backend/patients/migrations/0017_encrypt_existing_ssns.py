"""Data migration: encrypt existing plaintext SSN values in-place."""

from django.db import migrations


def encrypt_existing_ssns(apps, schema_editor):
    from cryptography.fernet import InvalidToken

    from shared.fields import _get_fernet

    fernet = _get_fernet()
    connection = schema_editor.connection
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT id, ssn FROM patients_patient "
            "WHERE ssn IS NOT NULL AND ssn != ''"
        )
        for row_id, raw_ssn in cursor.fetchall():
            try:
                fernet.decrypt(raw_ssn.encode())
                continue
            except InvalidToken:
                # Row is plaintext (not yet encrypted); fall through to encrypt.
                pass
            encrypted = fernet.encrypt(raw_ssn.encode()).decode()
            cursor.execute(
                "UPDATE patients_patient SET ssn = %s WHERE id = %s",
                [encrypted, row_id],
            )


class Migration(migrations.Migration):
    dependencies = [
        ("patients", "0016_encrypt_ssn_at_rest"),
    ]

    operations = [
        migrations.RunPython(encrypt_existing_ssns, migrations.RunPython.noop),
    ]
