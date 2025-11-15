export interface Picture {
	name: string;
	url: string;
	picName?: string;
	extension?: string;
}

export interface TechStackResponse {
	stack: Picture[];
}
