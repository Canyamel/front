export default interface IPatient {
    id: string;
    fullname: string;
    email: string;
    policy: string;
    active: boolean;
    malignancy: boolean;
    birth_date: string;
    last_uzi_date: string;
}
