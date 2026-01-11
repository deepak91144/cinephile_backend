import OpenAI from 'openai';

let openai: OpenAI | null = null;

export interface SearchResult {
  tmdbId: number;
  title: string;
  year: string;
  posterUrl: string;
  rating: number;
  director: string;
  type: 'movie' | 'person';
  // For person:
  knownFor?: string[];
}


// Re-write to ensure consistent JSON object wrapper
export async function searchCinemaEntities(query: string): Promise<SearchResult[]> {
    if (!process.env.OPENAI_API_KEY) {
        console.warn("OPENAI_API_KEY is not set.");
        return [];
    }

    if (!openai) {
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }

    try {
        const completion = await openai.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are a helpful cinema assistant. Find movies, actors, or directors matching the '${query}'.
                    Return a JSON object with a key "results" containing an array of items.
                    Each item must have:
                    - tmdbId: number (real ID if known, otherwise a random unique integer)
                    - title: string (Movie title or Person name)
                    - year: string (Release year or active years)
                    - posterUrl: string (URL to a poster or headshot. Use a public placeholder or standard URL if strictly known. If unknown, use "https://placehold.co/400x600?text=No+Image")
                    - rating: number (0-10)
                    - director: string (For movies: director name. For people: Main profession e.g. "Actor", "Director")
                    - type: string ("movie" or "person")
                    
                    Prioritize popular results. Limit to 5 items.`
                },
                { role: "user", content: query }
            ],
            model: "gpt-3.5-turbo-0125", // Cost effective and supports JSON mode
            response_format: { type: "json_object" },
        });

        const content = completion.choices[0].message.content;
        if (!content) return [];
        const parsed = JSON.parse(content);
        return parsed.results || [];

    } catch (e) {
        console.error("OpenAI Search failed", e);
        return [];
    }
}
