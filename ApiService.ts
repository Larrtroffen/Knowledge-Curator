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

		if (!apiEndpoint || !apiKey || !modelName) {
			throw new Error(
				"API settings (Endpoint, Key, Model Name) are not configured. Please check the plugin settings."
			);
		}

		const messages: OpenAIChatMessage[] = [
			// You can add a system message here if needed, e.g., to define the AI's persona
			// { role: "system", content: "You are a helpful assistant that writes detailed notes based on a title and template." },
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
				const errorBody = await response.text(); // Get error details from response body
				console.error("API Error Response:", errorBody);
				throw new Error(
					`API request failed with status ${response.status}: ${response.statusText}. Details: ${errorBody}`
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
				throw new Error(
					"No content received from API or unexpected response structure."
				);
			}
		} catch (error) {
			console.error("Error calling API:", error);
			// Re-throw the error to be handled by the caller (e.g., GeneratorService)
			if (error instanceof Error) {
				throw new Error(`Failed to generate content: ${error.message}`);
			}
			throw new Error("An unknown error occurred while calling the API.");
		}
	}
}
