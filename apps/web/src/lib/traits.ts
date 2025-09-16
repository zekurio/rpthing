export const TRAIT_GRADES = [
	"F",
	"E-",
	"E",
	"E+",
	"D-",
	"D",
	"D+",
	"C-",
	"C",
	"C+",
	"B-",
	"B",
	"B+",
	"A-",
	"A",
	"A+",
	"S-",
	"S",
	"S+",
	"Z",
] as const;

export type TraitGrade = (typeof TRAIT_GRADES)[number];

export function gradeForValue(value: number): TraitGrade {
	const idx = Math.min(Math.max(1, Math.round(value)), 20) - 1;
	return TRAIT_GRADES[idx];
}
