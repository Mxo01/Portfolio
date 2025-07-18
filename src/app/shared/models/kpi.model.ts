export interface Kpi {
	label: string;
	value: string;
}

export interface KpisResponse {
	kpis: Kpi[];
}
