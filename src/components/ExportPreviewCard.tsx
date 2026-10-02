import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  stats: {
    trades: number;
    wins: number;
    losses: number;
    be: number;
    total: number;
    winRate: number;
    profitFactor: number;
    expectancy: number;
    avgWin: number;
    avgLoss: number;
    maxDrawdown: number;
  };
};

export const ExportPreviewCard = forwardRef<View, Props>(
  ({ stats }, ref) => {
    const isPositive = stats.total >= 0;
    const wlRatio = stats.losses > 0 ? stats.wins / stats.losses : 0;

    return (
      <View
        ref={ref}
        collapsable={false}
        style={styles.card}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>NAVASAN</Text>
            <Text style={styles.brandSub}>Trading Journal Report</Text>
          </View>
          <View style={styles.logo}>
            <Text style={styles.logoText}>N</Text>
          </View>
        </View>

        {/* Main P&L */}
        <View style={styles.mainCard}>
          <Text style={styles.mainLabel}>سود / زیان کل</Text>
          <Text
            style={[
              styles.mainValue,
              { color: isPositive ? '#16A34A' : '#DC2626' },
            ]}
          >
            {isPositive ? '+' : '-'}$
            {Math.abs(stats.total).toFixed(2)}
          </Text>
        </View>

        {/* Stats grid */}
        <View style={styles.grid}>
          <StatBox
            label="تعداد معاملات"
            value={String(stats.trades)}
            color="#2563EB"
          />
          <StatBox
            label="Win Rate"
            value={`${stats.winRate.toFixed(1)}%`}
            color="#16A34A"
          />
          <StatBox
            label="Profit Factor"
            value={stats.profitFactor ? stats.profitFactor.toFixed(2) : '—'}
            color="#7C3AED"
          />
          <StatBox
            label="امید ریاضی"
            value={`${stats.expectancy >= 0 ? '+' : ''}$${stats.expectancy.toFixed(2)}`}
            color={stats.expectancy >= 0 ? '#16A34A' : '#DC2626'}
          />
        </View>

        {/* Win / Loss / BE */}
        <View style={styles.row}>
          <MiniBox label="برد" value={String(stats.wins)} color="#16A34A" />
          <MiniBox label="باخت" value={String(stats.losses)} color="#DC2626" />
          <MiniBox label="BE" value={String(stats.be)} color="#64748B" />
        </View>

        {/* Averages */}
        <View style={styles.row}>
          <WideBox
            label="میانگین برد"
            value={`+$${stats.avgWin.toFixed(2)}`}
            color="#16A34A"
          />
          <WideBox
            label="میانگین باخت"
            value={`-$${stats.avgLoss.toFixed(2)}`}
            color="#DC2626"
          />
        </View>

        {/* Drawdown & Ratio */}
        <View style={styles.row}>
          <WideBox
            label="حداکثر افت سرمایه"
            value={`${stats.maxDrawdown.toFixed(1)}%`}
            color="#DC2626"
          />
          <WideBox
            label="Win/Loss Ratio"
            value={wlRatio > 0 ? wlRatio.toFixed(2) : '—'}
            color="#2563EB"
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            NAVASAN • Trading Journal & Analysis
          </Text>
          <Text style={styles.footerDate}>
            {new Date().toLocaleDateString('fa-IR')}
          </Text>
        </View>
      </View>
    );
  },
);

function StatBox({ label, value, color }: any) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

function MiniBox({ label, value, color }: any) {
  return (
    <View style={styles.miniBox}>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={[styles.miniValue, { color }]}>{value}</Text>
    </View>
  );
}

function WideBox({ label, value, color }: any) {
  return (
    <View style={styles.wideBox}>
      <Text style={styles.wideLabel}>{label}</Text>
      <Text style={[styles.wideValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 900,
    backgroundColor: '#FFFFFF',
    padding: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 3,
    borderBottomColor: '#2563EB',
  },
  brand: {
    fontSize: 42,
    fontWeight: '900',
    color: '#2563EB',
    letterSpacing: 3,
  },
  brandSub: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 6,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '900',
  },
  mainCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mainLabel: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: '700',
    marginBottom: 8,
  },
  mainValue: {
    fontSize: 60,
    fontWeight: '900',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  statBox: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'flex-end',
  },
  statLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '700',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '900',
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  miniBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  miniLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '700',
  },
  miniValue: {
    fontSize: 32,
    fontWeight: '900',
    marginTop: 8,
  },
  wideBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'flex-end',
  },
  wideLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '700',
  },
  wideValue: {
    fontSize: 26,
    fontWeight: '900',
    marginTop: 8,
  },
  footer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '700',
  },
  footerDate: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '700',
  },
});