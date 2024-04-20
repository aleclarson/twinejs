import {jaroWinkler} from '@skyra/jaro-winkler';

export function similaritySort(
	strings: string[],
	query: string,
	caseInsensitive = false
): string[] {
	if (caseInsensitive) {
		query = query.toLowerCase();
	}
	let scoredStrings = strings.map(name => {
		const score = jaroWinkler(
			query,
			caseInsensitive ? name.toLowerCase() : name
		);
		return [name, score] as const;
	});
	scoredStrings.sort((a, b) => b[1] - a[1]);
	if (scoredStrings[0][1] >= 0.8) {
		scoredStrings = scoredStrings.filter(s => s[1] >= 0.8);
	} else if (scoredStrings[0][1] >= 0.6) {
		scoredStrings = scoredStrings.filter(s => s[1] >= 0.6);
	}
	return scoredStrings.map(s => s[0]);
}
