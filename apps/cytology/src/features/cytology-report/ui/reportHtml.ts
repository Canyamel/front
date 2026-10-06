import type { CytologyReportModel } from '../model/types'

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

/** Строка «подпись: значение». Пустые значения не печатаем. */
function line(label: string, value: string, options: { always?: boolean } = {}): string {
	const trimmed = clean(value)
	if (!trimmed && !options.always) return ''
	return `<p class="line"><span class="line-label">${esc(label)}:</span> ${esc(trimmed || '—')}</p>`
}

function section(title: string, body: string): string {
	if (!body.trim()) return ''
	return `
		<section class="row">
			<h2 class="row-title">${esc(title)}</h2>
			<div class="row-body">${body}</div>
		</section>`
}

function characteristicsTable(model: CytologyReportModel): string {
	if (!model.characteristics.length) return ''

	const rows = model.characteristics
		.map(
			item => `
			<tr>
				<td>${esc(item.name)}</td>
				<td class="num">${esc(item.value)}</td>
				<td class="num">${esc(item.reference)}</td>
				<td>${esc(item.verdict)}</td>
			</tr>`,
		)
		.join('')

	return `
		<table class="table">
			<thead>
				<tr>
					<th>Характеристика</th>
					<th class="num">Результат</th>
					<th class="num">Референс</th>
					<th>Оценка</th>
				</tr>
			</thead>
			<tbody>${rows}</tbody>
		</table>`
}

function segmentsTable(model: CytologyReportModel): string {
	if (!model.segments.length) return ''

	const rows = model.segments
		.map(
			item => `
			<tr>
				<td>${esc(item.name)}</td>
				<td class="num">${esc(item.total)}</td>
				<td class="num">${esc(item.byAi)}</td>
				<td class="num">${esc(item.byDoctor)}</td>
			</tr>`,
		)
		.join('')

	return `
		<table class="table">
			<thead>
				<tr>
					<th>Объект</th>
					<th class="num">Всего</th>
					<th class="num">ИИ</th>
					<th class="num">Врач</th>
				</tr>
			</thead>
			<tbody>${rows}</tbody>
		</table>`
}

/**
 * Печатная форма отчёта: самостоятельный документ для iframe и печати.
 * Стили инлайновые — страница живёт вне приложения и ничего не подгружает.
 */
export function renderCytologyReportHtml(model: CytologyReportModel): string {
	const study = [
		line('Номер исследования', model.studyNumber, { always: true }),
		line('Дата забора материала', model.studyDate, { always: true }),
		line('Локализация забора', model.materialType),
		line('Цель исследования', model.studyReason),
		line('Клинические данные', model.clinicalData),
	].join('')

	const lab = [
		line('Кальцитонин', model.calcitonin),
		line('Кальцитонин в смыве', model.calcitoninInFlush),
		line('Тиреоглобулин', model.thyroglobulin),
	].join('')

	return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Цитологическое исследование</title>
<style>
	@page { size: A4; margin: 16mm 14mm; }
	* { box-sizing: border-box; }
	body {
		margin: 0;
		padding: 18px 20px;
		font-family: "Times New Roman", Times, serif;
		font-size: 13px;
		line-height: 1.45;
		color: #111;
		background: #fff;
	}
	h1 {
		margin: 0 0 4px;
		font-size: 17px;
		text-align: center;
		text-transform: uppercase;
		letter-spacing: 0.4px;
	}
	.subtitle { margin: 0 0 14px; text-align: center; font-size: 12px; color: #444; }
	.head { margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #999; }
	.row { display: flex; gap: 12px; margin-bottom: 10px; page-break-inside: avoid; }
	.row-title {
		flex: 0 0 150px;
		margin: 0;
		font-size: 13px;
		font-weight: 700;
		text-transform: uppercase;
	}
	.row-body { flex: 1 1 auto; }
	.line { margin: 0 0 3px; }
	.line-label { font-weight: 700; }
	.table { width: 100%; border-collapse: collapse; margin: 4px 0 8px; font-size: 12px; }
	.table th, .table td { border: 1px solid #999; padding: 3px 6px; text-align: left; }
	.table th { background: #f0f0f0; font-weight: 700; }
	.num { text-align: right; white-space: nowrap; }
	.conclusion { white-space: pre-wrap; }
	.sign { display: flex; justify-content: space-between; margin-top: 26px; font-size: 12px; }
	@media print {
		body { padding: 0; }
		.row { break-inside: avoid; }
		.table { break-inside: auto; }
		tr { break-inside: avoid; }
	}
</style>
</head>
<body>
	<h1>Цитологическое исследование</h1>
	<p class="subtitle">Протокол исследования от ${esc(model.printedAt)}</p>

	<div class="head">
		${line('Пациент', model.patientName, { always: true })}
		${line('Дата рождения', model.patientBirthDate)}
		${line('Полис', model.patientPolicy)}
	</div>

	${section('Исследование', study)}
	${section('Показатели', lab)}
	${section('Категория', line('Заключение по разметке', model.category, { always: true }))}
	${section('Характеристики', characteristicsTable(model))}
	${section('Найденные объекты', segmentsTable(model))}
	${section('Заключение', `<p class="conclusion">${esc(model.conclusion)}</p>`)}
	${section('Рекомендации', `<p class="conclusion">${esc(clean(model.recommendations))}</p>`)}

	<div class="sign">
		<span>Врач: ${esc(model.doctorName)}</span>
		<span>Подпись: ______________________</span>
	</div>
</body>
</html>`
}
