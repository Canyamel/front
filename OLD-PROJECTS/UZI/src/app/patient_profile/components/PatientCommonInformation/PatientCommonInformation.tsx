import { Descriptions, DescriptionsProps, Badge, Flex } from 'antd'
import clsx from 'clsx'
// import clsx from "clsx";
export default function PatientCommonInformation(props: any) {
    const items: DescriptionsProps['items'] = [
        // {
        //   key: "1",
        //   label: "Дата рождения",
        //   children: props.patientCommonInformation.birthday.format("DD.MM.YYYY"),
        // },
        //
        //
        // {
        //   key: "2",
        //   label: "Полис",
        //   children: props.patientCommonInformation.policy,
        // },

        {
            key: '3',
            label: 'Статус',
            children: (
                <Flex gap="10px">
                    <Badge
                        color={
                            props.patientCommonInformation.active
                                ? 'geekblue'
                                : 'volcano'
                        }
                    />
                    {props.patientCommonInformation.active
                        ? 'Активен'
                        : 'Неактивен'}
                </Flex>
            ),
        },
        {
            key: '4',
            label: 'Email',
            children: props.patientCommonInformation.email,
        },
        {
            key: '6',
            label: 'Диагноз',
            children:
                typeof props.patientCommonInformation.diagnosis === 'string'
                    ? props.patientCommonInformation?.diagnosis
                    : JSON.stringify(props.patientCommonInformation.diagnosis),
            style: {
                height: '30vh',
            },
        },
        {
            key: '7',
            label: 'Подозрение',
            children: (
                <Flex gap="10px">
                    <Badge
                        color={
                            props.patientCommonInformation.malignancy
                                ? 'orange'
                                : 'gray'
                        }
                    />
                    {props.patientCommonInformation.malignancy
                        ? 'Присутствует'
                        : 'Отсутствует'}
                </Flex>
            ),
        },
    ]
    return (
        <>
            <Descriptions
                items={items}
                bordered={true}
                layout="horizontal"
                column={1}
            />
            {/*<Flex vertical className="patient_common_information">*/}
            {/*  <Flex className="data_string">*/}
            {/*    <div className="propertyName">Статус</div>*/}
            {/*    <div*/}
            {/*      className={clsx("propertyValue", {*/}
            {/*        patient_is_active:*/}
            {/*            props.patientCommonInformation.status === "active",*/}
            {/*      })}*/}
            {/*    >*/}
            {/*      {*/}
            {/*        props.patientCommonInformation.status === "active"*/}
            {/*        ? "Активен"*/}
            {/*        : "Неактивен"*/}
            {/*      }*/}
            {/*    </div>*/}
            {/*  </Flex>*/}
            {/*</Flex>*/}
        </>
    )
}
