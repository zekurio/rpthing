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

export function getGradeColor(grade: TraitGrade): string {
	switch (grade) {
		case "F":
			return "bg-red-100 text-red-800 border-red-200";
		case "E-":
		case "E":
		case "E+":
			return "bg-red-50 text-red-700 border-red-100";
		case "D-":
		case "D":
		case "D+":
			return "bg-orange-100 text-orange-800 border-orange-200";
		case "C-":
		case "C":
		case "C+":
			return "bg-yellow-100 text-yellow-800 border-yellow-200";
		case "B-":
		case "B":
		case "B+":
			return "bg-green-100 text-green-800 border-green-200";
		case "A-":
		case "A":
		case "A+":
			return "bg-blue-100 text-blue-800 border-blue-200";
		case "S-":
		case "S":
		case "S+":
			return "bg-purple-100 text-purple-800 border-purple-200";
		case "Z":
			return "bg-amber-100 text-amber-900 border-amber-300";
		default:
			return "bg-gray-100 text-gray-800 border-gray-200";
	}
}
