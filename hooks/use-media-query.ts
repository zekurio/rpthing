import * as React from "react";

export function useMediaQuery(query: string): boolean {
	const [matches, setMatches] = React.useState<boolean>(false);

	React.useEffect(() => {
		if (typeof window === "undefined") return;
		const mql = window.matchMedia(query);
		const onChange = (e: MediaQueryListEvent) => {
			setMatches(e.matches);
		};

		// Set initial value
		setMatches(mql.matches);

		// Listen for changes
		mql.addEventListener("change", onChange);
		return () => mql.removeEventListener("change", onChange);
	}, [query]);

	return matches;
}
