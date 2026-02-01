import { ArgsProps } from 'antd/es/notification/interface'

export const REQUEST_ERROR: ArgsProps = {
    description: 'Запрос не удался',
    duration: 5,
    message: 'Ошибка во время выполнения запроса',
    placement: 'bottomRight',
}

export const REQUEST_SUCCESS: ArgsProps = {
    description: 'Запрос выполнен успешно',
    duration: 5,
    message: '',
    placement: 'bottomRight',
}
