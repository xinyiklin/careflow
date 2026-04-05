export function generateTimeSlots(intervalMinutes = 15) {
    const slots = [];
    const totalMinutes = 24 * 60;

    for (let minutes = 0; minutes < totalMinutes; minutes += intervalMinutes) {
        const hour = Math.floor(minutes / 60);
        const mins = minutes % 60;

        const displayHour = hour % 12 === 0 ? 12 : hour % 12;
        const ampm = hour < 12 ? "AM" : "PM";

        slots.push({
            value: minutes,
            label: `${displayHour}:${String(mins).padStart(2, "0")} ${ampm}`,
        });
    }

    return slots;
}