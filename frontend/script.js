const API_BASE_URL = window.PODCRAFT_API_BASE_URL || (window.location.origin && !window.location.origin.startsWith("file:") ? window.location.origin : "http://localhost:8000");

const state = {
	file: null,
	uploaded: false,
	extractedTopics: [],
	selectedTopics: new Set(),
	script: "",
	validation: null,
};

const THEME_KEY = 'podcraft-theme';

function getPreferredTheme() {
	const stored = localStorage.getItem(THEME_KEY);
	if (stored === 'light' || stored === 'dark') {
		return stored;
	}
	return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
	const isDark = theme === 'dark';
	document.documentElement.classList.toggle('dark', isDark);
	localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
}

function injectThemeToggle() {
	const navbarActions = document.querySelector('header .flex.items-center.gap-md');
	if (!navbarActions || navbarActions.querySelector('#theme-toggle')) {
		return;
	}

	const button = document.createElement('button');
	button.id = 'theme-toggle';
	button.type = 'button';
	button.className = 'text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-xs';
	button.innerHTML = '<span class="material-symbols-outlined" id="theme-toggle-icon">dark_mode</span><span class="text-label-sm font-label-sm">Dark</span>';

	function refreshToggleLabel() {
		const dark = document.documentElement.classList.contains('dark');
		const icon = button.querySelector('#theme-toggle-icon');
		const label = button.querySelector('span.text-label-sm');
		if (icon) {
			icon.textContent = dark ? 'light_mode' : 'dark_mode';
		}
		if (label) {
			label.textContent = dark ? 'Light' : 'Dark';
		}
		button.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
	}

	button.addEventListener('click', () => {
		const nextTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
		applyTheme(nextTheme);
		refreshToggleLabel();
	});

	navbarActions.prepend(button);
	refreshToggleLabel();
}

function createInjectedControls(sourceSection, topicSection) {
	const hostInput = sourceSection.querySelector('input[placeholder*="Sarah"]');
	const guestInput = sourceSection.querySelector('input[placeholder*="Dr. Smith"]');
	const baseRange = sourceSection.querySelector('input[type="range"]');
	const durationSelect = sourceSection.querySelector('select');

	if (hostInput) hostInput.id = 'host-name';
	if (guestInput) guestInput.id = 'guest-name';

	if (baseRange) {
		baseRange.min = '50';
		baseRange.max = '150';
		baseRange.value = '100';
		baseRange.id = 'host-speed';
		const hostValue = baseRange
			.closest('.space-y-sm')
			?.querySelector('span.text-label-sm.font-label-sm.text-primary');
		if (hostValue) hostValue.textContent = '100 wpm';
	}

	const speedGrid = baseRange ? baseRange.closest('.grid.grid-cols-2.gap-md') : null;
	let guestSpeed = sourceSection.querySelector('#guest-speed');
	if (speedGrid && !guestSpeed) {
		const guestWrap = document.createElement('div');
		guestWrap.className = 'space-y-sm';
		guestWrap.innerHTML = `
			<div class="flex justify-between items-center">
				<label class="text-label-sm font-label-sm text-on-surface-variant">Guest Speaking Speed</label>
				<span class="text-label-sm font-label-sm text-primary" id="guest-speed-value">100 wpm</span>
			</div>
			<input id="guest-speed" class="w-full h-2 bg-surface-variant rounded-lg appearance-none cursor-pointer accent-primary" max="150" min="50" type="range" value="100"/>
		`;
		speedGrid.prepend(guestWrap);
		guestSpeed = guestWrap.querySelector('#guest-speed');
	}

	if (durationSelect) {
		durationSelect.innerHTML = '';
		[
			{ value: '2', label: '2 Minutes' },
			{ value: '3', label: '3 Minutes' },
			{ value: '5', label: '5 Minutes' },
		].forEach((item) => {
			const option = document.createElement('option');
			option.value = item.value;
			option.textContent = item.label;
			durationSelect.appendChild(option);
		});
		durationSelect.value = '3';
		durationSelect.id = 'target-duration';
	}

	const detailsGrid = sourceSection.querySelector('.grid.grid-cols-2.gap-md');
	if (detailsGrid && !sourceSection.querySelector('#host-gender')) {
		const hostGenderWrap = document.createElement('div');
		hostGenderWrap.className = 'space-y-xs';
		hostGenderWrap.innerHTML = `
			<label class="text-label-sm font-label-sm text-on-surface-variant">Host Gender</label>
			<select id="host-gender" class="w-full bg-surface text-on-surface border border-outline-variant rounded-md px-md py-sm font-body-sm text-body-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none">
				<option value="">Select</option>
				<option value="male">Male</option>
				<option value="female">Female</option>
			</select>
		`;
		const guestGenderWrap = document.createElement('div');
		guestGenderWrap.className = 'space-y-xs';
		guestGenderWrap.innerHTML = `
			<label class="text-label-sm font-label-sm text-on-surface-variant">Guest Gender</label>
			<select id="guest-gender" class="w-full bg-surface text-on-surface border border-outline-variant rounded-md px-md py-sm font-body-sm text-body-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none">
				<option value="">Select</option>
				<option value="male">Male</option>
				<option value="female">Female</option>
			</select>
		`;
		detailsGrid.appendChild(hostGenderWrap);
		detailsGrid.appendChild(guestGenderWrap);
	}

	const refreshButton = Array.from(topicSection.querySelectorAll('button')).find((button) =>
		button.querySelector('.material-symbols-outlined')?.textContent.trim() === 'refresh'
	);

	let mismatchPanel = topicSection.querySelector('#topic-mismatch-panel');
	if (!mismatchPanel) {
		mismatchPanel = document.createElement('div');
		mismatchPanel.id = 'topic-mismatch-panel';
		mismatchPanel.className = 'mt-sm p-md rounded-custom border border-outline-variant bg-surface text-body-sm text-on-surface-variant';
		mismatchPanel.innerHTML = '<strong class="text-on-surface">Topic Match</strong><div id="topic-mismatch-content">Included topics and ignored topics will appear here.</div>';
		topicSection.appendChild(mismatchPanel);
	}

	const sidebarButtons = sourceSection.closest('body').querySelectorAll('nav button');
	const sidebarPrimaryButton = sidebarButtons.length ? sidebarButtons[sidebarButtons.length - 1] : null;

	return {
		hostInput,
		guestInput,
		hostGender: sourceSection.querySelector('#host-gender'),
		guestGender: sourceSection.querySelector('#guest-gender'),
		hostSpeed: sourceSection.querySelector('#host-speed'),
		guestSpeed: sourceSection.querySelector('#guest-speed'),
		hostSpeedValue: baseRange
			?.closest('.space-y-sm')
			?.querySelector('span.text-label-sm.font-label-sm.text-primary'),
		guestSpeedValue: sourceSection.querySelector('#guest-speed-value'),
		durationSelect,
		refreshButton,
		mismatchContent: topicSection.querySelector('#topic-mismatch-content'),
		sidebarPrimaryButton,
	};
}

function collectMandatoryErrors(controls) {
	const errors = [];
	if (!controls.hostInput?.value.trim()) errors.push('Host Name is required.');
	if (!controls.guestInput?.value.trim()) errors.push('Guest Name is required.');
	if (!controls.hostGender?.value) errors.push('Host Gender is required.');
	if (!controls.guestGender?.value) errors.push('Guest Gender is required.');
	if (!state.file && !state.uploaded) errors.push('At least one document upload is required.');
	if (![2, 3, 5].includes(parseDurationMinutes(controls.durationSelect))) errors.push('Duration must be one of: 2, 3, 5 minutes.');
	const hostSpeed = normalizeSpeed(controls.hostSpeed);
	const guestSpeed = normalizeSpeed(controls.guestSpeed);
	if (hostSpeed < 50 || hostSpeed > 150) errors.push('Host Speaking Speed must be between 50 and 150.');
	if (guestSpeed < 50 || guestSpeed > 150) errors.push('Guest Speaking Speed must be between 50 and 150.');
	return errors;
}

function showConsolidatedError(errors) {
	if (!errors.length) return;
	alert(['Please fix the following:', ...errors.map((item) => `- ${item}`)].join('\n'));
}

function renderTopicMismatch(contentEl, validation) {
	if (!contentEl) return;
	if (!validation) {
		contentEl.textContent = 'Included topics and ignored topics will appear here.';
		return;
	}
	const included = validation.included_topics || [];
	const ignored = validation.ignored_topics || [];
	contentEl.innerHTML = `
		<div><strong>Included Topics:</strong> ${included.length ? included.join(', ') : 'None'}</div>
		<div><strong>Ignored Topics:</strong> ${ignored.length ? ignored.join(', ') : 'None'}</div>
	`;
}

async function restartFlow(topicContainer, editor, controls, insightsSection) {
	await apiRequest('/reset', { method: 'POST' });
	state.file = null;
	state.uploaded = false;
	state.extractedTopics = [];
	state.selectedTopics = new Set();
	state.script = '';
	state.validation = null;
	renderTopics(topicContainer);
	setScriptContent(editor, '');
	renderTopicMismatch(controls.mismatchContent, null);
	updateInsights(insightsSection, editor, controls.durationSelect, controls.hostSpeed);
}

function parseErrorMessage(payload) {
	if (typeof payload === 'string') {
		return payload;
	}
	if (Array.isArray(payload?.detail)) {
		return payload.detail
			.map((item) => {
				const loc = Array.isArray(item?.loc) ? item.loc.join('.') : 'request';
				const msg = item?.msg || 'Invalid value';
				return `${loc}: ${msg}`;
			})
			.join('\n');
	}
	if (typeof payload?.detail === 'string') {
		return payload.detail;
	}
	if (payload?.message) {
		return payload.message;
	}
	return 'Request failed';
}

function parseDurationMinutes(selectElement) {
	const raw = (selectElement?.value || '').trim();
	const fromValue = Number(raw);
	if (Number.isFinite(fromValue) && fromValue > 0) {
		return fromValue;
	}
	const optionText = selectElement?.selectedOptions?.[0]?.textContent || raw;
	const match = optionText.match(/\d+/);
	const fromText = match ? Number(match[0]) : NaN;
	return Number.isFinite(fromText) && fromText > 0 ? fromText : 3;
}

function normalizeSpeed(rangeElement) {
	const raw = Number(rangeElement?.value || 100);
	if (!Number.isFinite(raw)) {
		return 100;
	}
	return Math.max(50, Math.min(150, Math.round(raw)));
}

function apiRequest(path, options = {}) {
	return fetch(`${API_BASE_URL}${path}`, {
		headers: options.body instanceof FormData ? undefined : { "Content-Type": "application/json", ...(options.headers || {}) },
		...options,
	}).then(async (response) => {
		const contentType = response.headers.get("content-type") || "";
		const payload = contentType.includes("application/json") ? await response.json() : await response.text();
		if (!response.ok) {
			const message = parseErrorMessage(payload);
			throw new Error(message);
		}
		return payload;
	});
}

function escapeHtml(value) {
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function getSections() {
	return Array.from(document.querySelectorAll("section"));
}

function findSection(titleText) {
	return getSections().find((section) => section.textContent.includes(titleText));
}

function findButtonByText(container, text) {
	return Array.from(container.querySelectorAll("button")).find((button) => button.textContent.replace(/\s+/g, " ").trim().includes(text));
}

function setScriptContent(editor, text) {
	state.script = text || "";
	const lines = state.script.split(/\r?\n/).filter((line) => line.trim().length > 0);
	if (!lines.length) {
		editor.innerHTML = '<p class="text-on-surface-variant">Your generated podcast script will appear here.</p>';
		return;
	}
	editor.innerHTML = lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
}

function updateInsights(insights, editor, durationSelect, speedRange) {
	if (!insights) {
		editor.dataset.wordCount = String(state.script.trim() ? state.script.trim().split(/\s+/).length : 0);
		return;
	}

	const wordCount = state.script.trim() ? state.script.trim().split(/\s+/).length : 0;
	const durationMinutes = parseDurationMinutes(durationSelect);
	const avgSpeed = normalizeSpeed(speedRange);
	const estimatedWords = durationMinutes * avgSpeed;
	const coverage = state.extractedTopics.length ? Math.round((state.selectedTopics.size || state.extractedTopics.length) / state.extractedTopics.length * 100) : 0;

	const durationValue = insights.querySelector('span.font-semibold');
	const topicCoverageValue = Array.from(insights.querySelectorAll('span.font-semibold')).find((node) => /%$/.test(node.textContent.trim()));
	const durationBar = insights.querySelector('.bg-primary.rounded-full');
	const topicSegments = insights.querySelectorAll('.w-full.bg-surface-variant.rounded-full.overflow-hidden.flex[class*="h-1.5"] > div');
	const topicLegend = insights.querySelectorAll('.flex.justify-between.text-label-sm.font-label-sm.text-on-surface-variant.mt-xs span');
	const toneParagraph = Array.from(insights.querySelectorAll('p')).find((paragraph) => paragraph.textContent.includes('The dialogue maintains'));

	if (durationValue) {
		if (!wordCount) {
			durationValue.textContent = '--';
		} else {
			const minutes = Math.max(1, Math.round(wordCount / Math.max((estimatedWords / Math.max(durationMinutes, 1)), 1)));
			const seconds = Math.round((wordCount % 100) / 10);
			durationValue.textContent = `${minutes}m ${seconds}s`;
		}
	}
	if (durationBar) {
		const pct = Math.min(100, Math.max(5, Math.round((wordCount / Math.max(estimatedWords, 1)) * 100)));
		durationBar.style.width = `${pct}%`;
	}
	if (topicCoverageValue) {
		topicCoverageValue.textContent = state.extractedTopics.length ? `${coverage}%` : '--';
	}
	if (topicSegments.length >= 2) {
		const selected = Math.max(1, state.selectedTopics.size || state.extractedTopics.length || 1);
		const first = Math.round((selected / Math.max(state.extractedTopics.length || 1, 1)) * 100);
		topicSegments[0].style.width = `${Math.min(100, first)}%`;
		topicSegments[1].style.width = `${Math.max(0, 100 - first)}%`;
	}
	if (topicLegend.length >= 2) {
		const topics = Array.from(state.selectedTopics.size ? state.selectedTopics : state.extractedTopics).slice(0, 2);
		topicLegend[0].textContent = topics[0] || '--';
		topicLegend[1].textContent = topics[1] || '--';
	}
	if (toneParagraph) {
		toneParagraph.textContent = wordCount
			? (state.script.includes('?')
				? 'Tone detected from generated script: conversational and analytical.'
				: 'Tone detected from generated script.')
			: 'Tone will appear after script generation.';
	}
	editor.dataset.wordCount = String(wordCount);
}

function renderTopics(topicContainer) {
	if (!state.extractedTopics.length) {
		topicContainer.innerHTML = '<div class="bg-surface text-on-surface-variant px-md py-xs rounded-full font-label-sm text-label-sm border border-outline-variant">No topics extracted yet.</div>';
		return;
	}

	topicContainer.innerHTML = state.extractedTopics.map((topic) => {
		const active = state.selectedTopics.size ? state.selectedTopics.has(topic) : true;
		return `
			<button type="button" class="${active ? 'bg-primary-container text-on-primary-container' : 'bg-surface text-on-surface-variant'} px-md py-xs rounded-full font-label-sm text-label-sm flex items-center gap-xs cursor-pointer shadow-sm border ${active ? 'border-transparent' : 'border-outline-variant hover:bg-surface-container-low'}" data-topic="${escapeHtml(topic)}">
				${active ? '<span class="material-symbols-outlined text-[14px]">check</span>' : ''}
				${escapeHtml(topic)}
			</button>`;
	}).join('');
}

function bindApp() {
	applyTheme(getPreferredTheme());
	injectThemeToggle();

	const sections = getSections();
	const sourceSection = findSection('Source Material') || sections[0];
	const topicSection = findSection('Extracted Topics') || sections[1];
	const scriptSection = findSection('Script Output') || sections[2];
	const insightsSection = Array.from(document.querySelectorAll('aside')).find((aside) => aside.textContent.includes('AI Insights'));

	if (!sourceSection || !topicSection || !scriptSection) {
		return;
	}

	const dropzone = sourceSection.querySelector('.border-dashed');
	const extractButton = findButtonByText(sourceSection, 'Extract Topics');
	const hostInput = sourceSection.querySelector('input[placeholder*="Sarah"]');
	const guestInput = sourceSection.querySelector('input[placeholder*="Dr. Smith"]');
	const speedRange = sourceSection.querySelector('input[type="range"]');
	const durationSelect = sourceSection.querySelector('select');
	const topicContainer = topicSection.querySelector('.flex.flex-wrap.gap-sm');
	const generateButton = findButtonByText(topicSection, 'Generate Script');
	const editor = scriptSection.querySelector('[contenteditable="true"]');
	const promptInput = scriptSection.querySelector('input[placeholder*="rewrite"]');
	const promptButton = scriptSection.querySelector('button.absolute');
	const copyButton = Array.from(scriptSection.querySelectorAll('button')).find((button) => button.textContent.replace(/\s+/g, ' ').trim().includes('Copy'));
	const exportButton = Array.from(scriptSection.querySelectorAll('button')).find((button) => button.textContent.replace(/\s+/g, ' ').trim().includes('Export'));
	const controls = createInjectedControls(sourceSection, topicSection);
	const fileInput = document.createElement('input');
	fileInput.type = 'file';
	fileInput.accept = '.pdf,.docx,.txt';
	fileInput.style.display = 'none';
	document.body.appendChild(fileInput);

	function syncDropzoneLabel() {
		const label = dropzone.querySelector('p');
		if (label) {
			label.textContent = state.file ? `Selected: ${state.file.name}` : 'Drag & drop raw audio, video, or notes here';
		}
	}

	function syncTopicState() {
		renderTopics(topicContainer);
		updateInsights(insightsSection, editor, controls.durationSelect, controls.hostSpeed);
	}

	function uploadSelectedFile() {
		if (!state.file) {
			throw new Error('Please choose a PDF, DOCX, or TXT file first.');
		}
		const formData = new FormData();
		formData.append('file', state.file);
		return apiRequest('/upload-docs', { method: 'POST', body: formData });
	}

	fileInput.addEventListener('change', () => {
		state.file = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
		state.uploaded = false;
		syncDropzoneLabel();
	});

	dropzone.addEventListener('click', () => fileInput.click());
	dropzone.addEventListener('dragover', (event) => event.preventDefault());
	dropzone.addEventListener('drop', (event) => {
		event.preventDefault();
		const [file] = event.dataTransfer.files || [];
		if (file) {
			state.file = file;
			syncDropzoneLabel();
		}
	});

	extractButton.addEventListener('click', async () => {
		const errors = collectMandatoryErrors(controls).filter((item) => item !== 'At least one document upload is required.');
		if (errors.length) {
			showConsolidatedError(errors);
			return;
		}
		try {
			await uploadSelectedFile();
			const payload = await apiRequest('/extract-topics', { method: 'GET' });
			state.uploaded = true;
			state.extractedTopics = Array.isArray(payload.topics) ? payload.topics : [];
			state.selectedTopics = new Set(state.extractedTopics);
			syncTopicState();
			alert('Document uploaded and topics extracted.');
		} catch (error) {
			alert(error.message);
			if (!state.file) {
				fileInput.click();
			}
		}
	});

	topicContainer.addEventListener('click', (event) => {
		const chip = event.target.closest('[data-topic]');
		if (!chip) return;
		const topic = chip.getAttribute('data-topic');
		if (state.selectedTopics.has(topic)) {
			state.selectedTopics.delete(topic);
		} else {
			state.selectedTopics.add(topic);
		}
		syncTopicState();
	});

	function currentTopics() {
		const manual = (promptInput.value || '').split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
		if (manual.length) return manual;
		return Array.from(state.selectedTopics.size ? state.selectedTopics : state.extractedTopics);
	}

	generateButton.addEventListener('click', async () => {
		const errors = collectMandatoryErrors(controls);
		if (errors.length) {
			showConsolidatedError(errors);
			return;
		}
		try {
			const topics = currentTopics();
			const hostNormalizedSpeed = normalizeSpeed(controls.hostSpeed);
			const guestNormalizedSpeed = normalizeSpeed(controls.guestSpeed);
			const request = {
				host_name: controls.hostInput.value.trim(),
				host_gender: controls.hostGender.value,
				guest_name: controls.guestInput.value.trim(),
				guest_gender: controls.guestGender.value,
				host_speed: hostNormalizedSpeed,
				guest_speed: guestNormalizedSpeed,
				duration: parseDurationMinutes(controls.durationSelect),
				topics,
			};
			state.validation = await apiRequest('/validate-topics', { method: 'POST', body: JSON.stringify({ user_topics: topics }) });
			renderTopicMismatch(controls.mismatchContent, state.validation);
			const payload = await apiRequest('/generate-script', { method: 'POST', body: JSON.stringify(request) });
			setScriptContent(editor, payload.script || '');
			updateInsights(insightsSection, editor, controls.durationSelect, controls.hostSpeed);
		} catch (error) {
			alert(error.message);
		}
	});

	const refine = async () => {
		const instruction = (promptInput.value || '').trim();
		if (!instruction) return;
		try {
			const payload = await apiRequest('/modify-script', { method: 'POST', body: JSON.stringify({ instruction }) });
			setScriptContent(editor, payload.script || '');
			updateInsights(insightsSection, editor, controls.durationSelect, controls.hostSpeed);
		} catch (error) {
			alert(error.message);
		}
	};

	promptButton.addEventListener('click', refine);
	promptInput.addEventListener('keydown', (event) => {
		if (event.key === 'Enter') {
			event.preventDefault();
			refine();
		}
	});

	copyButton.addEventListener('click', async () => {
		try {
			await navigator.clipboard.writeText(state.script || editor.textContent || '');
		} catch (error) {
			alert('Clipboard unavailable');
		}
	});

	exportButton.addEventListener('click', () => {
		const blob = new Blob([state.script || editor.textContent || ''], { type: 'text/plain;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = 'podcraft-script.txt';
		link.click();
		URL.revokeObjectURL(url);
	});

	controls.hostSpeed.addEventListener('input', () => {
		if (controls.hostSpeedValue) controls.hostSpeedValue.textContent = `${normalizeSpeed(controls.hostSpeed)} wpm`;
		updateInsights(insightsSection, editor, controls.durationSelect, controls.hostSpeed);
	});
	if (controls.guestSpeed) {
		controls.guestSpeed.addEventListener('input', () => {
			if (controls.guestSpeedValue) controls.guestSpeedValue.textContent = `${normalizeSpeed(controls.guestSpeed)} wpm`;
		});
	}
	controls.durationSelect.addEventListener('change', () => updateInsights(insightsSection, editor, controls.durationSelect, controls.hostSpeed));
	if (controls.refreshButton) {
		controls.refreshButton.addEventListener('click', async () => {
			try {
				await restartFlow(topicContainer, editor, controls, insightsSection);
				alert('Flow restarted. Please re-enter inputs and upload your document.');
			} catch (error) {
				alert(error.message);
			}
		});
	}
	if (controls.sidebarPrimaryButton) {
		controls.sidebarPrimaryButton.addEventListener('click', () => {
			generateButton.click();
		});
	}
	editor.addEventListener('input', () => {
		state.script = editor.textContent || '';
		updateInsights(insightsSection, editor, controls.durationSelect, controls.hostSpeed);
	});

	syncDropzoneLabel();
	syncTopicState();
	renderTopicMismatch(controls.mismatchContent, null);
	setScriptContent(editor, '');
	updateInsights(insightsSection, editor, controls.durationSelect, controls.hostSpeed);
}

document.addEventListener('DOMContentLoaded', bindApp);
