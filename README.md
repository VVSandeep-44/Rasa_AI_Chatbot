# Zeno-ai

Zeno-ai is an anime knowledge assistant with a browser-based chat interface and a Rasa conversational backend. Users can ask about anime genres, characters, recommendations, plots, studios, manga adaptations, and general questions.

## Project Structure

This workspace contains two parts:

```text
Python Internship/
├── index.html       # Zeno-ai web interface
├── style.css        # Visual design and responsive layout
├── script .js       # Chat behavior and Rasa integration
└── README.md

internship/
├── actions/         # Rasa custom actions
├── data/            # NLU examples, stories, and rules
├── models/          # Trained Rasa models
├── config.yml       # NLU pipeline and policy configuration
├── credentials.yml  # Channel credentials
├── domain.yml       # Intents, entities, actions, and responses
├── endpoints.yml    # Custom action server endpoint
└── tests/           # Rasa conversation tests
```

The Rasa backend is currently located at:

```text
C:\Users\dell\OneDrive\Desktop\internship
```

## Features

- Anime-focused chat experience branded as Zeno-ai.
- Questions sent to a local Rasa REST webhook.
- Local fallback replies when the Rasa server is unavailable.
- Conversation history persisted in browser `localStorage`.
- Clear conversation control.
- Quick-prompt buttons for common anime questions.
- Speech recognition input when supported by the browser.
- Keyboard shortcuts: `/` focuses the input and `Esc` closes the chat.
- Responsive visual interface with animated background effects.

## Requirements

- Python 3.9 or a compatible Python version supported by the installed Rasa release.
- Rasa and Rasa SDK.
- Python `requests` package.
- A modern web browser. Speech recognition depends on browser support.

## Backend Setup

Open PowerShell and create or activate an environment for the Rasa project:

```powershell
cd "C:\Users\dell\OneDrive\Desktop\internship"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install rasa rasa-sdk requests
```

Train the assistant after changing NLU data, stories, rules, or the domain:

```powershell
rasa train
```

Run the two backend services in separate PowerShell windows:

```powershell
# Window 1: custom actions
cd "C:\Users\dell\OneDrive\Desktop\internship"
.\.venv\Scripts\Activate.ps1
rasa run actions --port 5055
```

```powershell
# Window 2: Rasa REST API
cd "C:\Users\dell\OneDrive\Desktop\internship"
.\.venv\Scripts\Activate.ps1
rasa run --enable-api --cors "*" --port 5005
```

The frontend expects the REST webhook at:

```text
http://localhost:5005/webhooks/rest/webhook
```

The action server endpoint is configured in `endpoints.yml` as:

```text
http://localhost:5055/webhook
```

Set the RapidAPI key before starting the action server. PowerShell environment variables apply to the current terminal session:

```powershell
$env:RAPIDAPI_KEY = "your_rapidapi_key"
```

Use `.env.example` as a template, but keep the real key in your local environment and never commit it.

## Run the Frontend

Serve the frontend directory with a local HTTP server:

```powershell
cd "D:\Python Internship"
python -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080) in a browser. Opening `index.html` directly may work for the static UI, but using a local server gives the browser a consistent origin for API requests.

## Conversation Flow

1. The user opens the chat widget and submits a message.
2. `script .js` sends the message to the Rasa REST webhook.
3. Rasa classifies the message using the examples in `internship/data/nlu.yml`.
4. Rasa selects a response or custom action using `stories.yml`, `rules.yml`, and `domain.yml`.
5. `action_answer` can forward general questions to the configured external AI service.
6. If the request fails, the frontend displays a local fallback response and marks the assistant as offline.

## Key Files

- `index.html`: page structure, chat controls, quick prompts, and accessibility labels.
- `style.css`: colors, layout, responsive behavior, animations, and background effects.
- `script .js`: API requests, history persistence, fallback behavior, typing state, and speech input.
- `internship/config.yml`: Rasa NLU pipeline and fallback classifier.
- `internship/domain.yml`: supported intents, entities, actions, and utterances.
- `internship/data/nlu.yml`: training examples for anime and general questions.
- `internship/data/stories.yml`: multi-turn conversation paths.
- `internship/data/rules.yml`: deterministic goodbye and bot-challenge responses.
- `internship/actions/actions.py`: custom action implementation for AI-backed answers.

## Testing

Run the Rasa story tests from the backend directory:

```powershell
cd "C:\Users\dell\OneDrive\Desktop\internship"
.\.venv\Scripts\Activate.ps1
rasa test
```

To inspect the NLU model interactively:

```powershell
rasa shell
```

## Important Security Notes

The backend reads the RapidAPI credential from the `RAPIDAPI_KEY` environment variable. The previously exposed key should be revoked or rotated in the RapidAPI dashboard. Do not commit API keys, credentials, or generated secrets to source control.

The frontend sends requests to a local backend and is not intended to be a production deployment as-is. For production, configure a restricted CORS policy, secure the backend behind HTTPS, add authentication and rate limiting, and move third-party API access to protected server-side configuration.

## Current Limitations

- The frontend’s Rasa URL is hard-coded to `localhost:5005`.
- Speech recognition is unavailable in browsers that do not expose the Web Speech API.
- Chat history is stored only in the current browser profile.
- The backend training data is primarily anime-focused and has limited examples.
- Some anime inquiry stories reference `action_anime_query`; verify or implement that action before relying on those flows.
