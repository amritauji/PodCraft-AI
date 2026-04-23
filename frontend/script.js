const API_BASE_URL = window.PODCRAFT_API_BASE_URL || (window.location.origin && !window.location.origin.startsWith("file:") ? window.location.origin : "http://localhost:8000");

const state = {
	file: null,
	extractedTopics: [],
	selectedTopics: new Set(),
	script: "",
};

function apiRequest(path, options = {}) {
	return fetch(`${API_BASE_URL}${path}`, {
		headers: options.body instanceof FormData ? undefined : { "Content-Type": "application/json", ...(options.headers || {}) },
		...options,
	}).then(async (response) => {
		const contentType = response.headers.get("content-type") || "";
		const payload = contentType.includes("application/json") ? await response.json() : await response.text();
		if (!response.ok) {
			const message = typeof payload === "string" ? payload : payload?.detail || payload?.message || "Request failed";
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
	const wordCount = state.script.trim() ? state.script.trim().split(/\s+/).length : 0;
	const durationMinutes = Number(durationSelect.value || 30);
	const avgSpeed = Number(speedRange.value || 5);
	const estimatedWords = durationMinutes * (100 + (avgSpeed - 1) * 15);
	const coverage = state.extractedTopics.length ? Math.round((state.selectedTopics.size || state.extractedTopics.length) / state.extractedTopics.length * 100) : 0;

	const durationValue = insights.querySelector('span.font-semibold');
	const topicCoverageValue = Array.from(insights.querySelectorAll('span.font-semibold')).find((node) => /%$/.test(node.textContent.trim()));
	const durationBar = insights.querySelector('.bg-primary.rounded-full');
	const topicSegments = insights.querySelectorAll('.w-full.h-1\.5.bg-surface-variant.rounded-full.overflow-hidden.flex > div');
	const topicLegend = insights.querySelectorAll('.flex.justify-between.text-label-sm.font-label-sm.text-on-surface-variant.mt-xs span');
	const toneParagraph = Array.from(insights.querySelectorAll('p')).find((paragraph) => paragraph.textContent.includes('The dialogue maintains'));

	if (durationValue) {
		durationValue.textContent = `${Math.max(1, Math.round(wordCount / Math.max((estimatedWords / Math.max(durationMinutes, 1)), 1)))}m ${Math.round((wordCount % 100) / 10)}s`;
	}
	if (durationBar) {
		const pct = Math.min(100, Math.max(5, Math.round((wordCount / Math.max(estimatedWords, 1)) * 100)));
		durationBar.style.width = `${pct}%`;
	}
	if (topicCoverageValue) {
		topicCoverageValue.textContent = `${coverage}%`;
	}
	if (topicSegments.length >= 2) {
		const selected = Math.max(1, state.selectedTopics.size || state.extractedTopics.length || 1);
		const first = Math.round((selected / Math.max(state.extractedTopics.length || 1, 1)) * 100);
		topicSegments[0].style.width = `${Math.min(100, first)}%`;
		topicSegments[1].style.width = `${Math.max(0, 100 - first)}%`;
	}
	if (topicLegend.length >= 2) {
		const topics = Array.from(state.selectedTopics.size ? state.selectedTopics : state.extractedTopics).slice(0, 2);
		topicLegend[0].textContent = topics[0] || 'AI Ethics';
		topicLegend[1].textContent = topics[1] || 'Future of Work';
	}
	if (toneParagraph) {
		toneParagraph.textContent = state.script.includes('?')
			? 'The dialogue maintains a conversational and analytical tone with natural host/guest exchanges.'
			: 'The dialogue maintains a high-level academic tone suitable for industry professionals, though lacks conversational bridges.';
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
	const sourceSection = findSection('Source Material');
	const topicSection = findSection('Extracted Topics');
	const scriptSection = findSection('Script Output');
	const insightsSection = Array.from(document.querySelectorAll('aside')).find((aside) => aside.textContent.includes('AI Insights'));

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
		updateInsights(insightsSection, editor, durationSelect, speedRange);
	}

	function uploadSelectedFile() {
		if (!state.file) {
			fileInput.click();
			return;
		}
		const formData = new FormData();
		formData.append('file', state.file);
		return apiRequest('/upload-docs', { method: 'POST', body: formData });
	}

	fileInput.addEventListener('change', () => {
		state.file = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
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
		try {
			await uploadSelectedFile();
			const payload = await apiRequest('/extract-topics', { method: 'GET' });
			state.extractedTopics = Array.isArray(payload.topics) ? payload.topics : [];
			state.selectedTopics = new Set(state.extractedTopics);
			syncTopicState();
		} catch (error) {
			alert(error.message);
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
		try {
			const topics = currentTopics();
			const request = {
				host_name: hostInput.value.trim() || 'Host',
				host_gender: '',
				guest_name: guestInput.value.trim() || 'Guest',
				guest_gender: '',
				host_speed: Number(speedRange.value || 5),
				guest_speed: Number(speedRange.value || 5),
				duration: Number(durationSelect.value || 30),
				topics,
			};
			await apiRequest('/validate-topics', { method: 'POST', body: JSON.stringify({ user_topics: topics }) });
			const payload = await apiRequest('/generate-script', { method: 'POST', body: JSON.stringify(request) });
			setScriptContent(editor, payload.script || '');
			updateInsights(insightsSection, editor, durationSelect, speedRange);
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
			updateInsights(insightsSection, editor, durationSelect, speedRange);
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

	speedRange.addEventListener('input', () => updateInsights(insightsSection, editor, durationSelect, speedRange));
	durationSelect.addEventListener('change', () => updateInsights(insightsSection, editor, durationSelect, speedRange));
	editor.addEventListener('input', () => {
		state.script = editor.textContent || '';
		updateInsights(insightsSection, editor, durationSelect, speedRange);
	});

	syncDropzoneLabel();
	syncTopicState();
	setScriptContent(editor, '');
	updateInsights(insightsSection, editor, durationSelect, speedRange);
}

document.addEventListener('DOMContentLoaded', bindApp);
