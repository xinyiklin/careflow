from django.db import models


class Address(models.Model):
    STATE_CHOICES = [
        ("NY", "New York"),
        ("CA", "California"),
        ("TX", "Texas"),
        ("FL", "Florida"),
        # Add more or all 50 later
    ]

    COUNTRY_CHOICES = [
        ("US", "United States"),
    ]

    line_1 = models.CharField(max_length=255)
    line_2 = models.CharField(max_length=255, blank=True)

    city = models.CharField(max_length=100)
    state = models.CharField(max_length=2, choices=STATE_CHOICES)
    zip_code = models.CharField(max_length=10)

    country = models.CharField(
        max_length=2,
        choices=COUNTRY_CHOICES,
        default="US",
    )

    class Meta:
        verbose_name_plural = "Addresses"

    def clean(self):
        # Basic normalization
        if self.zip_code:
            self.zip_code = self.zip_code.strip()

        if self.city:
            self.city = self.city.strip()

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        unit = f" {self.line_2}" if self.line_2 else ""
        return f"{self.line_1}{unit}, {self.city}, {self.state} {self.zip_code}"
