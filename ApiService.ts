import KnowledgeCurator from "./main";

interface OpenAIChatMessage {
	role: "system" | "user" | "assistant";
	content: string;
}

interface OpenAIRequestPayload {
	model: string;
	messages: OpenAIChatMessage[];
	// temperature?: number; // Optional parameters can be added later
	// max_tokens?: number;
}

interface OpenAIResponsePayload {
	choices: {
		index: number;
		message: {
			role: string;
			content: string;
		};
		finish_reason: string;
	}[];
	// error?: { // Basic error structure, actual API errors can be more complex
	// 	message: string;
	// 	type: string;
	// 	code: string;
	// };
}

export class ApiService {
	plugin: KnowledgeCurator;

	constructor(plugin: KnowledgeCurator) {
		this.plugin = plugin;
	}

	async generateContent(prompt: string): Promise<string> {
		const { apiEndpoint, apiKey, modelName } = this.plugin.settings;

		if (!apiEndpoint) {
			throw new Error(
				"API Endpoint is not configured. Please check the plugin settings."
			);
		}
		if (!apiKey) {
			throw new Error(
				"API Key is not configured. Please check the plugin settings."
			);
		}
		if (!modelName) {
			throw new Error(
				"Model Name is not configured. Please check the plugin settings."
			);
		}

		const messages: OpenAIChatMessage[] = [
			{ role: "user", content: prompt },
		];

		const payload: OpenAIRequestPayload = {
			model: modelName,
			messages: messages,
		};

		try {
			const response = await fetch(apiEndpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				let errorDetails = "No additional information.";
				try {
					const errorData = await response.json();
					errorDetails = JSON.stringify(errorData, null, 2);
				} catch (e) {
					// If parsing JSON fails, use raw text
					errorDetails = await response.text();
				}
				console.error("API Error Response:", errorDetails);
				throw new Error(
					`API request failed with status ${response.status} (${response.statusText}). This could be due to an invalid API key, incorrect model name, server issues, or an invalid request. Please check your settings and the API service status. Details: ${errorDetails}`
				);
			}

			const data: OpenAIResponsePayload = await response.json();

			if (
				data.choices &&
				data.choices.length > 0 &&
				data.choices[0].message &&
				data.choices[0].message.content
			) {
				return data.choices[0].message.content.trim();
			} else {
				console.error("Unexpected API response structure:", data);
				throw new Error(
					"Received a response from the API, but it was empty or in an unexpected format. The API service might be experiencing issues or the response format has changed."
				);
			}
		} catch (error) {
			console.error("Error calling API:", error);
			if (error instanceof Error) {
				// Check for specific network-related errors
				if (error.message.includes("Failed to fetch")) {
					throw new Error(
						"Network error: Failed to reach the API endpoint. This could be due to a network outage, incorrect API URL, or CORS issues if running a local model. Please check your network connection and API Endpoint URL."
					);
				}
				// Re-throw other errors
				throw new Error(`Failed to generate content: ${error.message}`);
			}
			// Fallback for non-Error types
			throw new Error("An unknown error occurred while calling the API.");
		}
	}
}
