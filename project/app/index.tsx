import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Clock,
  LogIn,
  LogOut,
  ChevronDown,
  CheckCircle2,
  CloudUpload,
  Briefcase,
  Flag,
  Timer,
  TrendingUp,
} from 'lucide-react-native';

const GOOGLE_WEB_APP_URL = 'https://docs.google.com/spreadsheets/d/10-apxCXB-XzkJQQfaxKGyqcaW1EFFOvI4cn9q2cBxQ0/edit?gid=2115707405#gid=2115707405';


const PROJECTS = [
  'Atlas Mobile Redesign',
  'Orion Payment Gateway',
  'Helios CRM Integration',
  'Nimbus Cloud Migration',
  'Vega Analytics Dashboard',
  'Lyra Marketing Automation',
];

const MILESTONE_STAGES = [
  'Planning',
  'Design',
  'Development',
  'Testing',
  'Review',
  'Deployment',
];

const ACCENT = '#10b981';
const DANGER = '#ef4444';

function triggerHaptic() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
}

export default function AttendanceScreen() {
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<Date | null>(null);
  const [now, setNow] = useState(new Date());
  const [elapsed, setElapsed] = useState(0);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;

  const [project, setProject] = useState(PROJECTS[0]);
  const [projectOpen, setProjectOpen] = useState(false);
  const [milestone, setMilestone] = useState(MILESTONE_STAGES[0]);
  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [hours, setHours] = useState('');
  const [progress, setProgress] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!checkedIn || !checkInTime) {
      setElapsed(0);
      return;
    }
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - checkInTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [checkedIn, checkInTime]);

  const handleToggle = useCallback(() => {
    triggerHaptic();
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 110,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(ringAnim, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
    ).start();

    if (!checkedIn) {
      const t = new Date();
      setCheckInTime(t);
      setCheckOutTime(null);
      setCheckedIn(true);
    } else {
      const t = new Date();
      setCheckOutTime(t);
      setCheckedIn(false);
    }
  }, [checkedIn, scaleAnim, ringAnim]);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const formatDate = (d: Date) =>
    d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  const formatElapsed = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const ringOpacity = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0],
  });
  const ringScale = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.35],
  });

  const handleSubmit = async () => {
    setSubmitMessage(null);
    setSubmitError(null);

    const hoursNum = parseFloat(hours);
    const progressNum = parseFloat(progress);

    if (!project) {
      setSubmitError('Please choose a project.');
      return;
    }
    if (!milestone) {
      setSubmitError('Please choose a milestone stage.');
      return;
    }
    if (isNaN(hoursNum) || hoursNum <= 0 || hoursNum > 24) {
      setSubmitError('Enter a valid number of hours (0.1 to 24).');
      return;
    }
    if (isNaN(progressNum) || progressNum < 0 || progressNum > 100) {
      setSubmitError('Enter progress as a number between 0 and 100.');
      return;
    }

    setSubmitting(true);

    const payload = {
      action: 'submit_task',
      project,
      milestone,
      hours: hoursNum,
      progress: progressNum,
      checkedInAt: checkInTime ? checkInTime.toISOString() : null,
      checkedOutAt: checkOutTime ? checkOutTime.toISOString() : null,
      submittedAt: new Date().toISOString(),
    };

    try {
      const res = await fetch(GOOGLE_WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
      setSubmitMessage('Task submitted successfully.');
      setHours('');
      setProgress('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      setSubmitError(`Could not submit task. ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const renderDropdown = (
    label: string,
    value: string,
    options: string[],
    open: boolean,
    setOpen: (v: boolean) => void,
    onSelect: (v: string) => void,
    icon: React.ReactNode,
  ) => (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        style={[styles.dropdown, open && styles.dropdownOpen]}
        onPress={() => {
          triggerHaptic();
          setOpen(!open);
        }}>
        <View style={styles.dropdownInner}>
          {icon}
          <Text style={styles.dropdownText} numberOfLines={1}>
            {value}
          </Text>
        </View>
        <ChevronDown
          size={20}
          color="#94a3b8"
          strokeWidth={2}
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
        />
      </Pressable>
      {open && (
        <View style={styles.dropdownList}>
          {options.map((opt) => (
            <Pressable
              key={opt}
              style={({ pressed }) => [
                styles.dropdownItem,
                opt === value && styles.dropdownItemActive,
                pressed && styles.dropdownItemPressed,
              ]}
              onPress={() => {
                triggerHaptic();
                onSelect(opt);
                setOpen(false);
              }}>
              <Text
                style={[styles.dropdownItemText, opt === value && styles.dropdownItemTextActive]}>
                {opt}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b', '#0f172a']}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.greeting}>Attendance</Text>
            <Text style={styles.dateLabel}>{formatDate(now)}</Text>
            <Text style={styles.clockText}>{formatTime(now)}</Text>
          </View>

          <View style={styles.buttonSection}>
            <View style={styles.ringContainer}>
              {checkedIn && (
                <Animated.View
                  style={[
                    styles.pulseRing,
                    {
                      borderColor: DANGER,
                      opacity: ringOpacity,
                      transform: [{ scale: ringScale }],
                    },
                  ]}
                />
              )}
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <Pressable onPress={handleToggle}>
                  <LinearGradient
                    colors={checkedIn ? ['#ef4444', '#dc2626', '#b91c1c'] : ['#10b981', '#059669', '#047857']}
                    style={styles.bigButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}>
                    {checkedIn ? (
                      <LogOut size={46} color="#fff" strokeWidth={2.4} />
                    ) : (
                      <LogIn size={46} color="#fff" strokeWidth={2.4} />
                    )}
                    <Text style={styles.bigButtonText}>
                      {checkedIn ? 'CHECK OUT' : 'CHECK IN'}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            </View>

            <View style={styles.statusRow}>
              <View style={styles.statusPill}>
                <Clock size={14} color={ACCENT} strokeWidth={2.2} />
                <Text style={styles.statusPillLabel}>In</Text>
                <Text style={styles.statusPillValue}>
                  {checkInTime ? formatTime(checkInTime) : '--:--:--'}
                </Text>
              </View>
              {checkedIn ? (
                <View style={[styles.statusPill, styles.statusPillActive]}>
                  <Timer size={14} color="#fff" strokeWidth={2.2} />
                  <Text style={styles.statusPillLabelActive}>Active</Text>
                  <Text style={styles.statusPillValueActive}>{formatElapsed(elapsed)}</Text>
                </View>
              ) : (
                <View style={[styles.statusPill, styles.statusPillDanger]}>
                  <LogOut size={14} color="#fff" strokeWidth={2.2} />
                  <Text style={styles.statusPillLabelActive}>Out</Text>
                  <Text style={styles.statusPillValueActive}>
                    {checkOutTime ? formatTime(checkOutTime) : '--:--:--'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.taskCard}>
            <View style={styles.taskCardHeader}>
              <View>
                <Text style={styles.taskTitle}>Daily Task Report</Text>
                <Text style={styles.taskSubtitle}>Log your work for today</Text>
              </View>
              <View style={styles.taskBadge}>
                <TrendingUp size={16} color={ACCENT} strokeWidth={2.2} />
              </View>
            </View>

            {renderDropdown(
              'Project Name',
              project,
              PROJECTS,
              projectOpen,
              setProjectOpen,
              setProject,
              <Briefcase size={18} color="#94a3b8" strokeWidth={2} />,
            )}

            {renderDropdown(
              'Milestone Stage',
              milestone,
              MILESTONE_STAGES,
              milestoneOpen,
              setMilestoneOpen,
              setMilestone,
              <Flag size={18} color="#94a3b8" strokeWidth={2} />,
            )}

            <View style={styles.rowFields}>
              <View style={[styles.field, styles.fieldHalf]}>
                <Text style={styles.fieldLabel}>Hours Spent</Text>
                <View style={styles.textInputWrap}>
                  <Timer size={18} color="#94a3b8" strokeWidth={2} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. 4.5"
                    placeholderTextColor="#64748b"
                    keyboardType="decimal-pad"
                    value={hours}
                    onChangeText={setHours}
                  />
                </View>
              </View>
              <View style={[styles.field, styles.fieldHalf]}>
                <Text style={styles.fieldLabel}>Progress %</Text>
                <View style={styles.textInputWrap}>
                  <TrendingUp size={18} color="#94a3b8" strokeWidth={2} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. 75"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    value={progress}
                    onChangeText={setProgress}
                  />
                </View>
              </View>
            </View>

            {submitMessage && (
              <View style={styles.successBanner}>
                <CheckCircle2 size={18} color={ACCENT} strokeWidth={2.2} />
                <Text style={styles.successText}>{submitMessage}</Text>
              </View>
            )}
            {submitError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{submitError}</Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                pressed && styles.submitButtonPressed,
                submitting && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#0f172a" />
              ) : (
                <>
                  <CloudUpload size={20} color="#0f172a" strokeWidth={2.2} />
                  <Text style={styles.submitButtonText}>Submit Task</Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  header: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: '#64748b',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  dateLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 15,
    color: '#cbd5e1',
    marginTop: 6,
  },
  clockText: {
    fontFamily: 'Inter-Bold',
    fontSize: 38,
    color: '#f8fafc',
    marginTop: 4,
    letterSpacing: 1,
  },
  buttonSection: {
    alignItems: 'center',
    marginVertical: 32,
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 260,
    height: 260,
  },
  pulseRing: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    borderWidth: 2.5,
  },
  bigButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  bigButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 19,
    color: '#fff',
    marginTop: 10,
    letterSpacing: 1.5,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(148,163,184,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  statusPillActive: {
    backgroundColor: 'rgba(16,185,129,0.22)',
  },
  statusPillDanger: {
    backgroundColor: 'rgba(239,68,68,0.22)',
  },
  statusPillLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statusPillLabelActive: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statusPillValue: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#e2e8f0',
  },
  statusPillValueActive: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#fff',
  },
  taskCard: {
    backgroundColor: 'rgba(30,41,59,0.7)',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
  },
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 22,
  },
  taskTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#f8fafc',
  },
  taskSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  taskBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16,185,129,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    marginBottom: 18,
    zIndex: 10,
  },
  fieldHalf: {
    flex: 1,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 14,
  },
  fieldLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 8,
    marginLeft: 2,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  dropdownOpen: {
    borderColor: 'rgba(16,185,129,0.5)',
  },
  dropdownInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dropdownText: {
    fontFamily: 'Inter-Medium',
    fontSize: 15,
    color: '#e2e8f0',
  },
  dropdownList: {
    marginTop: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
    borderRadius: 14,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(16,185,129,0.12)',
  },
  dropdownItemPressed: {
    backgroundColor: 'rgba(148,163,184,0.1)',
  },
  dropdownItemText: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: '#cbd5e1',
  },
  dropdownItemTextActive: {
    color: ACCENT,
    fontFamily: 'Inter-Medium',
  },
  textInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  textInput: {
    flex: 1,
    fontFamily: 'Inter-Medium',
    fontSize: 15,
    color: '#e2e8f0',
    padding: 0,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: ACCENT,
    borderRadius: 16,
    paddingVertical: 17,
    marginTop: 8,
  },
  submitButtonPressed: {
    opacity: 0.88,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(16,185,129,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  successText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: ACCENT,
  },
  errorBanner: {
    backgroundColor: 'rgba(239,68,68,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  errorText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: DANGER,
  },
});
