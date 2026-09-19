/**
 * What sending a text to Jev would take, worked out without asking it anything. The SDK cannot count
 * tokens short of making a call, so they are guessed from the characters: good for an order of
 * magnitude, and to be replaced by the `usage` of real calls once there are some.
 */

/** About what TypeSafe's own cookbooks come to for English prose. Other languages take more tokens. */
const charactersPerToken = 4.5;
/** Jev's list price for input; output is free. */
const usdPerMillionTokens = 0.042;
/** The most that fits in one call, for the state plus the longest question. */
export const tokensPerCall = 32_000;

export function tokens(characters: number): number {
	return Math.ceil(characters / charactersPerToken);
}

export function usd(tokenCount: number): number {
	return (tokenCount / 1_000_000) * usdPerMillionTokens;
}
