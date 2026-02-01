'use client'

import React from 'react';
import { Alert, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Subscription, TariffPlan } from '@/app/patients/interfaces/ISubscription';

interface SubscriptionInfoProps {
  subscription?: Subscription;
  tariffPlan?: TariffPlan;
  onSubscribe: () => void;
}

export function SubscriptionInfo({ subscription, tariffPlan, onSubscribe }: SubscriptionInfoProps) {
  if (!subscription) {
    return (
      <Alert
        message="Нет активной подписки"
        description={
          <Button type="primary" icon={<PlusOutlined />} onClick={onSubscribe}>
            Оформить подписку
          </Button>
        }
        type="warning"
        showIcon
      />
    );
  }

  if (!tariffPlan) return null;

  const durationInDays = Math.floor(tariffPlan.duration / (24 * 60 * 60 * 1000000000));
  const endDate = dayjs(subscription.end_date);
  const daysLeft = endDate.diff(dayjs(), 'day');

  return (
    <Alert
      message="Активная подписка"
      description={
        <div>
          <p>Тариф: {tariffPlan.name}</p>
          <p>Описание: {tariffPlan.description}</p>
          <p>Стоимость: {tariffPlan.price} руб / {durationInDays} дней</p>
          <p>Действует до: {endDate.format('DD.MM.YYYY')} (осталось {daysLeft} дней)</p>
        </div>
      }
      type="success"
      showIcon
    />
  );
} 