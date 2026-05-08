<div align="center">
  <img src="media/logo.svg" alt="Carto Logo" width="150" height="150" />
  
# Carto AI Bundler

> **A powerful, high-performance project context bundler for Visual Studio Code.**

[![Version](https://img.shields.io/visual-studio-marketplace/v/carto-dev.carto?color=blue&label=Version&style=flat-square)](#)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/carto-dev.carto?color=green&label=Installs&style=flat-square)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

<br>
<video src="media/DEMO.mp4" autoplay loop muted playsinline width="100%"></video>
</div>

---

Carto seamlessly gathers and organizes your codebase context, allowing you to easily analyze your projects using your preferred AI models. With support for multiple leading AI providers and a modern, polished user interface, Carto streamlines the process of feeding complex project data to AI assistants.

## Table of Contents
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Privacy & Security](#privacy-and-security)
- [Requirements](#requirements)

---

## Features

- **Multi-Provider AI Integration**  
  Connect directly to leading AI models. Carto supports Google Gemini, OpenAI, Groq, and local models via Ollama.
  
- **Premium Glassmorphism Interface**  
  Experience a highly polished, responsive dashboard built directly into Visual Studio Code, featuring a modern glassmorphism design.
  
- **Intelligent Context Bundling**  
  Quickly bundle your codebase for AI analysis without manually copying and pasting multiple files.
  
- **Persistent Configuration**  
  Securely manage and persist your API keys and provider preferences. Your configuration is saved locally and reliably synchronized between the extension backend and the interactive dashboard.
  
- **Local AI Support**  
  Use Ollama to analyze your codebase locally without sending sensitive data to external servers.

---

## Installation

1. Open **Visual Studio Code**.
2. Navigate to the **Extensions** view (`Ctrl+Shift+X` or `Cmd+Shift+X` on macOS).
3. Search for **"Carto"**.
4. Click **Install**.

---

## Usage

**1. Open the Dashboard**  
You can open the Carto dashboard by clicking the Carto icon in the Activity Bar, or by using the keyboard shortcut:
- **Windows / Linux**: `Ctrl+Shift+C`
- **macOS**: `Cmd+Shift+C`

**2. Configure Your Provider**  
In the dashboard or through VS Code settings, select your preferred AI provider (Gemini, OpenAI, Groq, or Ollama).

**3. Set API Keys**  
Enter your API key for the selected provider. If using Ollama, ensure your local endpoint is configured correctly.

**4. Bundle and Analyze**  
Use the intuitive interface to bundle your project context and interact with the chosen AI model.

---

## Configuration

This extension contributes the following settings that can be configured in your `settings.json` or through the VS Code Settings UI:

| Setting Key | Description | Default Value | Options |
|-------------|-------------|---------------|---------|
| `carto.aiProvider` | Select your preferred AI provider | `gemini` | `gemini`, `openai`, `groq`, `ollama` |
| `carto.openaiApiKey` | Your OpenAI API Key | `""` | - |
| `carto.geminiApiKey` | Your Google Gemini API Key | `""` | - |
| `carto.groqApiKey` | Your Groq API Key | `""` | - |
| `carto.ollamaEndpoint` | Endpoint URL for local Ollama | `http://localhost:11434` | - |

---

## Privacy and Security

Carto respects your privacy and codebase security:
- **Local Storage:** API keys are stored locally within your VS Code configuration and are never transmitted to any third-party servers other than the AI provider you explicitly select.
- **Local Processing:** Source code bundling happens locally on your machine.
- **Complete Privacy:** If you require complete data privacy, you can use the Ollama provider to run models entirely locally without an internet connection.

---

## Requirements

- **Visual Studio Code:** Version 1.118.0 or higher.
- **Ollama (Optional):** To use the Ollama provider, you must have Ollama installed and running on your local machine or an accessible network endpoint.

---

<div align="center">
  <br>
  <p>Licensed under the <a href="https://opensource.org/licenses/MIT">MIT License</a>.</p>
</div>
