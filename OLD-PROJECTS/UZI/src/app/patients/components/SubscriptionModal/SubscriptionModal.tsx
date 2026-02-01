'use client'

import React, { useEffect, useState } from 'react';
import { Modal, Card, Button, Radio, Space, Typography, Spin } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { TariffPlan, PaymentProvider, SubscriptionPurchaseRequest } from '@/app/patients/interfaces/ISubscription';
import styles from './SubscriptionModal.module.css';

const { Text, Title } = Typography;

interface SubscriptionModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubscribe: (data: SubscriptionPurchaseRequest) => Promise<{ confirmation_url: string }>;
  onSubscriptionActive: () => void;
  checkSubscriptionStatus: () => Promise<boolean>;
  tariffPlans?: TariffPlan[];
  paymentProviders?: PaymentProvider[];
}

export function SubscriptionModal({
  visible,
  onCancel,
  onSubscribe,
  onSubscriptionActive,
  checkSubscriptionStatus,
  tariffPlans = [],
  paymentProviders = [],
}: SubscriptionModalProps) {
  const [selectedTariff, setSelectedTariff] = useState<string>();
  const [selectedProvider, setSelectedProvider] = useState<string>();
  const [step, setStep] = useState<'tariff' | 'payment' | 'waiting'>('tariff');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, []);

  // Start polling when waiting for payment
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined = undefined;

    if (step === 'waiting') {
      interval = setInterval(async () => {
        const isActive = await checkSubscriptionStatus();
        if (isActive) {
          if (interval) {
            clearInterval(interval);
            setPollingInterval(null);
          }
          await onSubscriptionActive();
          setStep('tariff');
          onCancel();
        }
      }, 3000);

      setPollingInterval(interval);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
        setPollingInterval(null);
      }
    };
  }, [step, checkSubscriptionStatus, onSubscriptionActive, onCancel]);

  const handleTariffSelect = (tariffId: string) => {
    setSelectedTariff(tariffId);
  };

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
  };

  const handleNext = () => {
    setStep('payment');
  };

  const handleBack = () => {
    setStep('tariff');
    setSelectedProvider(undefined);
  };

  const handleSubscribe = async () => {
    if (!selectedTariff || !selectedProvider) return;
    
    try {
      setIsSubmitting(true);
      const response = await onSubscribe({
        tariff_plan_id: selectedTariff,
        payment_provider_id: selectedProvider
      });
      
      if (response?.confirmation_url) {
        window.open(response.confirmation_url, '_blank');
        setStep('waiting');
      }
    } catch (error) {
      console.error('Subscription error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (step === 'waiting') {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
      setStep('tariff');
    }
    onCancel();
  };

  const renderWaitingStep = () => (
    <div className={styles.waitingContainer}>
      <Spin size="large" />
      <Title level={4}>Ожидание подтверждения оплаты</Title>
      <Text>Пожалуйста, завершите оплату в открывшемся окне. Это окно закроется автоматически после успешной оплаты.</Text>
    </div>
  );

  const renderTariffStep = () => (
    <>
      <Title level={4}>Оформите подписку для работы</Title>
      <div className={styles.tariffCards}>
        {tariffPlans.map((plan) => {
          const durationInDays = Math.floor(plan.duration / (3600 * 24));
          console.log('durationInDays', durationInDays);
          return (
            <Card
              key={plan.id}
              className={`${styles.tariffCard} ${selectedTariff === plan.id ? styles.selected : ''}`}
              onClick={() => handleTariffSelect(plan.id)}
            >
              <Title level={5}>{plan.name}</Title>
              <Text>{plan.price} руб / {durationInDays} дней</Text>
              <Text type="secondary" className={styles.description}>
                {plan.description}
              </Text>
            </Card>
          );
        })}
      </div>
      <div className={styles.footer}>
        <Button type="primary" disabled={!selectedTariff} onClick={handleNext}>
          Продолжить
        </Button>
      </div>
    </>
  );

  const renderPaymentStep = () => {
    const activeProviders = paymentProviders.filter(provider => provider.is_active);
    
    return (
      <>
        <Title level={4}>Выберите способ оплаты</Title>
        <Radio.Group onChange={(e) => handleProviderSelect(e.target.value)} value={selectedProvider}>
          <Space direction="vertical">
            {activeProviders.map((provider) => (
              <Radio key={provider.id} value={provider.id}>
                {provider.name}
              </Radio>
            ))}
          </Space>
        </Radio.Group>
        <div className={styles.footer}>
          <Button onClick={handleBack}>Назад</Button>
          <Button
            type="primary"
            disabled={!selectedProvider}
            loading={isSubmitting}
            onClick={handleSubscribe}
          >
            Оформить подписку
          </Button>
        </div>
      </>
    );
  };

  return (
    <Modal
      open={visible}
      onCancel={step === 'waiting' ? undefined : handleCancel}
      footer={null}
      width={800}
      className={styles.modal}
      closable={step !== 'waiting'}
      maskClosable={step !== 'waiting'}
    >
      {step === 'tariff' && renderTariffStep()}
      {step === 'payment' && renderPaymentStep()}
      {step === 'waiting' && renderWaitingStep()}
    </Modal>
  );
} 