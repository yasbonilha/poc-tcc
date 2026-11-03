import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

type TrainingMetric = {
  epoch: number;
  totalLoss: number;
  dataLoss: number;
  physicsLoss: number;
  validationLoss: number;
};

type Series = {
  key: keyof Pick<
    TrainingMetric,
    'totalLoss' | 'dataLoss' | 'physicsLoss' | 'validationLoss'
  >;
  label: string;
  color: string;
};

const chartWidth = 320;
const chartHeight = 156;
const chartPadding = 12;

const series: Series[] = [
  { key: 'totalLoss', label: 'Total', color: '#75dfbd' },
  { key: 'dataLoss', label: 'Dados', color: '#72a9ff' },
  { key: 'physicsLoss', label: 'Física', color: '#c19aff' },
  { key: 'validationLoss', label: 'Validação', color: '#ffbd70' },
];

type TrainingChartProps = {
  metrics: TrainingMetric[];
};

export function TrainingChart({ metrics }: TrainingChartProps) {
  const recentMetrics = metrics.slice(-30);
  const allValues = recentMetrics.flatMap((metric) =>
    series.map(({ key }) => metric[key]),
  );
  const minValue = allValues.length ? Math.min(...allValues) : 0;
  const maxValue = allValues.length ? Math.max(...allValues) : 1;
  const valueRange = maxValue - minValue || 1;
  const plotHeight = chartHeight - chartPadding * 2;
  const plotWidth = chartWidth - chartPadding * 2;

  const getX = (index: number) =>
    chartPadding +
    (recentMetrics.length <= 1
      ? plotWidth
      : (index / (recentMetrics.length - 1)) * plotWidth);
  const getY = (value: number) =>
    chartPadding + ((maxValue - value) / valueRange) * plotHeight;

  return (
    <View>
      <Svg
        accessibilityLabel="Gráfico de linhas com histórico das métricas de treino"
        height={chartHeight}
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        width="100%"
      >
        {[0, 0.5, 1].map((position) => {
          const y = chartPadding + position * plotHeight;
          return (
            <Line
              key={position}
              stroke="#263247"
              strokeDasharray="3 5"
              strokeWidth={1}
              x1={chartPadding}
              x2={chartWidth - chartPadding}
              y1={y}
              y2={y}
            />
          );
        })}
        {series.map(({ key, color }) => {
          const points = recentMetrics.map(
            (metric, index) => `${getX(index)},${getY(metric[key])}`,
          );
          const path = points.length ? `M ${points.join(' L ')}` : '';

          return path ? (
            <Path
              key={key}
              d={path}
              fill="none"
              stroke={color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
            />
          ) : null;
        })}
        {series.map(({ key, color }) => {
          const lastMetric = recentMetrics[recentMetrics.length - 1];
          return lastMetric ? (
            <Circle
              key={key}
              cx={getX(recentMetrics.length - 1)}
              cy={getY(lastMetric[key])}
              fill={color}
              r={3.5}
            />
          ) : null;
        })}
      </Svg>

      <View style={styles.legend}>
        {series.map(({ key, label, color }) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendLabel}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: 18,
    rowGap: 8,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  legendLabel: {
    color: '#9aa5b7',
    fontSize: 10,
  },
});
