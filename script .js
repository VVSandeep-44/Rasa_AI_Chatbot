const RASA_ENDPOINT = "http://localhost:5005/webhooks/rest/webhook";
const STORAGE_KEY = "mr_ai_assistant_history_v2";

const chatWindow = document.getElementById("chatWindow");
const chatFab = document.getElementById("chatFab");
const closeBtn = document.getElementById("closeBtn");
const clearBtn = document.getElementById("clearBtn");
const chatBox = document.getElementById("chatBox");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const micBtn = document.getElementById("micBtn");
const statusText = document.getElementById("statusText");
const assistantStatus = document.getElementById("assistantStatus");
const typingText = document.getElementById("typingText");
const quickPrompts = document.getElementById("quickPrompts");

let typingNode = null;
let isRecording = false;

(function boot() {
	initParticles();
	initTypingStrip();
	bindEvents();
	hydrateHistory();
	if (!chatBox.children.length) {
		addMessage("bot", "Konnichiwa! I'm Zeno-ai, your ultimate anime companion. Ask me anything about anime, manga, characters, and genres! 🎌");
	}
})();

function bindEvents() {
	chatFab.addEventListener("click", toggleChat);
	closeBtn.addEventListener("click", toggleChat);
	clearBtn.addEventListener("click", clearConversation);

	chatForm.addEventListener("submit", function onSubmit(event) {
		event.preventDefault();
		sendMessage();
	});

	userInput.addEventListener("keydown", function onInputKeydown(event) {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			sendMessage();
		}
	});

	quickPrompts.addEventListener("click", function onQuickPrompt(event) {
		const target = event.target;
		if (target instanceof HTMLButtonElement) {
			userInput.value = target.textContent || "";
			sendMessage();
		}
	});

	document.addEventListener("keydown", function onGlobalShortcuts(event) {
		if (event.key === "/" && document.activeElement !== userInput) {
			event.preventDefault();
			if (!chatWindow.classList.contains("open")) {
				toggleChat();
			}
			setTimeout(function focusInput() {
				userInput.focus();
			}, 120);
		}

		if (event.key === "Escape" && chatWindow.classList.contains("open")) {
			toggleChat();
		}
	});

	setupSpeechRecognition();
}

function toggleChat() {
	const isOpen = chatWindow.classList.toggle("open");
	chatWindow.setAttribute("aria-hidden", String(!isOpen));
	chatFab.style.display = isOpen ? "none" : "flex";
	if (isOpen) {
		userInput.focus();
	}
}

async function sendMessage() {
	const message = userInput.value.trim();
	if (!message) {
		return;
	}

	addMessage("user", message);
	userInput.value = "";

	setAssistantState("thinking...");
	showTyping();

	try {
		const data = await fetchRasaReply(message);
		hideTyping();

		if (Array.isArray(data) && data.length) {
			let hasText = false;
			data.forEach((entry) => {
				if (entry && typeof entry.text === "string" && entry.text.trim()) {
					hasText = true;
					addMessage("bot", entry.text.trim());
				}
			});

			if (!hasText) {
				addMessage("bot", fallbackReply(message));
			}

			setAssistantState("watching anime");
			setStatus("Connected");
		} else {
			addMessage("bot", fallbackReply(message));
			setAssistantState("fallback mode");
			setStatus("Fallback");
		}
	} catch (error) {
		hideTyping();
		addMessage(
			"bot",
			"RASA server not available right now. Switching to Zeno's local anime knowledge!"
		);
		addMessage("bot", fallbackReply(message));
		setAssistantState("offline mode");
		setStatus("Offline");
	}
}

async function fetchRasaReply(message) {
	const response = await fetch(RASA_ENDPOINT, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			sender: "web-user",
			message,
		}),
	});

	if (!response.ok) {
		throw new Error("RASA request failed");
	}

	return response.json();
}

function addMessage(role, text) {
	const bubble = document.createElement("div");
	bubble.className = `message ${role}`;
	bubble.textContent = text;

	const meta = document.createElement("div");
	meta.className = `message-meta ${role}`;
	meta.textContent = new Date().toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});

	chatBox.appendChild(bubble);
	chatBox.appendChild(meta);
	chatBox.scrollTop = chatBox.scrollHeight;
	persistHistory();
}

function showTyping() {
	if (typingNode) {
		return;
	}

	typingNode = document.createElement("div");
	typingNode.className = "typing-indicator";
	typingNode.innerHTML = "<span></span><span></span><span></span>";
	chatBox.appendChild(typingNode);
	chatBox.scrollTop = chatBox.scrollHeight;
}

function hideTyping() {
	if (typingNode && typingNode.parentNode) {
		typingNode.parentNode.removeChild(typingNode);
	}
	typingNode = null;
}

function persistHistory() {
	const entries = [];
	const nodes = chatBox.querySelectorAll(".message");

	nodes.forEach((node) => {
		entries.push({
			role: node.classList.contains("user") ? "user" : "bot",
			text: node.textContent || "",
		});
	});

	localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function hydrateHistory() {
	const raw = localStorage.getItem(STORAGE_KEY);
	if (!raw) {
		return;
	}

	try {
		const history = JSON.parse(raw);
		if (Array.isArray(history)) {
			history.forEach((entry) => {
				if (entry && (entry.role === "user" || entry.role === "bot")) {
					addMessage(entry.role, String(entry.text || ""));
				}
			});
		}
	} catch {
		localStorage.removeItem(STORAGE_KEY);
	}
}

function clearConversation() {
	chatBox.innerHTML = "";
	localStorage.removeItem(STORAGE_KEY);
	addMessage("bot", "Conversation cleared. Ask a fresh question anytime.");
}

function setupSpeechRecognition() {
	const SpeechRecognition =
		window.SpeechRecognition || window.webkitSpeechRecognition;

	if (!SpeechRecognition) {
		micBtn.disabled = true;
		micBtn.title = "Voice not supported in this browser";
		setStatus("Text only");
		return;
	}

	const recognition = new SpeechRecognition();
	recognition.lang = "en-US";
	recognition.interimResults = false;

	micBtn.addEventListener("click", function onMicClick() {
		if (isRecording) {
			recognition.stop();
			return;
		}
		recognition.start();
	});

	recognition.onstart = function onStart() {
		isRecording = true;
		micBtn.classList.add("active");
		setAssistantState("listening...");
	};

	recognition.onresult = function onResult(event) {
		const transcript = event.results?.[0]?.[0]?.transcript || "";
		if (transcript.trim()) {
			userInput.value = transcript;
			sendMessage();
		}
	};

	recognition.onerror = function onError() {
		setAssistantState("voice error");
	};

	recognition.onend = function onEnd() {
		isRecording = false;
		micBtn.classList.remove("active");
		if (assistantStatus.textContent !== "offline mode") {
			setAssistantState("watching anime");
		}
	};
}

function setStatus(text) {
	statusText.textContent = text;
}

function setAssistantState(text) {
	assistantStatus.textContent = text;
}

function fallbackReply(message) {
	const prompt = message.toLowerCase();

	if (prompt.includes("shounen") || prompt.includes("action")) {
		return "Shounen anime features young male protagonists and focuses on action, adventure, and battles. Popular series include One Piece, My Hero Academia, and Demon Slayer! 💪";
	}

	if (prompt.includes("shoujo") || prompt.includes("romance")) {
		return "Shoujo anime targets young female audiences and often features romance, drama, and emotional storytelling. Classics include Fruit Basket and Sailor Moon! 💕";
	}

	if (prompt.includes("isekai") || prompt.includes("another world")) {
		return "Isekai anime sends characters to alternate or fantasy worlds. Popular examples: That Time I Got Reincarnated as a Spider, Re:ZERO, and Sword Art Online! 🌍";
	}

	if (prompt.includes("demon slayer") || prompt.includes("bleach") || prompt.includes("jujutsu")) {
		return "These are incredible action-packed shounen series! Demon Slayer has stunning animation, Bleach has epic battles, and Jujutsu Kaisen combines both! ⚔️";
	}

	if (prompt.includes("character") || prompt.includes("protagonist")) {
		return "Tell me which anime you're interested in, and I can describe the main characters and their development for you!";
	}

	if (prompt.includes("season") || prompt.includes("episode")) {
		return "Different anime have different numbers of seasons. Some like One Piece have 20+, while others are just 12-13 episodes. Which anime interest you? 📺";
	}

	return "I know about anime genres, popular series, characters, plots, and more! Ask me about shounen, shoujo, isekai, slice of life, or your favorite anime series! 🎌";
}

function initTypingStrip() {
	const lines = [
		"Comprehensive anime database and character profiles.",
		"Voice + text queries supported.",
		"Your chat history stays private in browser.",
		"Instant anime facts and recommendations enabled.",
	];

	let line = 0;
	let char = 0;

	function typeLoop() {
		if (!typingText) {
			return;
		}

		if (line >= lines.length) {
			line = 0;
			char = 0;
			typingText.textContent = "";
		}

		const current = lines[line];
		if (char < current.length) {
			typingText.textContent += current[char];
			char += 1;
			setTimeout(typeLoop, 35);
			return;
		}

		setTimeout(function nextLine() {
			typingText.textContent = "";
			line += 1;
			char = 0;
			typeLoop();
		}, 1200);
	}

	typeLoop();
}

function initParticles() {
	const canvas = document.getElementById("particles");
	const context = canvas.getContext("2d");

	let width = 0;
	let height = 0;
	let nodes = [];

	function setup() {
		width = canvas.width = window.innerWidth;
		height = canvas.height = window.innerHeight;
		nodes = Array.from({ length: 55 }, function createNode() {
			return {
				x: Math.random() * width,
				y: Math.random() * height,
				vx: (Math.random() - 0.5) * 0.5,
				vy: (Math.random() - 0.5) * 0.5,
			};
		});
	}

	function tick() {
		context.clearRect(0, 0, width, height);

		for (let i = 0; i < nodes.length; i += 1) {
			const a = nodes[i];
			for (let j = i + 1; j < nodes.length; j += 1) {
				const b = nodes[j];
				const dx = a.x - b.x;
				const dy = a.y - b.y;
				const distance = Math.hypot(dx, dy);

				if (distance < 130) {
					context.strokeStyle = `rgba(31,214,255,${(130 - distance) / 800})`;
					context.lineWidth = 1;
					context.beginPath();
					context.moveTo(a.x, a.y);
					context.lineTo(b.x, b.y);
					context.stroke();
				}
			}

			context.fillStyle = "rgba(77,255,189,0.85)";
			context.beginPath();
			context.arc(a.x, a.y, 1.8, 0, Math.PI * 2);
			context.fill();

			a.x += a.vx;
			a.y += a.vy;

			if (a.x < 0 || a.x > width) {
				a.vx *= -1;
			}
			if (a.y < 0 || a.y > height) {
				a.vy *= -1;
			}
		}

		requestAnimationFrame(tick);
	}

	window.addEventListener("resize", setup);
	setup();
	tick();
}
