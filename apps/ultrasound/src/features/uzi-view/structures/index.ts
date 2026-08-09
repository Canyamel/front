// Контуры структур ЩЖ (доли, перешеек), которые вьюер рисует поверх снимка.
//
// Загрузка пользовательского JSON и его хранение в localStorage удалены
// вместе с блоком «JSON загрузки ЩЖ» на странице загрузки снимка.
// Остались тип, аксессоры и демонстрационный набор, который вьюер
// показывает, когда к снимку не приложены структуры.
export type {
	ThyroidStructureDetails,
	ThyroidStructureFrame,
	ThyroidStructureJson,
} from './types'
export { getStructureFrame, getStructureFrameKeys } from './types'

export { demoThyroidStructures } from './demoData'
