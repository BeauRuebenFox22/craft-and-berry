(() => {
  
  function parseBool(val) {
    if(typeof val === 'boolean') return val;
		if(typeof val === 'string') return val === 'true' || val === '1';
    return !!val;
	};

	function parseDateList(csv) {
    if(!csv || typeof csv !== 'string') return [];
    return csv
      .split(/[,\n]/)
			.map((s) => s.trim())
			.filter(Boolean)
			.map((iso) => {
				const d = new Date(iso + 'T00:00:00');
				return isNaN(d.getTime()) ? null : d;
			})
			.filter(Boolean);
	};

	function holidayDateForYear(id, year) {
		switch(id) {
			case 'christmas_eve':
				return new Date(year, 11, 24);
			case 'christmas_day':
				return new Date(year, 11, 25);
			case 'boxing_day':
				return new Date(year, 11, 26);
			case 'new_years_eve':
				return new Date(year, 11, 31);
			case 'new_years_day':
				return new Date(year, 0, 1);
			default:
				return null;
		};
	};

	function weekdayName(date) {
		return date.toLocaleDateString('en-GB', { weekday: 'long' });
	};

	function buildClosureWeekdays(section) {
		const ds = section.dataset;
		const now = new Date();
		const year = now.getFullYear();
		const holidays = [
			{ id: 'christmas_eve', enabled: parseBool(ds.christmasEve) },
			{ id: 'christmas_day', enabled: parseBool(ds.christmasDay) },
			{ id: 'boxing_day', enabled: parseBool(ds.boxingDay) },
			{ id: 'new_years_eve', enabled: parseBool(ds.newYearsEve) },
			{ id: 'new_years_day', enabled: parseBool(ds.newYearsDay) },
		];

		const dates = [];
		holidays.forEach(({ id, enabled }) => {
			if (!enabled) return;
			const d = holidayDateForYear(id, year);
			if (d) dates.push({ date: d, label: id.replace(/_/g, ' ') });
		});

		const bankEnabled = parseBool(ds.bankHolidays);
		const bankDates = parseDateList(ds.bankHolidayDates);
		if(bankEnabled && bankDates.length) {
			bankDates.forEach((d) => dates.push({ date: d, label: 'bank holiday' }));
		};

		const map = new Map();
		dates.forEach(({ date, label }) => {
			const wk = weekdayName(date);
			const entry = map.get(wk) || { reasons: new Set(), dates: [] };
			entry.reasons.add(label);
			entry.dates.push(date);
			map.set(wk, entry);
		});
		return map;
	};

	function markRowsClosed(section, weekdayClosures) {
		const table = section.querySelector('.opening-times-table');
		if(!table) return;
		const rows = Array.from(table.querySelectorAll('tr')).slice(1);
		rows.forEach((tr) => {
			const dayCell = tr.querySelector('td:first-child');
			const openCell = tr.querySelector('td:nth-child(2)');
			const closeCell = tr.querySelector('td:nth-child(3)');
			if(!dayCell || !openCell || !closeCell) return;
			const dayName = dayCell.textContent.trim();
			const closureInfo = weekdayClosures.get(dayName);
			if(!closureInfo) return;
			tr.classList.add('closed');
			const reasons = Array.from(closureInfo.reasons).join(', ');
			if(!/^closed$/i.test(openCell.textContent.trim())) {
				openCell.textContent = 'Closed';
			};
			if(!/^closed$/i.test(closeCell.textContent.trim())) {
				closeCell.textContent = 'Closed';
			};
			tr.setAttribute('title', `Closed for: ${reasons}`);
		});
	};

	function renderExceptionsNote(section, weekdayClosures) {
		const noteEl = section.querySelector('.exceptions-note');
		if(!noteEl) return;
		const ds = section.dataset;
		const bankEnabled = parseBool(ds.bankHolidays);
		const bankDates = parseDateList(ds.bankHolidayDates);

		const parts = [];
		const fixedNames = ['christmas_eve', 'christmas_day', 'boxing_day', 'new_years_eve', 'new_years_day'];
		fixedNames.forEach((id) => {
			const key = id.replace(/_/g, '');
			if(parseBool(ds[key])) {
				parts.push(id.replace(/_/g, ' '));
			}
		});

		if(bankEnabled) {
			if(bankDates.length) {
				parts.push(`bank holidays (${bankDates.length} configured)`);
			} else {
				parts.push('bank holidays');
			};
		};

		if(!parts.length) {
			noteEl.textContent = '';
			return;
		};

		noteEl.textContent = `Exceptions: Closed on ${parts.join(', ')}.`;
	};

	document.addEventListener('DOMContentLoaded', () => {
		const section = document.querySelector('.foxy-opening-times');
		if(!section) return;
		const weekdayClosures = buildClosureWeekdays(section);
		markRowsClosed(section, weekdayClosures);
		renderExceptionsNote(section, weekdayClosures);
	});

})();