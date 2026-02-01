export const markings = { П11: "П11", Л23: "Л23" };

export const localizations = {
    GS: "Генитальный мазок",
    TP: "Щитовидная железа",
    BP: "Молочная железа",
    PTP: "Околощитовидная железа",
    LNP: "Лимфатический узел",
};

export const markDict = {
    cellularity: { name: "Клеточность", normStart: 0, normEnd: 1000, ref: true },
    lymphocyte_num: { name: "Лимфоциты", normStart: 0, normEnd: 1000, ref: true },
    th_norm_cell_num: { name: "Клетки ЩЖ (норма)", normStart: 6, normEnd: 1000, ref: true },
    mean_th_cell_diameter: {
        name: "Средний диаметр клетки",
        normStart: 6,
        normEnd: 1000,
        ref: true,
    },
    mean_th_cell_num_in_clusters: {
        name: "Среднее количество клеток в структуре",
        normStart: 6,
        normEnd: 1000,
        ref: true,
    },
    mean_th_cell_area: { name: "Средняя площадь клетки", normStart: 6, normEnd: 1000, ref: true },
    th_gurtle_cell_num: { name: "Клетки ЩЖ Гюртле", normStart: 0, normEnd: 0, ref: false },
    th_multiple_nuclei_cell_num: {
        name: "Клетки ЩЖ с 2 ядрами",
        normStart: 0,
        normEnd: 0,
        ref: false,
    },
    th_pseudoinclusion_cell_num: {
        name: "Клетки ЩЖ с псевдоисключением",
        normStart: 0,
        normEnd: 0,
        ref: false,
    },
    mean_cluster_area: {
        name: "Средняя площадь структуры",
        normStart: 6,
        normEnd: 1000,
        ref: true,
    },
    th_groove_cell_num: {
        name: "Клетки ЩЖ с бородой в ядре",
        normStart: 0,
        normEnd: 0,
        ref: false,
    },
    ordered_cells_shapeless_cluster_num: {
        name: "Скученная упорядоченная структура",
        normStart: 0,
        normEnd: 0,
        ref: false,
    },
    disordered_cells_shapeless_cluster_num: {
        name: "Скученная бесформенная структура",
        normStart: 0,
        normEnd: 0,
        ref: false,
    },
    microfollicle_num: {
        name: "Микрофолликулярная структура",
        normStart: 0,
        normEnd: 3,
        ref: true,
    },
    trabecula_num: { name: "Трабекулярная структура", normStart: 0, normEnd: 0, ref: false },
    papillary_num: { name: "Папилярная структура", normStart: 0, normEnd: 0, ref: false },
    mean_th_cell_aspect_ratio: {
        name: "Радиус ядра тиреоцитов",
        normStart: 10,
        normEnd: 70,
        ref: true,
    },
    mean_th_cell_nuclear_cytoplasmic_ratio: {
        name: "Среднее ядерно-цитоплазматическое отношение",
        normStart: 0.5,
        normEnd: 1,
        ref: true,
    },
    mean_th_cell_circularity: {
        name: "Кучность расположения тиреоцитов",
        normStart: 0,
        normEnd: 0,
        ref: false,
    },
    metastasis_cluster_num: {
        name: "Количество скоплений с метастазами",
        normStart: 0,
        normEnd: 0,
        ref: false,
    },
    no_metastasis_cluster_num: {
        name: "Количество скоплений без метастазов",
        normStart: 0,
        normEnd: 0,
        ref: false,
    },
};

export const tabs = [
    "Клетки ЩЖ (норма)",
    "Лимфоциты",
    "Клетки ЩЖ Гюртле (расположенных скученно)",
    "Клетки ЩЖ Гюртле (расположенных разрозненно)",
    "Клетки ЩЖ с широкой розовой цитоплазмой",
    "Клетки ЩЖ с 2 ядрами",
    "Клетки ЩЖ с псевдоисключением",
    "Клетки ЩЖ с бородой в ядре",
    "Медовые соты",
    "Скученная бесформенная структура",
    "Микрофолликулярная структура",
    "Трабекулярная структура",
    "Папилярная структура",
    "Структура с раздавленными лимфоцитами",
];

export const paginationComponentOptions = {
    rowsPerPageText: "Строк на странице",
    rangeSeparatorText: "из",
    selectAllRowsItem: true,
    selectAllRowsItemText: "Все",
};

export const customTableStyles = {
    pagination: {
        style: {
            fontFamily: "Roboto",
            fontWeight: "lighter",
            fontSize: 15,
        },
    },
    rows: {
        style: {
            fontFamily: "Roboto",
            fontWeight: "lighter",
            fontSize: 15,
            marginBottom: 2,
            "&:not(:last-of-type)": {
                borderBottomStyle: "none",
                borderBottomWidth: "0px",
                borderRadius: "5px",
            },
        },
    },
    headCells: {
        style: {
            fontWeight: "normal",
            fontSize: 15,
            fontFamily: "Roboto",
        },
    },
};

export const types = [
    {
        SNM: "Скопление без метастаза",
        STM: "Скопление с метастазом",
    },
    {
        //CELL
        CNO: "Клетки ЩЖ (норма)",
        CGE: "Клетки ЩЖ Гюртле",
        C2N: "Клетки ЩЖ с 2 или более ядрами",
        CPS: "Клетка ЩЖ с псевдоисключением",
        CFC: "Клетки ЩЖ с бородой в ядре",
        CLY: "Лимфоциты",
        //CLUSTER
        SOS: "Бесформенная структура с упорядоченным расположением клеток",
        SDS: "Бесформенная структура с неупорядоченным расположением клеток",
        SMS: "Микрофолликулярная структура",
        STS: "Трабекулярная структура",
        SPS: "Папиллярная структура",
    },
];
