export type Modals = 'addNode' | 'editNode'

export interface IPaginated<T> {
	count: number
	next: string
	previous: string
	results: T[]
}
