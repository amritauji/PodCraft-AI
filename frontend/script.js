const resolvedOrigin = window.location.origin;
const API_BASE_URL = window.PODCRAFT_API_BASE_URL || ((resolvedOrigin && resolvedOrigin !== "null" && !resolvedOrigin.startsWith("file:")) ? resolvedOrigin : "http://localhost:8000");

const state = {
	file: null,
	extractedTopics: [],
	selectedTopics: new Set(),
	script: "",
	busy: false,
};

const dom = {};

function $(id) {
	return document.getElementById(id);
}

function initializeDom() {
	dom.fileInput = $("file-input");
	dom.dropzone = $("dropzone");
	dom.uploadButton = $("upload-button");
	dom.extractButton = $("extract-button");
	dom.generateButton = $("generate-button");
	dom.refineButton = $("refine-button");
	dom.resetButton = $("reset-button");
	dom.copyButton = $("copy-button");
	dom.downloadButton = $("download-button");
	dom.hostName = $("host-name");
	dom.hostGender = $("host-gender");
	dom.guestName = $("guest-name");
	dom.guestGender = $("guest-gender");
	dom.hostSpeed = $("host-speed");
	dom.guestSpeed = $("guest-speed");
	dom.duration = $("duration");
	dom.manualTopics = $("manual-topics");
	dom.topicList = $("topic-list");
	dom.topicSummary = $("topic-summary");
	dom.validationSummary = $("validation-summary");
	dom.scriptEditor = $("script-editor");
	dom.refineInstruction = $("refine-instruction");
	dom.fileName = $("file-name");
	dom.status = $("status");
	dom.uploadState = $("upload-state");
	dom.topicCount = $("topic-count");
	dom.scriptStats = $("script-stats");
	dom.durationStat = $("duration-stat");
	dom.copyStatus = $("copy-status");
}

function setStatus(message, tone = "neutral") {
	if (!dom.status) return;
	dom.status.textContent = message;
	dom.status.dataset.tone = tone;
}

function setBusy(isBusy) {
	state.busy = isBusy;
	[dom.uploadButton, dom.extractButton, dom.generateButton, dom.refineButton, dom.resetButton].forEach((button) => {
		if (button) button.disabled = isBusy;
	});
}

function escapeHtml(value) {
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/\"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function normalizeTopics(rawText) {
	return rawText
		.split(/[,\n]/)
		.map((topic) => topic.trim())
		.filter(Boolean);
}

function selectedTopics() {
	const manual = normalizeTopics(dom.manualTopics?.value || "");
	if (manual.length) {
		return manual;
	}
	const selected = Array.from(state.selectedTopics);
	return selected;
}

function renderTopics() {
	if (!dom.topicList) return;

	if (!state.extractedTopics.length) {
		dom.topicList.innerHTML = '<div class="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">Upload a document and click Analyze to extract topics.</div>';
		if (dom.topicCount) dom.topicCount.textContent = "0";
		if (dom.topicSummary) dom.topicSummary.textContent = "No topics extracted yet.";
		return;
	}

	dom.topicList.innerHTML = state.extractedTopics
		.map((topic) => {
			const active = state.selectedTopics.has(topic);
			return `
				<button
					type="button"
					class="topic-chip ${active ? "topic-chip-active" : ""}"
					data-topic="${escapeHtml(topic)}"
					aria-pressed="${active}"
				>
					${escapeHtml(topic)}
				</button>`;
		})
		.join("");

	if (dom.topicCount) dom.topicCount.textContent = String(state.selectedTopics.size || state.extractedTopics.length);
	if (dom.topicSummary) {
		dom.topicSummary.textContent = `${state.extractedTopics.length} extracted topic${state.extractedTopics.length === 1 ? "" : "s"}. Click to include or exclude them from the script.`;
	}
}

function renderValidation(validation) {
	if (!dom.validationSummary) return;

	if (!validation) {
		dom.validationSummary.textContent = "Validation status will appear here after generation.";
		return;
	}

	const included = validation.included_topics || [];
	const ignored = validation.ignored_topics || [];
	const parts = [];
	if (included.length) parts.push(`Included: ${included.join(", ")}`);
	if (ignored.length) parts.push(`Ignored: ${ignored.join(", ")}`);
	dom.validationSummary.textContent = parts.join(" | ") || "No validation details returned.";
}

function renderScript(script) {
	state.script = script || "";
	if (dom.scriptEditor) dom.scriptEditor.value = state.script;
	if (dom.scriptStats) dom.scriptStats.textContent = `${Math.max(state.script.trim().split(/\s+/).filter(Boolean).length, 0)} words`;
	if (dom.durationStat) dom.durationStat.textContent = `${dom.duration?.value || "30"} minutes`;
}

function updateUploadState() {
	if (dom.uploadState) {
		dom.uploadState.textContent = state.file ? `Ready to upload: ${state.file.name}` : "No file selected";
	}
	if (dom.fileName) {
		dom.fileName.textContent = state.file ? state.file.name : "Choose a PDF, DOCX, or TXT file";
	}
}

async function apiRequest(path, options = {}) {
	const response = await fetch(`${API_BASE_URL}${path}`, {
		headers: options.body instanceof FormData ? undefined : { "Content-Type": "application/json", ...(options.headers || {}) },
		...options,
	});

	const contentType = response.headers.get("content-type") || "";
	const payload = contentType.includes("application/json") ? await response.json() : await response.text();

	if (!response.ok) {
		const detail = typeof payload === "string" ? payload : payload?.detail || payload?.message || "Request failed";
		throw new Error(detail);
	}

	return payload;
}

async function uploadDocument() {
	if (!state.file) {
		throw new Error("Choose a document first.");
	}

	const formData = new FormData();
	formData.append("file", state.file);

	return apiRequest("/upload-docs", {
		method: "POST",
		body: formData,
	});
}

async function extractTopics() {
	const payload = await apiRequest("/extract-topics");
	const topics = Array.isArray(payload.topics) ? payload.topics : [];
	state.extractedTopics = topics;
	state.selectedTopics = new Set(topics);
	renderTopics();
	setStatus(`Extracted ${topics.length} topic${topics.length === 1 ? "" : "s"}.`, "success");
}

function buildScriptRequest() {
	const topics = selectedTopics();

	return {
		host_name: dom.hostName.value.trim() || "Host",
		host_gender: dom.hostGender.value,
		guest_name: dom.guestName.value.trim() || "Guest",
		guest_gender: dom.guestGender.value,
		host_speed: Number(dom.hostSpeed.value),
		guest_speed: Number(dom.guestSpeed.value),
		duration: Number(dom.duration.value),
		topics,
	};
}

async function generateScript() {
	const request = buildScriptRequest();
	if (!request.topics.length) {
		throw new Error("Select or enter at least one topic.");
	}

	const validation = await apiRequest("/validate-topics", {
		method: "POST",
		body: JSON.stringify({ user_topics: request.topics }),
	});
	renderValidation(validation);

	const payload = await apiRequest("/generate-script", {
		method: "POST",
		body: JSON.stringify(request),
	});

	renderScript(payload.script || "");
	setStatus("Script generated and saved to Supabase.", "success");
}

async function refineScript() {
	const instruction = dom.refineInstruction.value.trim();
	if (!instruction) {
		throw new Error("Add a refinement instruction first.");
	}

	const payload = await apiRequest("/modify-script", {
		method: "POST",
		body: JSON.stringify({ instruction }),
	});

	renderScript(payload.script || "");
	setStatus("Script refined.", "success");
}

async function resetWorkspace() {
	await apiRequest("/reset", { method: "POST" });
	state.file = null;
	state.extractedTopics = [];
	state.selectedTopics = new Set();
	state.script = "";
	if (dom.fileInput) dom.fileInput.value = "";
	if (dom.manualTopics) dom.manualTopics.value = "";
	if (dom.refineInstruction) dom.refineInstruction.value = "";
	renderTopics();
	renderValidation(null);
	renderScript("");
	updateUploadState();
	setStatus("Workspace reset.", "neutral");
}

async function handleAnalyze() {
	setBusy(true);
	try {
		await uploadDocument();
		await extractTopics();
	} catch (error) {
		setStatus(error.message, "error");
	} finally {
		setBusy(false);
	}
}

async function handleGenerate() {
	setBusy(true);
	try {
		await generateScript();
	} catch (error) {
		setStatus(error.message, "error");
	} finally {
		setBusy(false);
	}
}

async function handleRefine() {
	setBusy(true);
	try {
		await refineScript();
	} catch (error) {
		setStatus(error.message, "error");
	} finally {
		setBusy(false);
	}
}

async function handleCopy() {
	if (!state.script) {
		setStatus("Nothing to copy yet.", "neutral");
		return;
	}

	try {
		await navigator.clipboard.writeText(state.script);
		if (dom.copyStatus) dom.copyStatus.textContent = "Copied";
		setStatus("Script copied to clipboard.", "success");
	} catch (error) {
		setStatus("Clipboard access is unavailable in this browser context.", "error");
	}
}

function handleDownload() {
	if (!state.script) {
		setStatus("Generate a script before exporting.", "neutral");
		return;
	}

	const blob = new Blob([state.script], { type: "text/plain;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = "podcraft-script.txt";
	link.click();
	URL.revokeObjectURL(url);
	setStatus("Script download started.", "success");
}

function bindEvents() {
	dom.fileInput.addEventListener("change", (event) => {
		state.file = event.target.files?.[0] || null;
		updateUploadState();
		setStatus(state.file ? "File selected. Click Analyze to upload and extract topics." : "", "neutral");
	});

	dom.dropzone.addEventListener("click", () => dom.fileInput.click());
	dom.dropzone.addEventListener("dragover", (event) => {
		event.preventDefault();
		dom.dropzone.classList.add("dropzone-active");
	});
	dom.dropzone.addEventListener("dragleave", () => dom.dropzone.classList.remove("dropzone-active"));
	dom.dropzone.addEventListener("drop", (event) => {
		event.preventDefault();
		dom.dropzone.classList.remove("dropzone-active");
		const [file] = event.dataTransfer.files || [];
		if (file) {
			state.file = file;
			updateUploadState();
			setStatus("File dropped. Click Analyze to continue.", "neutral");
		}
	});

	dom.uploadButton.addEventListener("click", handleAnalyze);
	dom.extractButton.addEventListener("click", async () => {
		setBusy(true);
		try {
			await extractTopics();
		} catch (error) {
			setStatus(error.message, "error");
		} finally {
			setBusy(false);
		}
	});
	dom.generateButton.addEventListener("click", handleGenerate);
	dom.refineButton.addEventListener("click", handleRefine);
	dom.resetButton.addEventListener("click", resetWorkspace);
	dom.copyButton.addEventListener("click", handleCopy);
	dom.downloadButton.addEventListener("click", handleDownload);
	dom.scriptEditor.addEventListener("input", () => {
		state.script = dom.scriptEditor.value;
		renderScript(state.script);
	});

	dom.topicList.addEventListener("click", (event) => {
		const chip = event.target.closest("[data-topic]");
		if (!chip) return;
		const topic = chip.getAttribute("data-topic");
		if (state.selectedTopics.has(topic)) {
			state.selectedTopics.delete(topic);
		} else {
			state.selectedTopics.add(topic);
		}
		renderTopics();
	});

	dom.manualTopics.addEventListener("input", () => {
		dom.topicCount.textContent = String(normalizeTopics(dom.manualTopics.value).length || state.selectedTopics.size || 0);
	});
}

function boot() {
	initializeDom();
	bindEvents();
	updateUploadState();
	renderTopics();
	renderValidation(null);
	renderScript("");
	setStatus("Ready. Upload a document to begin.", "neutral");
}

document.addEventListener("DOMContentLoaded", boot);
