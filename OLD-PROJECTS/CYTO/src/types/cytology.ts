interface OriginalImage {
  id: number;
  create_date: string;
  delay_time: number;
  viewed_flag: boolean;
  image: string;
}

interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  fathers_name: string;
  birth_date: string;
  personal_policy: string;
  email: string;
  is_active: boolean;
}

interface CellCharacteristics {
  cellularity: number;
  lymphocyte_num: number;
  th_norm_cell_num: number;
  mean_th_cell_area: number;
  th_groove_cell_num: number;
  th_gurtle_cell_num: number;
  mean_th_cell_diameter: number;
  mean_th_cell_circularity: number;
  mean_th_cell_aspect_ratio: number;
  th_multiple_nuclei_cell_num: number;
  th_pseudoinclusion_cell_num: number;
  mean_th_cell_nuclear_cytoplasmic_ratio: number;
}

interface ClusterCharacteristics {
  papillary_num: number;
  trabecula_num: number;
  mean_cluster_area: number;
  microfollicle_num: number;
  mean_th_cell_num_in_clusters: number;
  ordered_cells_shapeless_cluster_num: number;
  disordered_cells_shapeless_cluster_num: number;
}

interface Details {
  probs: number[];
  cell_characteristics: CellCharacteristics;
  cluster_characteristics: ClusterCharacteristics;
}

interface Info {
  patient: Patient;
  acceptance_datetime: string;
  diagnosis: string;
  patient_card_id: number;
  id: number;
  is_last: boolean;
  diagnos_date: string;
  details: Details;
  diagnostic_marking: string;
  diagnostic_number: number;
  material_type: string;
  calcitonin: number;
  calcitonin_in_flush: number;
  thyroglobulin: number;
  prev: null | any;
  parent_prev: number;
  original_image: number;
}

export interface ICytology {
  original_image: OriginalImage;
  info: Info;
}