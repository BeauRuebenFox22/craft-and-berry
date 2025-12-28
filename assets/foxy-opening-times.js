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

	// Format date for notes/tooltips
	function formatDate(date) {
		return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
	};

	// Compute Monday-start current week range
	function getCurrentWeekRange(today = new Date()) {
		const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
		const jsDay = d.getDay(); // 0=Sun..6=Sat
		const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay; // move to Monday
		const start = new Date(d);
		start.setDate(d.getDate() + mondayOffset);
		const end = new Date(start);
		end.setDate(start.getDate() + 6);
		start.setHours(0, 0, 0, 0);
		end.setHours(23, 59, 59, 999);
		return { start, end };
	};

	function buildClosuresForYear(section) {
		const ds = section.dataset;
		const now = new Date();
		const year = now.getFullYear();
		const fixed = [
			{ id: 'christmas_eve', enabled: parseBool(ds.christmasEve), label: 'Christmas Eve' },
			{ id: 'christmas_day', enabled: parseBool(ds.christmasDay), label: 'Christmas Day' },
			{ id: 'boxing_day', enabled: parseBool(ds.boxingDay), label: 'Boxing Day' },
			{ id: 'new_years_eve', enabled: parseBool(ds.newYearsEve), label: "New Year's Eve" },
			{ id: 'new_years_day', enabled: parseBool(ds.newYearsDay), label: "New Year's Day" },
		];

		const closures = [];
		fixed.forEach(({ id, enabled, label }) => {
			if (!enabled) return;
			const d = holidayDateForYear(id, year);
			if (d) closures.push({ date: d, label });
		});

		const bankEnabled = parseBool(ds.bankHolidays);
		const bankDates = parseDateList(ds.bankHolidayDates);
		if (bankEnabled) {
			bankDates.forEach((d) => closures.push({ date: d, label: 'Bank Holiday' }));
		};
		return closures; // Array<{date:Date,label:string}>
	};

	function filterClosuresForWeek(closures, { start, end }) {
		return closures.filter((c) => c.date >= start && c.date <= end);
	};

	function markRowsClosedForWeek(section, closuresThisWeek) {
		const table = section.querySelector('.opening-times-table');
		if(!table) return;
		const rows = Array.from(table.querySelectorAll('tr')).slice(1);
		closuresThisWeek.forEach((closure) => {
			const day = weekdayName(closure.date);
			const tr = rows.find((row) => row.querySelector('td:first-child')?.textContent.trim() === day);
			if(!tr) return;
			const openCell = tr.querySelector('td:nth-child(2)');
			const closeCell = tr.querySelector('td:nth-child(3)');
			if(!openCell || !closeCell) return;
			tr.classList.add('closed');
			if(!/^closed$/i.test(openCell.textContent.trim())) openCell.textContent = 'Closed';
			if(!/^closed$/i.test(closeCell.textContent.trim())) closeCell.textContent = 'Closed';
			tr.setAttribute('title', `Closed on ${formatDate(closure.date)} (${closure.label})`);
		});
	};

	function renderExceptionsNoteForWeek(section, closuresThisWeek) {
		const noteEl = section.querySelector('.exceptions-note');
		if(!noteEl) return;
		if(!closuresThisWeek.length) {
			noteEl.textContent = '';
			return;
		};
		const text = closuresThisWeek.map((c) => `${c.label} (${formatDate(c.date)})`).join(', ');
		noteEl.textContent = `Exceptions this week: ${text}.`;
	};

	document.addEventListener('DOMContentLoaded', () => {
		const section = document.querySelector('.foxy-opening-times');
		if(!section) return;
		const week = getCurrentWeekRange();
		const closures = buildClosuresForYear(section);
		const closuresThisWeek = filterClosuresForWeek(closures, week);
		markRowsClosedForWeek(section, closuresThisWeek);
		renderExceptionsNoteForWeek(section, closuresThisWeek);
	});

})();