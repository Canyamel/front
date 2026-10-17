import type { ThyroidReportModel } from '../model/types'

const ESCAPES: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;',
}

function esc(value: string | number | undefined | null): string {
	if (value == null) return ''
	return String(value).replace(/[&<>"']/g, ch => ESCAPES[ch])
}

function clean(value: string | undefined): string {
	const trimmed = String(value ?? '').trim()
	return trimmed === '—' ? '' : trimmed
}

/** Однородные части одного предложения — через запятую. */
function clause(...parts: (string | undefined)[]): string {
	return parts.map(clean).filter(Boolean).join(', ')
}

/** Самостоятельные предложения — через точку, с точкой в конце. */
function paragraph(...sentences: (string | undefined)[]): string {
	const kept = sentences
		.map(clean)
		.filter(Boolean)
		.map(s => s.replace(/[.;,]+$/, ''))
	if (!kept.length) return ''
	return `${kept.join('. ')}.`
}

/** Строка описания: жирная подпись + значение. Пустые значения не печатаем. */
function line(label: string, value: string, options: { always?: boolean; period?: boolean } = {}): string {
	const trimmed = clean(value)
	if (!trimmed && !options.always) return ''

	const body = trimmed || '—'
	const withPeriod = options.period && !/[.!?]$/.test(body) ? `${body}.` : body
	return `<p class="line"><span class="line-label">${esc(label)}:</span> ${esc(withPeriod)}</p>`
}

function section(title: string, body: string): string {
	if (!body.trim()) return ''
	return `
		<section class="row">
			<h2 class="row-title">${esc(title)}</h2>
			<div class="row-body">${body}</div>
		</section>`
}

function lobeText(lobe: ThyroidReportModel['right']): string {
	return [
		lobe.length !== '—' ? `длина ${lobe.length} мм` : '',
		lobe.width !== '—' ? `ширина ${lobe.width} мм` : '',
		lobe.depth !== '—' ? `толщина ${lobe.depth} мм` : '',
		lobe.volume !== '—' ? `объём ${lobe.volume} см³` : '',
	]
		.filter(Boolean)
		.join(', ')
}

/** «Подробности» размеров — перешеек, доли, суммарный объём, подвижность. */
function dimensionsDetails(model: ThyroidReportModel): string {
	const parts: string[] = []

	if (model.isthmus !== '—') parts.push(`Перешеек: толщина ${model.isthmus} мм.`)

	const right = lobeText(model.right)
	if (right) parts.push(`Правая доля: ${right}.`)

	const left = lobeText(model.left)
	if (left) parts.push(`Левая доля: ${left}.`)

	const tail = [
		model.totalVolume !== '—' ? `Объём щитовидной железы: ${model.totalVolume} см³` : '',
		clean(model.mobility) ? `подвижность долей при глотании: ${clean(model.mobility)}` : '',
	]
		.filter(Boolean)
		.join(', ')
	if (tail) parts.push(`${tail}.`)

	if (!parts.length) return ''
	return `${parts.join(' ').slice(0, -1)} (определены ассистентом по всем загруженным снимкам пациента).`
}

function conclusionText(model: ThyroidReportModel): string {
	const own = clean(model.conclusion)
	if (own) return own

	// Врач не заполнил заключение — печатаем то, что следует из разметки,
	// вместо пустого раздела.
	if (model.highestTirads != null) {
		return `Выявлены узловые изменения щитовидной железы, наибольшая категория TI-RADS ${model.highestTirads}.`
	}
	return model.hasNodules
		? 'Выявлены узловые изменения щитовидной железы.'
		: 'Узловые изменения щитовидной железы не выявлены.'
}

const STYLES = `
	@page { size: A4; margin: 0; }

	* { box-sizing: border-box; }

	body {
		margin: 0;
		font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
		font-size: 10.5pt;
		line-height: 1.45;
		color: #000;
		background: #fff;
	}

	.sheet { padding: 0; }

	.masthead {
		display: flex;
		justify-content: flex-end;
		margin-bottom: 18px;
	}
	.masthead-inner { max-width: 62%; font-size: 9pt; line-height: 1.4; }
	.masthead-name { font-weight: 700; }

	h1 {
		margin: 0 0 14px;
		font-size: 13pt;
		text-align: center;
		line-height: 1.35;
	}

	.row {
		display: flex;
		gap: 18px;
		align-items: flex-start;
		padding: 10px 0;
		border-top: 1px solid #000;
		break-inside: avoid;
		page-break-inside: avoid;
	}
	.row-title {
		flex: 0 0 168px;
		margin: 0;
		font-size: 10.5pt;
		font-weight: 700;
	}
	.row-body { flex: 1 1 auto; min-width: 0; }

	.line { margin: 0 0 4px; }
	.line:last-child { margin-bottom: 0; }
	.line-label { font-weight: 700; }

	.plain { margin: 0 0 4px; }
	.plain:last-child { margin-bottom: 0; }

	.footer {
		display: flex;
		justify-content: space-between;
		gap: 24px;
		padding-top: 6px;
		border-top: 1px solid #000;
		font-size: 7.5pt;
		line-height: 1.35;
		color: #000;
	}
	.footer-col { max-width: 48%; }
	.footer-col.right { text-align: right; }

	@media screen {
		body { background: #f0f0f0; padding: 24px 0; }
		.sheet {
			width: 210mm;
			min-height: 297mm;
			margin: 0 auto;
			padding: 14mm 14mm 30mm;
			background: #fff;
			box-shadow: 0 1px 6px rgba(0, 0, 0, 0.22);
		}
		.footer { margin-top: 28px; }
	}

	@media print {
		/*
		 * Обнуление полей @page — единственный способ убрать колонтитулы
		 * браузера (URL, дата, номер страницы): печатает он их в поля
		 * страницы, и отключить иначе нечем. Поэтому поля листа задаются
		 * padding-ом, а колонтитул отступает от края сам.
		 */
		.sheet { padding: 14mm 14mm 26mm; }
		.footer {
			position: fixed;
			left: 14mm;
			right: 14mm;
			bottom: 10mm;
			background: #fff;
		}
	}
`

export function renderReportHtml(model: ThyroidReportModel): string {
	const masthead = model.organization ? `<div class="masthead-name">${esc(model.organization)}</div>` : ''

	const studyInfo = [
		line('Предварительный диагноз', model.preliminaryDiagnosis),
		line('Цель исследования', model.studyReason),
		line('Обоснование', model.justification),
		line('Проекция снимка', model.projection),
		line('Дата исследования', model.studyDateTime, { always: true }),
	].join('')

	const thyroid = paragraph(
		model.thyroidDescription,
		clean(model.position) ? clause(`Расположение: ${clean(model.position)}`, model.positionComment) : '',
		clean(model.contours) ? `Контуры: ${clean(model.contours)}` : '',
	)

	const sizes = [
		paragraph(clause(model.sizeChanged ? 'изменены' : 'не изменены', model.sizeDescription)),
		dimensionsDetails(model) ? `<span class="line-label">Подробности:</span> ${esc(dimensionsDetails(model))}` : '',
	]
		.filter(Boolean)
		.join(' ')

	const parenchyma = paragraph(
		clean(model.vascularPattern)
			? clause(`сосудистый рисунок паренхимы железы: ${clean(model.vascularPattern)}`, model.vascularDescription)
			: '',
		clean(model.structure) ? clause(`Структура: ${clean(model.structure)}`, model.structureDescription) : '',
	)

	const parathyroid = paragraph(
		model.parathyroidDescription,
		`Объёмные образования в проекции околощитовидных желёз: ${
			model.parathyroidMassesFound ? 'выявлены' : 'не выявлены'
		}`,
	)

	// «Размеры» и «Паренхима» собираются из нескольких полей, поэтому кладём
	// их сырым HTML — внутренние значения уже экранированы.
	const description = [
		line('Операции', model.operations, { period: true }),
		thyroid ? `<p class="line"><span class="line-label">Щитовидная железа:</span> ${esc(thyroid)}</p>` : '',
		sizes ? `<p class="line"><span class="line-label">Размеры:</span> ${sizes}</p>` : '',
		line('Эхогенность', model.echogenicity, { period: true }),
		parenchyma ? `<p class="line"><span class="line-label">Паренхима:</span> ${esc(parenchyma)}</p>` : '',
		line('Очаговые изменения', model.focalChanges, { always: true, period: true }),
		parathyroid
			? `<p class="line"><span class="line-label">Околощитовидные железы:</span> ${esc(parathyroid)}</p>`
			: '',
		line('Регионарные лимфатические узлы', model.lymphNodes, { period: true }),
		line('Дополнительная информация', model.additionalData, { period: true }),
	].join('')

	const footerLeft = [
		model.doctorName ? `Врач: ${esc(model.doctorName)}` : 'Врач: ______________________',
		esc(model.doctorSpeciality),
		esc(model.organization),
		esc(model.studyDateTime),
	]
		.filter(Boolean)
		.join('<br>')

	const footerRight = [
		`Пациент: ${esc(model.patientName)}`,
		model.patientBirthDate
			? `${esc(model.patientAge)}${model.patientAge ? ' ' : ''}(${esc(model.patientBirthDate)})`.trim()
			: '',
		model.patientPolicy ? `ОМС ${esc(model.patientPolicy)}` : '',
	]
		.filter(Boolean)
		.join('<br>')

	return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Заключение УЗИ щитовидной железы — ${esc(model.patientName)}</title>
<style>${STYLES}</style>
</head>
<body>
	<div class="sheet">
		${masthead ? `<div class="masthead"><div class="masthead-inner">${masthead}</div></div>` : ''}

		<h1>Ультразвуковое исследование щитовидной железы<br>и паращитовидных желез</h1>

		${section('Информация об исследовании', studyInfo)}
		${section('Описание', description)}
		${section('Заключение', `<p class="plain">${esc(conclusionText(model))}</p>`)}
		${clean(model.recommendations) ? section('Рекомендации', `<p class="plain">${esc(clean(model.recommendations))}</p>`) : ''}
		${section('Информация об оборудовании', line('Название устройства', model.deviceName, { always: true }))}

		<div class="footer">
			<div class="footer-col">${footerLeft}</div>
			<div class="footer-col right">${footerRight}</div>
		</div>
	</div>
</body>
</html>`
}
