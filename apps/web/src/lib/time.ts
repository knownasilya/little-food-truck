/** "14:00" -> "2:00 PM". Schedule times are stored as 24-hour "HH:MM" strings; this is display-only. */
export function formatTime12h(hhmm: string): string {
	const [h, m] = hhmm.split(':').map(Number);
	const period = h < 12 ? 'AM' : 'PM';
	const h12 = h % 12 === 0 ? 12 : h % 12;
	return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

// Used only if the browser doesn't support Intl.supportedValuesOf — covers
// the common US zones this app's demo data lives in, plus UTC.
const FALLBACK_TIMEZONES = [
	'America/New_York',
	'America/Chicago',
	'America/Denver',
	'America/Phoenix',
	'America/Los_Angeles',
	'America/Anchorage',
	'Pacific/Honolulu',
	'UTC'
];

export function listTimezones(): string[] {
	try {
		return Intl.supportedValuesOf('timeZone');
	} catch {
		return FALLBACK_TIMEZONES;
	}
}
