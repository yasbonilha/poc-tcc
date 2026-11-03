import { useEffect, useState } from 'react';
import { AppState, Platform, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { focusManager, QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { TrainingChart } from './components/TrainingChart';

type TrainingMetrics = {
  epoch: number;
  totalLoss: number;
  dataLoss: number;
  physicsLoss: number;
  validationLoss: number;
  elapsedSeconds: number;
  learningRate: number;
};

const pollingIntervalMs = 2500;
const trainingStartedAt = Date.now();
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
    },
  },
});

async function fetchTrainingMetrics(): Promise<TrainingMetrics> {
  await new Promise<void>((resolve) => setTimeout(resolve, 250));

  const elapsedSeconds = Math.floor((Date.now() - trainingStartedAt) / 1000);
  const epoch = Math.floor((Date.now() - trainingStartedAt) / pollingIntervalMs) + 1;

  return {
    epoch,
    totalLoss: 1.15 * Math.exp(-epoch / 28) + 0.045,
    dataLoss: 0.62 * Math.exp(-epoch / 20) + 0.018,
    physicsLoss: 0.48 * Math.exp(-epoch / 34) + 0.025,
    validationLoss: 1.22 * Math.exp(-epoch / 25) + 0.09 + Math.sin(epoch / 3) * 0.012,
    elapsedSeconds,
    learningRate: 0.001 * Math.pow(0.92, Math.floor(epoch / 15)),
  };
}

function formatElapsedTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricDetail}>{detail}</Text>
    </View>
  );
}

function TrainingDashboard() {
  const [history, setHistory] = useState<TrainingMetrics[]>([]);
  const { data, error, isError, isPending, isFetching, refetch } = useQuery({
    queryKey: ['training-metrics'],
    queryFn: fetchTrainingMetrics,
    refetchInterval: pollingIntervalMs,
    refetchIntervalInBackground: false,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
    staleTime: 0,
  });

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    if (AppState.currentState !== null) {
      focusManager.setFocused(AppState.currentState === 'active');
    }

    const subscription = AppState.addEventListener('change', (state) => {
      focusManager.setFocused(state === 'active');
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!data) {
      return;
    }

    setHistory((previousHistory) => {
      const lastMetric = previousHistory[previousHistory.length - 1];
      if (lastMetric?.epoch === data.epoch) {
        return [...previousHistory.slice(0, -1), data];
      }

      return [...previousHistory.slice(-29), data];
    });
  }, [data]);

  if (isPending && !data) {
    return (
      <View style={styles.centeredState}>
        <Text style={styles.loadingTitle}>Conectando ao treino</Text>
        <Text style={styles.loadingMessage}>Buscando as métricas mais recentes...</Text>
      </View>
    );
  }

  if (isError && !data) {
    return (
      <View style={styles.centeredState}>
        <Text style={styles.errorTitle}>Não foi possível obter os dados</Text>
        <Text style={styles.errorMessage}>{error.message}</Text>
        <Text accessibilityRole="button" onPress={() => refetch()} style={styles.retryButton}>
          Tentar novamente
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>MONITORAMENTO DE TREINO</Text>
          <Text style={styles.title}>PINN · Escoamento do ar</Text>
          <Text style={styles.subtitle}>Telescópio Gigante de Magalhães</Text>
        </View>
        <View style={styles.liveBadge}>
          <View style={[styles.liveDot, isFetching && styles.liveDotFetching]} />
          <Text style={styles.liveLabel}>{isFetching ? 'ATUALIZANDO' : 'AO VIVO'}</Text>
        </View>
      </View>

      {isError && (
        <View style={styles.inlineError}>
          <Text style={styles.inlineErrorText}>Falha ao atualizar: {error.message}</Text>
          <Text accessibilityRole="button" onPress={() => refetch()} style={styles.inlineRetry}>
            Tentar novamente
          </Text>
        </View>
      )}

      <View style={styles.metricsGrid}>
        <MetricCard
          label="ÉPOCA"
          value={data ? data.epoch.toLocaleString('pt-BR') : '—'}
          detail="iteração atual"
        />
        <MetricCard
          label="LOSS TOTAL"
          value={data ? data.totalLoss.toFixed(4) : '—'}
          detail="objetivo combinado"
        />
        <MetricCard
          label="ERRO DE VALIDAÇÃO"
          value={data ? data.validationLoss.toFixed(4) : '—'}
          detail="conjunto de validação"
        />
        <MetricCard
          label="TAXA DE APRENDIZADO"
          value={data ? data.learningRate.toExponential(2) : '—'}
          detail="learning rate"
        />
      </View>

      <View style={styles.trainingTime}>
        <View style={styles.timeIcon}>
          <Text style={styles.timeIconText}>◷</Text>
        </View>
        <View style={styles.timeCopy}>
          <Text style={styles.timeLabel}>TEMPO DE TREINAMENTO</Text>
          <Text style={styles.timeValue}>
            {data ? formatElapsedTime(data.elapsedSeconds) : '00:00:00'}
          </Text>
        </View>
        <Text style={styles.pollingLabel}>ATUALIZA A CADA 2,5 S</Text>
      </View>

      <View style={styles.chartCard}>
        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>Histórico das métricas</Text>
            <Text style={styles.sectionSubtitle}>Evolução das losses por época</Text>
          </View>
          <Text style={styles.sampleCount}>{history.length} AMOSTRAS</Text>
        </View>
        <TrainingChart metrics={history} />
        <View style={styles.chartFooter}>
          <Text style={styles.chartFooterText}>Dados demonstrativos</Text>
          <Text style={styles.chartFooterText}>Últimas {history.length} épocas</Text>
        </View>
      </View>

      <Text style={styles.disclaimer}>
        Métricas simuladas para a prova de conceito. A função de consulta pode ser substituída por
        uma requisição à fonte de dados do treino.
      </Text>
    </ScrollView>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <TrainingDashboard />
      </SafeAreaView>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a0f1b',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 36,
    gap: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 4,
  },
  eyebrow: {
    color: '#74e0bd',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    marginBottom: 8,
  },
  title: {
    color: '#f3f6fc',
    fontSize: 21,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#8792a8',
    fontSize: 12,
    marginTop: 5,
  },
  liveBadge: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#14251f',
    borderColor: '#224237',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginTop: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#56d5a5',
  },
  liveDotFetching: {
    backgroundColor: '#f3bd62',
  },
  liveLabel: {
    color: '#9ae9cb',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '48%',
    minHeight: 112,
    flexGrow: 1,
    backgroundColor: '#111827',
    borderColor: '#202b3d',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    justifyContent: 'space-between',
  },
  metricLabel: {
    color: '#8290a8',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
  metricValue: {
    color: '#f2f5fc',
    fontSize: 23,
    fontWeight: '700',
    letterSpacing: -0.7,
    marginTop: 9,
  },
  metricDetail: {
    color: '#66738a',
    fontSize: 10,
    marginTop: 4,
  },
  trainingTime: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderColor: '#202b3d',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  timeIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#1b2939',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  timeIconText: {
    color: '#79d8bc',
    fontSize: 20,
  },
  timeCopy: {
    flex: 1,
  },
  timeLabel: {
    color: '#8290a8',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  timeValue: {
    color: '#f2f5fc',
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
  pollingLabel: {
    color: '#66738a',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  chartCard: {
    backgroundColor: '#111827',
    borderColor: '#202b3d',
    borderWidth: 1,
    borderRadius: 16,
    paddingTop: 16,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#f2f5fc',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: '#78859b',
    fontSize: 10,
    marginTop: 4,
  },
  sampleCount: {
    color: '#78859b',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  chartFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  chartFooterText: {
    color: '#65728a',
    fontSize: 9,
  },
  disclaimer: {
    color: '#65728a',
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: 6,
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingTitle: {
    color: '#f2f5fc',
    fontSize: 18,
    fontWeight: '700',
  },
  loadingMessage: {
    color: '#8792a8',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  errorTitle: {
    color: '#ff9c9c',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorMessage: {
    color: '#c1cad8',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
    textAlign: 'center',
  },
  retryButton: {
    color: '#7de0be',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 20,
    padding: 10,
  },
  inlineError: {
    backgroundColor: '#341d26',
    borderColor: '#61313b',
    borderWidth: 1,
    borderRadius: 10,
    padding: 11,
    gap: 7,
  },
  inlineErrorText: {
    color: '#ffb2b2',
    fontSize: 11,
    lineHeight: 16,
  },
  inlineRetry: {
    color: '#ffd0ca',
    fontSize: 11,
    fontWeight: '700',
  },
});