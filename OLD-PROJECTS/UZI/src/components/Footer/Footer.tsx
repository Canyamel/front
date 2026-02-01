'use client'
import './Footer.css'
import Spacer from '@/components/Universal/Spacer/Spacer'
import Text from '@/components/Universal/Text/Text'
export default function Footer() {
    return (
        <div className="footer">
            <Spacer space={30} />
            <Text>MEDML MEPHI</Text>
            <Spacer space={30} />
            <Text>Адрес:</Text>
            <Text>Москва, Каширское ш. 31</Text>
            <Spacer space={20} />
            <Text>Контакты:</Text>
            <Text>1800 123 4567</Text>
            <Text>info@innovativemedhtech.com</Text>
            <Spacer space={20} />
            <div className="line"></div>
            <Spacer space={10} />
            <Text className="under_line">2024 MEDML MEPHI</Text>
            <Spacer space={30} />
        </div>
    )
}
