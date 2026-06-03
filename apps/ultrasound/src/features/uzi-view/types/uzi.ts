export interface IUzi {
    id: string
    projection: 'long' | 'cross'
    checked: boolean
    external_id: string
    author_id: string
    device_id: number
    status: 'new' | 'pending' | 'completed'
    create_at: string
}

export interface IUziPage {
    id: string
    uzi_id: string
    page: number
}
